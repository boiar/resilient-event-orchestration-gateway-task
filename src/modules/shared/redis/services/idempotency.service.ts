import {Inject, Injectable} from '@nestjs/common';
import {ReceiveEventDto} from "../../../events-gateway/dtos/receive-event.dto";
import Redis from "ioredis";

@Injectable()
export class IdempotencyService {
    constructor(@Inject('REDIS_CLIENT') private readonly redis: Redis) {}

    async acquireLock(eventId: string): Promise<boolean> {
        const key = `event:lock:${eventId}`;

        const result = await this.redis.set(key, 'processing', {
            NX: true,
            EX: 60,   // sec
        } as any);

        return result === 'OK';
    }

    async releaseLock(eventId: string) {
        const key = `event:lock:${eventId}`;
        await this.redis.del(key);
    }
}
