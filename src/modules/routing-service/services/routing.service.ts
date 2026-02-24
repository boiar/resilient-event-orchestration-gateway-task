import { Injectable } from '@nestjs/common';

@Injectable()
export class RoutingService {
    async routeEvent(event: any) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        return { routed: true, routeId: 'R123' };
    }
}