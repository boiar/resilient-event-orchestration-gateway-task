import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { EventsGatewayController } from './controllers/api/v1/events-gateway.controller';
import { EventsGatewayService } from './services/implementation/events-gateway.service';
import { SharedModule } from "../shared/shared.module";
import { HmacMiddleware } from "./middlewares/hmac.middleware";
import { EventsProcessor } from "./processors/events-queue.processor";
import { HttpModule } from "@nestjs/axios";
import { BullModule } from '@nestjs/bullmq';
import { EVENT_REPOSITORY, EVENTS_GATEWAY_SERVICE, SHIPMENT_REPOSITORY } from "./constants/event.constants";
import { EventRepositoryMongo } from "./repositories/implementation/event.repository.mongo";
import { ShipmentRepositoryMongo } from "./repositories/implementation/shipment.repository.mongo";
import { MongooseModule } from "@nestjs/mongoose";
import { EventEntity, EventSchema } from "./entities/event.entity";
import { ShipmentEntity, ShipmentSchema } from "./entities/shipment.entity";
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
    imports: [
        BullModule.registerQueue({
            name: 'events-processing',
            defaultJobOptions: {
                attempts: 3,  // retry 3 times
                backoff: {
                    type: 'exponential',
                    delay: 1000, // 1s -> 2s -> 4s
                },
                removeOnComplete: true, // clean up successful jobs
                removeOnFail: false, // keep failed jobs for inspection
            },
        }),
        MongooseModule.forFeature([
            { name: EventEntity.name, schema: EventSchema },
            { name: ShipmentEntity.name, schema: ShipmentSchema }
        ]),
        HttpModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (config: ConfigService) => ({
                timeout: 10000,
                baseURL: config.get<string>('app.routingServiceUrl'),
            }),
        }),
        SharedModule,
    ],
    controllers: [EventsGatewayController],
    providers: [
        EventsGatewayService,
        EventsProcessor,
        {
            provide: EVENT_REPOSITORY,
            useClass: EventRepositoryMongo,
        },
        {
            provide: SHIPMENT_REPOSITORY,
            useClass: ShipmentRepositoryMongo,
        },
        {
            provide: EVENTS_GATEWAY_SERVICE,
            useClass: EventsGatewayService
        }
    ]
})
export class EventsGatewayModule implements NestModule {
    configure(consumer: MiddlewareConsumer): any {
        consumer
            .apply(HmacMiddleware)
            .forRoutes(EventsGatewayController)
    }
}
