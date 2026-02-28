import {Module} from "@nestjs/common";
import {RoutingServiceController} from "./controllers/routing-service.controller";

@Module({
    controllers: [RoutingServiceController],
})

export class RoutingServiceModule {
}