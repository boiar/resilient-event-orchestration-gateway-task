import { Provider } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from "../constants/redis.constants";

export const RedisProvider: Provider = {
    provide: REDIS_CLIENT,
    useFactory: () => {
        const redisClient = new Redis({
            host: process.env.REDIS_HOST || 'redis',
            port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
            password: process.env.REDIS_PASSWORD || 'redis_pass',
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