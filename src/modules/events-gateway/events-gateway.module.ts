import {MiddlewareConsumer, Module, NestModule} from '@nestjs/common';
import {EventsGatewayController} from './controllers/api/v1/events-gateway.controller';
import {EventsGatewayService} from './services/implemention/events-gateway.service';
import {BullModule} from "@nestjs/bull";
import {IdempotencyService} from "../shared/redis/services/idempotency.service";
import {RedisProvider} from "../shared/redis/providers/redis.provider";
import {SharedModule} from "../shared/shared.module";
import {HmacMiddleware} from "./middlewares/hmac.middleware";
import {EventsQueueHandlerService} from "./services/events-queue-handler.service";
import {EventsProcessor} from "./processors/events-queue.processor";
import {EVENT_REPOSITORY, EVENTS_GATEWAY_SERVICE} from "./constants/event.constants";
import {EventRepositoryMongo} from "./repositories/implemention/event.repository.mongo";
import {MongooseModule} from "@nestjs/mongoose";
import {EventEntity, EventSchema} from "./entities/event.entity";

@Module({
    imports: [
        BullModule.registerQueue({
            name: 'events'
        }),
        SharedModule,
        MongooseModule.forFeature([
            {name: EventEntity.name, schema: EventSchema}
        ]),
    ],
    controllers: [EventsGatewayController],
    providers: [
        EventsGatewayService,
        EventsQueueHandlerService,
        EventsProcessor,
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
