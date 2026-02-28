import { Module, Global } from '@nestjs/common';
import { RedisModule } from "./redis/redis.module";


@Global()
@Module({
    imports: [RedisModule],
    controllers: [],
    exports: [RedisModule],
})
export class SharedModule {
}