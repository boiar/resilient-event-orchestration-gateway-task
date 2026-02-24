import {Processor,Process} from "@nestjs/bull";
import {EventsQueueHandlerService} from "../services/events-queue-handler.service";
import {Job} from "bull";
import {ReceiveEventDto} from "../dtos/receive-event.dto";

@Processor('events')
export class EventsProcessor {

    constructor(private readonly eventsHandler: EventsQueueHandlerService) {}

    @Process('process-event')
    async handleEvent(job: Job<ReceiveEventDto>): Promise<void> {
        await this.eventsHandler.handleEvent(job.data);
    }
}