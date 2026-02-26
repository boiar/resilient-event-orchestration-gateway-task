import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { EventsGatewayController } from './controllers/api/v1/events-gateway.controller';
import { EventsGatewayService } from './services/implemention/events-gateway.service';
import { SharedModule } from "../shared/shared.module";
import { HmacMiddleware } from "./middlewares/hmac.middleware";
import { EventsProcessor } from "./processors/events-queue.processor";
import { EVENT_REPOSITORY, EVENTS_GATEWAY_SERVICE, EVENTS_QUEUE_CLIENT } from "./constants/event.constants";
import { EventRepositoryMongo } from "./repositories/implemention/event.repository.mongo";
import { MongooseModule } from "@nestjs/mongoose";
import { EventEntity, EventSchema } from "./entities/event.entity";
import { ClientsModule, Transport } from "@nestjs/microservices";

@Module({
    imports: [
        ClientsModule.register([
            {
                name: EVENTS_QUEUE_CLIENT,
                transport: Transport.RMQ,
                options: {
                    urls: [process.env.RABBITMQ_URL || 'amqp://fincart:fincart_pass@rabbitmq:5672'],
                    queue: 'events',
                    queueOptions: { durable: true },
                    socketOptions: {
                        heartbeatIntervalInSeconds: 60,
                        reconnectTimeInSeconds: 5,
                    },
                    noAck: true,
                    persistent: true,
                },
            },
        ]),
        SharedModule,
        MongooseModule.forFeature([
            { name: EventEntity.name, schema: EventSchema }
        ]),
    ],
    controllers: [EventsGatewayController, EventsProcessor],
    providers: [
        EventsGatewayService,
        {
            provide: EVENT_REPOSITORY,
            useClass: EventRepositoryMongo,
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
