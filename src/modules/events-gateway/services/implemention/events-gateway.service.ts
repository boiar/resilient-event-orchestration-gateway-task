import {Inject, Injectable, Logger} from '@nestjs/common';
import {ReceiveEventDto} from "../../dtos/receive-event.dto";
import {IdempotencyService} from "../../../shared/redis/services/idempotency.service";
import {InjectQueue} from "@nestjs/bull";
import {Queue} from "bull";
import {EventMapper} from "../../mappers/event.mapper";
import {EVENT_REPOSITORY} from '../../constants/event.constants';
import {IEventRepository} from "../../repositories/event-repo.interface";
import {EventStatusEnum} from "../../enums/event-status.enum";
import {IEventsGatewayService} from "../events-gateway-service.interface";


@Injectable()
export class EventsGatewayService implements IEventsGatewayService {

    private readonly logger = new Logger(EventsGatewayService.name);

    constructor(
        private readonly idempotency: IdempotencyService,
        @Inject(EVENT_REPOSITORY) private readonly eventRepo: IEventRepository,
        @InjectQueue('events') private readonly queue: Queue,
    ) {
    }

    async eventsEnqueue(dto: ReceiveEventDto) {
        const lockAcquired = await this.idempotency.acquireLock(dto.eventId);
        if (!lockAcquired) {
            return {status: 'duplicate'};
        }

        const eventData = EventMapper.fromDtoToEntity(dto);
        const event = await this.eventRepo.save(eventData);


        await this.queue.add('process-event', dto, {
            attempts: 5,
            backoff: {type: 'exponential', delay: 1000},
        });

        return {
            status: 'accepted',
        };

    }

    async processQueuedEvent(dto: ReceiveEventDto): Promise<void> {
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
