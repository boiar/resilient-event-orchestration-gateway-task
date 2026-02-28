import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { EventsGatewayService } from "../../../services/implementation/events-gateway.service";
import { ReceiveEventDto } from "../../../dtos/receive-event.dto";
import { ApiHeader, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { ReceiveEventResponse } from "../../../responses/receive-event.response";

@ApiTags('Events Gateway')
@Controller({
    path: 'events-gateway',
    version: '1'
})
export class EventsGatewayController {

    constructor(private readonly eventGatewayService: EventsGatewayService) {
    }


    @Post()
    @HttpCode(202)
    @ApiOperation({ summary: 'Ingest a new event' })
    @ApiHeader({
        name: 'x-signature',
        description: 'HMAC signature for payload authenticity validation',
        required: true,
        example: 'a9f5d1c3b2e6f7...',
    })
    @ApiResponse({ status: 202, description: 'Event accepted', type: ReceiveEventResponse })
    async ReceiveEvent(@Body() dto: ReceiveEventDto): Promise<ReceiveEventResponse> {
        return this.eventGatewayService.eventsEnqueue(dto);
    }


}
