import { Inject, Injectable, Logger } from '@nestjs/common';
import Redis from "ioredis";
import * as crypto from "crypto";
import { IIdempotencyService } from "../idempotency-service.interface";
import { REDIS_CLIENT } from "../../constants/redis.constants";


@Injectable()
export class IdempotencyService implements IIdempotencyService {
    private readonly logger = new Logger(IdempotencyService.name);
    constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {
    }

    
    async acquireLock(eventId: string, shipmentId: string): Promise<string | null> {
        const key = `event:lock:${eventId}:${shipmentId}`;
        const token = crypto.randomUUID();

        const result = await this.redis.set(
            key,
            token,
            'EX',
            60,
            'NX'
        );
        return result === 'OK' ? token : null;
    }

    
    async releaseLock(eventId: string, shipmentId: string, token: string) {
        const key = `event:lock:${eventId}:${shipmentId}`;

        const script = `
            if redis.call("get", KEYS[1]) == ARGV[1] then
                return redis.call("del", KEYS[1])
            else
                return 0
            end
        `;

        await this.redis.eval(script, 1, key, token);
    }
}
