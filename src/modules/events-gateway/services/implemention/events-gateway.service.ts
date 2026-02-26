import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ReceiveEventDto } from "../../dtos/receive-event.dto";
import { IdempotencyService } from "../../../shared/redis/services/implemetion/idempotency.service";
import { EventMapper } from "../../mappers/event.mapper";
import { EVENT_REPOSITORY, EVENTS_QUEUE_CLIENT } from '../../constants/event.constants';
import { IEventRepository } from "../../repositories/event-repo.interface";
import { EventStatusEnum } from "../../enums/event-status.enum";
import { IEventsGatewayService } from "../events-gateway-service.interface";
import { ClientProxy } from "@nestjs/microservices";
import { timeout, catchError, EMPTY } from "rxjs";


@Injectable()
export class EventsGatewayService implements IEventsGatewayService, OnModuleInit {
    private readonly logger = new Logger(EventsGatewayService.name);

    constructor(
        private readonly idempotency: IdempotencyService,
        @Inject(EVENT_REPOSITORY) private readonly eventRepo: IEventRepository,
        @Inject(EVENTS_QUEUE_CLIENT) private readonly queueClient: ClientProxy
    ) {
    }

    async onModuleInit() {
        try {
            await this.queueClient.connect();
            this.logger.log('Queue client connected and ready');
        } catch (err) {
            this.logger.error('Failed to connect queue client', err);
        }
    }

    async eventsEnqueue(dto: ReceiveEventDto) {


        this.queueClient.emit('process-event', dto).pipe(
            timeout(5000),
            catchError((err) => {
                this.logger.error(`Queue emit failed: ${dto.eventId}`, err.message);
                return EMPTY;
            }),
        ).subscribe();

        return {
            status: 'accepted',
        };
    }

    async processQueuedEvent(dto: ReceiveEventDto): Promise<void> {
        try {
            const lockAcquired = await this.idempotency.acquireLock(dto.eventId, dto.shipmentId);
            if (!lockAcquired) {
                return;
            }

            // save event in db
            this.eventRepo.save(EventMapper.fromDtoToEntity(dto))
                .catch(err => this.logger.error(`Failed to persist event ${dto.eventId}`, err));

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
