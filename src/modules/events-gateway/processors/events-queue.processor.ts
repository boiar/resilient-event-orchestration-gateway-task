import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload, EventPattern } from '@nestjs/microservices';
import { ReceiveEventDto } from '../dtos/receive-event.dto';
import { EventsGatewayService } from '../services/implemention/events-gateway.service';

@Controller()
export class EventsProcessor {
    private readonly logger = new Logger(EventsProcessor.name);

    constructor(private readonly eventsGatewayService: EventsGatewayService) {}

    @EventPattern('process-event')
    async handleEvent(@Payload() dto: ReceiveEventDto): Promise<void> {
        this.logger.log(`Processing event: ${dto.eventId}`);
        await this.eventsGatewayService.processQueuedEvent(dto);
    }
}