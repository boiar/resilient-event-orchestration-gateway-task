import {Body, Controller, Get, Post} from '@nestjs/common';
import {EventsGatewayService} from "../../../services/events-gateway.service";
import {ReceiveEventDto} from "../../../dtos/receive-event.dto";
import {ApiOperation, ApiResponse} from "@nestjs/swagger";

@Controller({
    path: 'events-gateway',
    version: '1'
})
export class EventsGatewayController {

    constructor(private readonly eventGatewayService: EventsGatewayService) {}


    @Post()
    @ApiOperation({ summary: 'Ingest a new event' })
    @ApiResponse({ status: 202, description: 'Event accepted' })
    @ApiResponse({ status: 409, description: 'Duplicate event' })
    async ReceiveEvent(@Body() dto: ReceiveEventDto){
        return await this.eventGatewayService.eventsEnqueue(dto)
    }


}
