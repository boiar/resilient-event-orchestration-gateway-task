import { Module, Global } from '@nestjs/common';
import { RedisProvider } from './redis/providers/redis.provider';
import { IdempotencyService } from './redis/services/idempotency.service';

@Global() // so any module can use it without importing
@Module({
    providers: [RedisProvider, IdempotencyService],
    exports: [RedisProvider, IdempotencyService],
})
export class SharedModule {}