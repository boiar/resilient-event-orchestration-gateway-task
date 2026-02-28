import {Inject, Injectable, Logger} from '@nestjs/common';
import {ReceiveEventDto} from "../../dtos/receive-event.dto";
import {IdempotencyService} from "../../../shared/redis/services/implementation/idempotency.service";
import {EventMapper} from "../../mappers/event.mapper";
import {EVENT_REPOSITORY, SHIPMENT_REPOSITORY} from '../../constants/event.constants';
import {IEventRepository} from "../../repositories/event-repo.interface";
import {IShipmentRepository} from "../../repositories/shipment-repo.interface";
import {EventStatusEnum} from "../../enums/event-status.enum";
import {IEventsGatewayService} from "../events-gateway-service.interface";
import {firstValueFrom} from "rxjs";
import {HttpService} from "@nestjs/axios";
import {IRoutingServiceResponse} from "../../responses/routing-service.response";
import {InjectQueue} from '@nestjs/bullmq';
import {Queue} from 'bullmq';
import {ShipmentStatusEnum} from "../../enums/shipment-status.enum";
import {ShipmentEntity} from "../../entities/shipment.entity";
import {ConfigService} from '@nestjs/config';

@Injectable()
export class EventsGatewayService implements IEventsGatewayService {
    private readonly logger = new Logger(EventsGatewayService.name);
    private readonly routingServiceUrl: string;

    constructor(
        private readonly idempotency: IdempotencyService,
        @Inject(EVENT_REPOSITORY) private readonly eventRepo: IEventRepository,
        @Inject(SHIPMENT_REPOSITORY) private readonly shipmentRepo: IShipmentRepository,
        @InjectQueue('events-processing') private readonly queue: Queue,
        private readonly httpService: HttpService,
        private readonly configService: ConfigService,
    ) {
        this.routingServiceUrl = this.configService.get<string>('app.routingServiceUrl') || '';
    }

    async eventsEnqueue(dto: ReceiveEventDto) {
        try {
            await this.queue.add('process-event', dto, {
                jobId: dto.eventId,
            });
            this.logger.log(`Event enqueued: ${dto.eventId}`);
            return {status: 'accepted'};

        } catch (error: any) {
            this.logger.error(`Failed to enqueue event: ${dto.eventId}`, error.message);
            return {status: 'error', message: 'Failed to enqueue event'};
        }
    }

    async processQueuedEvent(dto: ReceiveEventDto): Promise<void> {
        let lockToken: string | null = null;
        let eventSaved = false;
        let processingSucceeded = false;

        try {
            // prevents concurrent duplicate processing
            lockToken = await this.idempotency.acquireLock(dto.eventId, dto.shipmentId);
            if (!lockToken) {
                this.logger.log(`Duplicate event skipped (lock held): ${dto.eventId}`);
                return;
            }

            // db idempotency check
            const existingEvent = await this.eventRepo.findByEventId(dto.eventId);
            if (existingEvent?.status === EventStatusEnum.PROCESSED) {
                this.logger.log(`Event already processed, skipping: ${dto.eventId}`);
                processingSucceeded = true;
                return;
            }

            // event record (only on first attempt)
            if (!existingEvent) {
                await this.eventRepo.save(EventMapper.fromDtoToEntity(dto));
            }
            eventSaved = true;

            const shipment = await this.resolveShipment(dto);

            if (shipment.status !== ShipmentStatusEnum.ACTIVE) {
                // Permanent business rejection — not a transient error, no retry needed
                this.logger.warn(`Shipment ${dto.shipmentId} is ${shipment.status}. Skipping routing.`);
                await this.eventRepo.updateStatus(dto.eventId, EventStatusEnum.FAILED);
                processingSucceeded = true; // no retry needed
                return;
            }

            const routingResult = await this.callRoutingService(dto);
            this.logger.log(`Event routed: ${dto.eventId} — routeId: ${routingResult.routeId}`);

            await this.eventRepo.updateStatus(dto.eventId, EventStatusEnum.PROCESSED);
            processingSucceeded = true;

        } catch (error: any) {
            this.logger.error(`Processing failed: ${dto.eventId}`, error.stack);

            // update db status if the event record was actually saved
            if (eventSaved) {
                try {
                    await this.eventRepo.updateStatus(dto.eventId, EventStatusEnum.FAILED);
                } catch (updateErr) {
                    this.logger.error(`Failed to update status to FAILED for ${dto.eventId}`);
                }
            }

            throw error; // re-throw so BullMQ knows to schedule a retry

        } finally {
            // release lock on failure so BullMQ retries
            // on success, let the lock expire naturally (DB PROCESSED check is the durable guard)
            if (lockToken && !processingSucceeded) {
                await this.idempotency.releaseLock(dto.eventId, dto.shipmentId, lockToken);
            }
        }
    }

    async callRoutingService(dto: ReceiveEventDto): Promise<IRoutingServiceResponse> {
        const requestBody = EventMapper.toRoutingServiceRequest(dto);
        const response = await firstValueFrom(
            this.httpService.post(this.routingServiceUrl, requestBody),
        );
        return EventMapper.fromRoutingServiceResponse(response.data);
    }

    private async resolveShipment(dto: ReceiveEventDto): Promise<ShipmentEntity> {
        let shipment = await this.shipmentRepo.findByShipmentId(dto.shipmentId);

        if (!shipment) {
            this.logger.warn(`Shipment ${dto.shipmentId} not found. Creating active stub for processing.`);
            shipment = await this.shipmentRepo.save({
                shipmentId: dto.shipmentId,
                status: ShipmentStatusEnum.ACTIVE,
                merchantId: dto.merchantId,
            });
        }

        return shipment;
    }

}
