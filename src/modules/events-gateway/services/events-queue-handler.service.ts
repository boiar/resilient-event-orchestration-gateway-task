import {Inject, Injectable, Logger} from "@nestjs/common";
import {IEventRepository} from "../interfaces/event-repo.interface";
import {ReceiveEventDto} from "../dtos/receive-event.dto";
import {EventStatusEnum} from "../enums/event-status.enum";
import {EVENT_REPOSITORY} from "../constants/event.constants";

@Injectable()
export class EventsQueueHandlerService {

    private readonly logger = new Logger(EventsQueueHandlerService.name);

    constructor(@Inject(EVENT_REPOSITORY) private readonly eventRepo: IEventRepository) {}

    async handleEvent(dto: ReceiveEventDto): Promise<void> {
        try {
            await this.processEventByType(dto);
            await this.eventRepo.updateStatus(dto.eventId, EventStatusEnum.PROCESSED);
        } catch (error) {
            this.logger.error(`Failed to process event: ${dto.eventId}`, error);
            await this.eventRepo.updateStatus(dto.eventId, EventStatusEnum.FAILED);
            throw error;
        }
    }

    private async processEventByType(dto: ReceiveEventDto): Promise<void> {
        const eventType = dto.type;
        /* TODO create logic based on event */
    }
}
