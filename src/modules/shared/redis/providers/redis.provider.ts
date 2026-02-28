import { Provider } from '@nestjs/common';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';
import { REDIS_CLIENT } from "../constants/redis.constants";

export const RedisProvider: Provider = {
    provide: REDIS_CLIENT,
    inject: [ConfigService],
    useFactory: (config: ConfigService) => {
        const redisSettings = config.get('redis');

        const redisClient = new Redis({
            host: redisSettings.host,
            port: redisSettings.port,
            password: redisSettings.password,
            enableOfflineQueue: true,  // Queue commands when disconnected (important for startup)
            maxRetriesPerRequest: 3,
            connectTimeout: 3000,
            commandTimeout: 500,
            keepAlive: 10000,
            family: 4,
            lazyConnect: false,  // Connect eagerly at startup
            enableReadyCheck: true,
        });

        redisClient.on('error', (err) => {
            console.error('[Redis Error]', err.message);
        });

        redisClient.on('connect', () => {
            console.log('[Redis] Connected successfully');
        });

        return redisClient;
    },
};