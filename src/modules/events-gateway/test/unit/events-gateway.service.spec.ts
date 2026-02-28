import { Test, TestingModule } from '@nestjs/testing';
import { EventsGatewayService } from '../../services/implementation/events-gateway.service';
import { IdempotencyService } from '../../../shared/redis/services/implementation/idempotency.service';
import { EVENT_REPOSITORY, SHIPMENT_REPOSITORY } from '../../constants/event.constants';
import { EventStatusEnum } from '../../enums/event-status.enum';
import { EventTypeEnum } from '../../enums/event-type.enum';
import { EventEntity } from '../../entities/event.entity';
import { ReceiveEventDto } from '../../dtos/receive-event.dto';
import { EventRepositoryStub } from './stubs/event-repository.stub';
import { ShipmentRepositoryStub } from './stubs/shipment-repository.stub';
import { IdempotencyServiceStub } from '../../../shared/redis/test/unit/stubs/idempotency.service.stub';
import { Logger } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { getQueueToken } from '@nestjs/bullmq';
import { HttpService } from '@nestjs/axios';
import { ShipmentStatusEnum } from '../../enums/shipment-status.enum';
import { ConfigService } from '@nestjs/config';

const fakeReceiveEventDto = (overrides: Partial<ReceiveEventDto> = {}): ReceiveEventDto =>
    <ReceiveEventDto>{
        eventId: 'event_abc123',
        merchantId: 'merchant_789xyz',
        shippingCompanyId: 'company_idxyz',
        shipmentId: 'shp_9f8e7d6c',
        type: EventTypeEnum.SHIPMENT_CREATED,
        occurredAt: '2026-02-25T14:30:00Z',
        payload: { origin: 'egypt', destination: 'usa', weight: 12.5 },
        ...overrides,
    };

const makeQueueStub = () => ({
    add: jest.fn().mockResolvedValue({ id: 'job_123' }),
});

const makeHttpStub = () => ({
    post: jest.fn().mockReturnValue(of({ data: { routeId: 'route_123' } })),
});

const makeConfigStub = () => ({
    get: jest.fn().mockImplementation((key: string) => {
        if (key === 'app.routingServiceUrl') return '/v1/routing-service';
        return undefined;
    }),
});

describe('EventsGatewayService', () => {
    let service: EventsGatewayService;
    let idempotencyStub: IdempotencyServiceStub;
    let eventRepoStub: EventRepositoryStub;
    let shipmentRepoStub: ShipmentRepositoryStub;
    let queueStub: ReturnType<typeof makeQueueStub>;
    let httpStub: ReturnType<typeof makeHttpStub>;
    let configStub: ReturnType<typeof makeConfigStub>;
    let loggerErrorSpy: jest.SpyInstance;

    beforeEach(async () => {
        idempotencyStub = new IdempotencyServiceStub();
        eventRepoStub = new EventRepositoryStub();
        shipmentRepoStub = new ShipmentRepositoryStub();
        queueStub = makeQueueStub();
        httpStub = makeHttpStub();
        configStub = makeConfigStub();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                EventsGatewayService,
                { provide: IdempotencyService, useValue: idempotencyStub },
                { provide: EVENT_REPOSITORY, useValue: eventRepoStub },
                { provide: SHIPMENT_REPOSITORY, useValue: shipmentRepoStub },
                { provide: getQueueToken('events-processing'), useValue: queueStub },
                { provide: HttpService, useValue: httpStub },
                { provide: ConfigService, useValue: configStub },
            ],
        }).compile();

        service = module.get<EventsGatewayService>(EventsGatewayService);
        loggerErrorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => { });
    });

    afterEach(() => {
        loggerErrorSpy.mockRestore();
        idempotencyStub.clear();
        eventRepoStub.clear();
        shipmentRepoStub.clear();
    });

    describe('eventsEnqueue', () => {
        it('should always return accepted status', async () => {
            const result = await service.eventsEnqueue(fakeReceiveEventDto());
            expect(result).toEqual({ status: 'accepted' });
        });

        it('should add the event to the queue with correct job name and options', async () => {
            const dto = fakeReceiveEventDto();

            await service.eventsEnqueue(dto);

            expect(queueStub.add).toHaveBeenCalledTimes(1);
            expect(queueStub.add).toHaveBeenCalledWith('process-event', dto, {
                jobId: dto.eventId,
            });
        });

        it('should throw error when queue add fails', async () => {
            queueStub.add.mockRejectedValueOnce(new Error('queue error'));

            await expect(service.eventsEnqueue(fakeReceiveEventDto())).rejects.toThrow('queue error');
        });
    });

    describe('processQueuedEvent', () => {
        it('should skip if event already PROCESSED in DB', async () => {
            const dto = fakeReceiveEventDto();
            await eventRepoStub.save({ eventId: dto.eventId, status: EventStatusEnum.PROCESSED } as EventEntity);
            const acquireSpy = jest.spyOn(idempotencyStub, 'acquireLock');

            await service.processQueuedEvent(dto);

            expect(acquireSpy).not.toHaveBeenCalled();
            expect(httpStub.post).not.toHaveBeenCalled();
        });

        it('should skip if lock cannot be acquired (duplicate)', async () => {
            const dto = fakeReceiveEventDto();
            idempotencyStub.simulateDuplicate(dto.eventId, dto.shipmentId);
            // TODO
            const saveSpy = eventRepoStub.save(dto);

            await service.processQueuedEvent(dto);

            expect(saveSpy).not.toHaveBeenCalled();
            expect(httpStub.post).not.toHaveBeenCalled();
        });

        it('should process successfully: save event, resolve shipment, call routing, update status, release lock', async () => {
            const dto = fakeReceiveEventDto();
            const releaseSpy = jest.spyOn(idempotencyStub, 'releaseLock');

            await service.processQueuedEvent(dto);

            // Verify event saved
            const savedEvent = await eventRepoStub.findByEventId(dto.eventId);
            expect(savedEvent).toBeDefined();
            expect(savedEvent?.status).toBe(EventStatusEnum.PROCESSED);

            // Verify shipment resolved (created as active stub since it didn't exist)
            const savedShipment = await shipmentRepoStub.findByShipmentId(dto.shipmentId);
            expect(savedShipment).toBeDefined();
            expect(savedShipment?.status).toBe(ShipmentStatusEnum.ACTIVE);

            // Verify routing called
            expect(httpStub.post).toHaveBeenCalledWith('/v1/routing-service', expect.any(Object));

            // Verify lock released
            expect(releaseSpy).toHaveBeenCalledWith(dto.eventId, dto.shipmentId, 'stub-token');
        });

        it('should fail if shipment is not ACTIVE', async () => {
            const dto = fakeReceiveEventDto();
            await shipmentRepoStub.save({
                shipmentId: dto.shipmentId,
                status: ShipmentStatusEnum.CANCELLED,
                merchantId: dto.merchantId
            } as any);
            const releaseSpy = jest.spyOn(idempotencyStub, 'releaseLock');

            await service.processQueuedEvent(dto);

            const savedEvent = await eventRepoStub.findByEventId(dto.eventId);
            expect(savedEvent?.status).toBe(EventStatusEnum.FAILED);
            expect(httpStub.post).not.toHaveBeenCalled();
            expect(releaseSpy).toHaveBeenCalledWith(dto.eventId, dto.shipmentId, 'stub-token');
        });

        it('should update status to FAILED and rethrow if processing fails', async () => {
            const dto = fakeReceiveEventDto();
            httpStub.post.mockReturnValueOnce(throwError(() => new Error('routing failed')));
            const releaseSpy = jest.spyOn(idempotencyStub, 'releaseLock');

            await expect(service.processQueuedEvent(dto)).rejects.toThrow('routing failed');

            const savedEvent = await eventRepoStub.findByEventId(dto.eventId);
            expect(savedEvent?.status).toBe(EventStatusEnum.FAILED);
            expect(releaseSpy).toHaveBeenCalledWith(dto.eventId, dto.shipmentId, 'stub-token');
        });
    });
});