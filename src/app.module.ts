import { Module } from "@nestjs/common";
import { EventsGatewayModule } from './modules/events-gateway/events-gateway.module';
import { ConfigModule, ConfigService } from "@nestjs/config";
import appConfig from "./config/app.config";
import redisConfig from "./config/redis.config";
import mongoConfig from "./config/mongo.config";
import queueConfig from "./config/queue.config";
import { MongooseModule } from "@nestjs/mongoose";
import { RoutingServiceModule } from "./modules/routing-service/routing-service.module";

import { BullModule } from '@nestjs/bullmq';
import {AppController} from "./app.controller";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, redisConfig, mongoConfig, queueConfig],
      cache: true,
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('mongo.uri'),
        // Connection pool optimization
        maxPoolSize: 20,
        minPoolSize: 5,
        socketTimeoutMS: 5000,
        connectTimeoutMS: 5000,
        serverSelectionTimeoutMS: 5000,
        writeConcern: { w: 1 },
        readPreference: 'primaryPreferred',
        bufferCommands: true,
        autoIndex: config.get('app.nodeEnv') !== 'production', // Auto-index only in dev
      }),
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('redis.host'),
          port: config.get<number>('redis.port'),
          password: config.get<string>('redis.password'),
        },
      }),
    }),
    EventsGatewayModule,
    RoutingServiceModule

  ],
  controllers: [AppController],
  providers: []
})
export class AppModule { }
