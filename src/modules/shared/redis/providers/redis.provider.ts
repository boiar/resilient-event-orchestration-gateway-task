import { Provider } from '@nestjs/common';
import Redis from 'ioredis';

export const RedisProvider: Provider = {
    provide: 'REDIS_CLIENT',
    useFactory: () => {
        const redisClient = new Redis({
            host: process.env.REDIS_HOST || 'redis', // Docker service name
            port: parseInt(process.env.REDIS_PORT) || 6379,
            password: process.env.REDIS_PASSWORD || 'redis_pass',
        });

        // Handle connection events
        redisClient.on('error', (err) => {
            console.error('[Redis Error]', err);
        });

        redisClient.on('connect', () => {
            console.log('[Redis] Connected successfully');
        });

        return redisClient;
    },
};