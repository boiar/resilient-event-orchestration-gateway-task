import {Inject, Injectable, Logger} from '@nestjs/common';
import Redis from "ioredis";
import {IIdempotencyService} from "../idempotency-service.interface";
import {REDIS_CLIENT} from "../../constants/redis.constants";


@Injectable()
export class IdempotencyService implements IIdempotencyService {
    private readonly logger = new Logger(IdempotencyService.name);
    private readonly localCache = new Set<string>();

    constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {
    }

    async acquireLock(eventId: string, shipmentId: string): Promise<boolean> {
        const key = `event:lock:${eventId}:${shipmentId}`;

        if (this.localCache.has(key)) {
            return false;
        }

        const result = await this.redis.set(key, 'processing', 'EX', 60, 'NX');

        if (result === 'OK') {
            this.localCache.add(key);
            setTimeout(() => this.localCache.delete(key), 60_000);
            return true;
        }

        return false;
    }


    async releaseLock(eventId: string, shipmentId: string) {
        const key = `event:lock:${eventId}:${shipmentId}`;
        this.localCache.delete(key);
        await this.redis.del(key);
    }
}
