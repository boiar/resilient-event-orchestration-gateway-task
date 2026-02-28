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
        await this.queue.add('process-event', dto, {
            jobId: dto.eventId,
        });
        this.logger.log(`Event enqueued: ${dto.eventId}`);

        return {
            status: 'accepted',
        };
    }

    async processQueuedEvent(dto: ReceiveEventDto): Promise<void> {
        let lockToken: string | null = null;
        try {
            //Idempotency (DB Check)
            const existingEvent = await this.eventRepo.findByEventId(dto.eventId);
            if (existingEvent?.status === EventStatusEnum.PROCESSED) {
                this.logger.log(`Event already processed, skipping: ${dto.eventId}`);
                return;
            }

            // TODO
            // Primary Idempotency
            lockToken = await this.idempotency.acquireLock(dto.eventId, dto.shipmentId);
            if (!lockToken) {
                this.logger.log(`Duplicate event skipped (lock held): ${dto.eventId}`);
                return;
            }

            await this.eventRepo.save(EventMapper.fromDtoToEntity(dto));

            const shipment = await this.resolveShipment(dto);

            if (shipment.status !== ShipmentStatusEnum.ACTIVE) {
                this.logger.warn(`Shipment ${dto.shipmentId} is ${shipment.status}. Skipping routing.`);
                await this.eventRepo.updateStatus(dto.eventId, EventStatusEnum.FAILED);
                return;
            }

            const routingResult = await this.callRoutingService(dto);
            this.logger.log(`Event routed: ${dto.eventId} — routeId: ${routingResult.routeId}`);

            await this.eventRepo.updateStatus(dto.eventId, EventStatusEnum.PROCESSED);

        } catch (error: any) {
            if (lockToken) {
                await this.idempotency.releaseLock(dto.eventId, dto.shipmentId, lockToken);
            }
            this.logger.error(`Failed to process event: ${dto.eventId}`, error.stack);

            try {
                await this.eventRepo.updateStatus(dto.eventId, EventStatusEnum.FAILED);
            } catch (updateErr) {
                this.logger.error(`Failed to update status to FAILED for ${dto.eventId}`);
            }

            throw error; // BullMQ retry logic
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
