import {Processor, Process} from "@nestjs/bull";
import {Job} from "bull";
import {ReceiveEventDto} from "../dtos/receive-event.dto";
import {EventsGatewayService} from "../services/implemention/events-gateway.service";

@Processor('events')
export class EventsProcessor {
    constructor(private readonly eventsGatewayService: EventsGatewayService) {
    }

    @Process('process-event')
    async handleEvent(job: Job<ReceiveEventDto>): Promise<void> {
        await this.eventsGatewayService.processQueuedEvent(job.data);
    }
}