import {Module} from "@nestjs/common";
import {IdempotencyService} from "./services/implemetion/idempotency.service";
import {RedisProvider} from "./providers/redis.provider";


@Module({
    imports: [],
    controllers: [],
    providers: [
        RedisProvider,
        IdempotencyService
    ],
    exports: [
        RedisProvider,
        IdempotencyService
    ]
})
export class RedisModule {
}
