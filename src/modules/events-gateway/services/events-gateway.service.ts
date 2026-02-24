import {Inject, Injectable} from '@nestjs/common';
import {ReceiveEventDto} from "../dtos/receive-event.dto";
import {IdempotencyService} from "../../../shared/redis/services/idempotency.service";
import {InjectQueue} from "@nestjs/bull";
import {Queue} from "bull";
import {EventMapper} from "../mappers/event.mapper";
import { EVENT_REPOSITORY } from '../constants/event.constants';
import {IEventRepository} from "../interfaces/event-repo.interface";


@Injectable()
export class EventsGatewayService {

    constructor(
        private readonly idempotency: IdempotencyService,
        @Inject(EVENT_REPOSITORY) private readonly eventRepo: IEventRepository,
        @InjectQueue('events') private readonly queue: Queue,
    ){}
    async eventsEnqueue(dto: ReceiveEventDto) {
        const lockAcquired = await this.idempotency.acquireLock(dto.eventId);
        if (!lockAcquired) {
            return { status: 'duplicate' };
        }

        const eventData = EventMapper.fromDtoToEntity(dto);
        const event = await this.eventRepo.save(eventData);


        await this.queue.add('process-event', dto, {
            attempts: 5,
            backoff: { type: 'exponential', delay: 1000 },
        });

        return {
            status: 'accepted',
        };

    }
}
