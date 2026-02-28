import {Controller, Get, HttpCode, Post} from '@nestjs/common';
import {ApiOperation, ApiResponse} from "@nestjs/swagger";

@Controller({
    path: 'routing-service',
    version: '1'
})
export class RoutingServiceController {

    @Post()
    @HttpCode(200)
    @ApiOperation({ summary: 'Fake routing-service endpoint — simulates 2s processing delay' })
    @ApiResponse({status: 200, description: 'Routing completed'})
    async routingEndpoint() {
        // logic ...
        await new Promise((resolve) => setTimeout(resolve, 2000));
        return {
            routed: true,
            routeId: `RoID-${Date.now()}`,
            processedAt: new Date().toISOString(),
        };
    }

}
