import { Module } from "@nestjs/common";
import { EventsGatewayModule } from './modules/events-gateway/events-gateway.module';
import {ConfigModule, ConfigService} from "@nestjs/config";
import appConfig from "./config/app.config";
import redisConfig from "./config/redis.config";
import mongoConfig from "./config/mongo.config";
import queueConfig from "./config/queue.config";
import {MongooseModule} from "@nestjs/mongoose";

@Module({
  imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        load: [appConfig, redisConfig, mongoConfig, queueConfig]
      }),
      MongooseModule.forRootAsync({
          imports: [ConfigModule],
          inject: [ConfigService],
          useFactory: (config: ConfigService) => ({
              uri: config.get<string>('mongo.uri'),
          }),
      }),
      EventsGatewayModule

  ],
  controllers: [],
  providers: []
})
export class AppModule {}
