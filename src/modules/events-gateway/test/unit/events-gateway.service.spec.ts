import {Test, TestingModule} from '@nestjs/testing';
import {EventsGatewayService} from '../../services/implementation/events-gateway.service';
import {IdempotencyService} from '../../../shared/redis/services/implementation/idempotency.service';
import {EVENT_REPOSITORY, SHIPMENT_REPOSITORY} from '../../constants/event.constants';
import {EventStatusEnum} from '../../enums/event-status.enum';
import {EventTypeEnum} from '../../enums/event-type.enum';
import {EventEntity} from '../../entities/event.entity';
import {ReceiveEventDto} from '../../dtos/receive-event.dto';
import {EventRepositoryStub} from './stubs/event-repository.stub';
import {ShipmentRepositoryStub} from './stubs/shipment-repository.stub';
import {IdempotencyServiceStub} from '../../../shared/redis/test/unit/stubs/idempotency.service.stub';
import {Logger} from '@nestjs/common';
import {of, throwError} from 'rxjs';
import {getQueueToken} from '@nestjs/bullmq';
import {HttpService} from '@nestjs/axios';
import {ShipmentStatusEnum} from '../../enums/shipment-status.enum';
import {ConfigService} from '@nestjs/config';
import {QueueStub} from "./stubs/queue.stub";

const fakeDto = (overrides: Partial<ReceiveEventDto> = {}): ReceiveEventDto =>
    <ReceiveEventDto>{
        eventId: 'event_abc123',
        merchantId: 'merchant_789xyz',
        shippingCompanyId: 'company_idxyz',
        shipmentId: 'shp_9f8e7d6c',
        type: EventTypeEnum.SHIPMENT_CREATED,
        occurredAt: '2026-02-25T14:30:00Z',
        payload: {origin: 'egypt', destination: 'usa', weight: 12.5},
        ...overrides,
    };


const makeHttpMock = () => ({
    post: jest.fn().mockReturnValue(of({
        data: {
            routed: true,
            routeId: 'route_123',
            processedAt: new Date().toISOString(),
        },
    })),
});


describe('EventsGatewayService', () => {
    let service: EventsGatewayService;
    let idempotencyStub: IdempotencyServiceStub;
    let eventRepoStub: EventRepositoryStub;
    let shipmentRepoStub: ShipmentRepositoryStub;
    let queueStub: QueueStub;
    let httpMock: ReturnType<typeof makeHttpMock>;
    let loggerSpy: jest.SpyInstance;


    beforeEach(async () => {
        idempotencyStub = new IdempotencyServiceStub();
        eventRepoStub = new EventRepositoryStub();
        shipmentRepoStub = new ShipmentRepositoryStub();
        queueStub = new QueueStub();
        httpMock = makeHttpMock();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                EventsGatewayService,
                {provide: IdempotencyService, useValue: idempotencyStub},
                {provide: EVENT_REPOSITORY, useValue: eventRepoStub},
                {provide: SHIPMENT_REPOSITORY, useValue: shipmentRepoStub},
                {provide: getQueueToken('events-processing'), useValue: queueStub},
                {provide: HttpService, useValue: httpMock},
                {
                    provide: ConfigService,
                    useValue: {
                        get: (key: string) => {
                            if (key === 'queue.maxRetries') return 3;
                            if (key === 'queue.workerPrefetch') return 10;
                            if (key === 'app.routingServiceUrl') return '/v1/routing-service';
                            if (key === 'routing.serviceUrl') return '/v1/routing-service';
                            return undefined;
                        },
                    },
                },
            ],
        }).compile();

        service = module.get<EventsGatewayService>(EventsGatewayService);
        loggerSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {
        });
    });

    afterEach(() => {
        loggerSpy.mockRestore();
        idempotencyStub.clear();
        eventRepoStub.clear();
        shipmentRepoStub.clear();
        queueStub.clear();
        jest.clearAllMocks();
    });

    describe('eventsEnqueue', () => {
        it('should return accepted status', async () => {
            const result = await service.eventsEnqueue(fakeDto());
            expect(result).toEqual({ status: 'accepted' });
        });

        it('should add event to queue with correct job name and jobId', async () => {
            const dto = fakeDto();

            await service.eventsEnqueue(dto);

            const job = queueStub.getLastJob();
            expect(job).not.toBeNull();
            expect(job.name).toBe('process-event');
            expect(job.data).toEqual(dto);
            expect(job.opts.jobId).toBe(dto.eventId);
        });

        it('should have exactly one job in queue after enqueue', async () => {
            await service.eventsEnqueue(fakeDto());
            expect(queueStub.jobs).toHaveLength(1);
        });

        it('should log error and not throw when queue add fails', async () => {
            queueStub.simulateFailure();

            await service.eventsEnqueue(fakeDto());

            expect(queueStub.jobs).toHaveLength(0);
            expect(loggerSpy).toHaveBeenCalled();
        });

    });

    describe('processQueuedEvent', () => {
        describe('when lock cannot be acquired (duplicate event)', () => {
            it('should not save event to repository', async () => {
                const dto = fakeDto();
                idempotencyStub.simulateDuplicate(dto.eventId, dto.shipmentId);

                await service.processQueuedEvent(dto);

                expect(eventRepoStub.getStore()).toHaveLength(0);
            });

            it('should not call routing service', async () => {
                const dto = fakeDto();
                idempotencyStub.simulateDuplicate(dto.eventId, dto.shipmentId);

                await service.processQueuedEvent(dto);

                expect(httpMock.post).not.toHaveBeenCalled();
            });
        });

        describe('when lock acquired and shipment is ACTIVE', () => {
            it('should save event to repository', async () => {
                const dto = fakeDto();

                await service.processQueuedEvent(dto);

                const saved = await eventRepoStub.findByEventId(dto.eventId);
                expect(saved).not.toBeNull();
                expect(saved?.eventId).toBe(dto.eventId);
            });

            it('should create active shipment stub when shipment not found', async () => {
                const dto = fakeDto();

                await service.processQueuedEvent(dto);

                const shipment = await shipmentRepoStub.findByShipmentId(dto.shipmentId);
                expect(shipment).not.toBeNull();
                expect(shipment?.status).toBe(ShipmentStatusEnum.ACTIVE);
                expect(shipment?.merchantId).toBe(dto.merchantId);
            });

            it('should call routing service with mapped request body', async () => {
                const dto = fakeDto();

                await service.processQueuedEvent(dto);

                expect(httpMock.post).toHaveBeenCalledTimes(1);
                expect(httpMock.post).toHaveBeenCalledWith(
                    expect.stringContaining('routing-service'),
                    expect.objectContaining({
                        eventId: dto.eventId,
                        shipmentId: dto.shipmentId,
                        merchantId: dto.merchantId,
                    }),
                );
            });

            it('should update event status to PROCESSED', async () => {
                const dto = fakeDto();

                await service.processQueuedEvent(dto);

                const saved = await eventRepoStub.findByEventId(dto.eventId);
                expect(saved?.status).toBe(EventStatusEnum.PROCESSED);
            });
        });

        describe('when shipment is not ACTIVE', () => {
            beforeEach(async () => {
                await shipmentRepoStub.save({
                    shipmentId: 'shp_9f8e7d6c',
                    status: ShipmentStatusEnum.CANCELLED,
                    merchantId: 'merchant_789xyz',
                } as any);
            });

            it('should update event status to FAILED', async () => {
                const dto = fakeDto();

                await service.processQueuedEvent(dto);

                const saved = await eventRepoStub.findByEventId(dto.eventId);
                expect(saved?.status).toBe(EventStatusEnum.FAILED);
            });

            it('should not call routing service', async () => {
                await service.processQueuedEvent(fakeDto());

                expect(httpMock.post).not.toHaveBeenCalled();
            });

        });

        describe('when routing service fails', () => {
            it('should update event status to FAILED', async () => {
                const dto = fakeDto();
                httpMock.post.mockReturnValueOnce(throwError(() => new Error('routing failed')));

                await expect(service.processQueuedEvent(dto)).rejects.toThrow('routing failed');

                const saved = await eventRepoStub.findByEventId(dto.eventId);
                expect(saved?.status).toBe(EventStatusEnum.FAILED);
            });

            it('should rethrow error so queue triggers retry', async () => {
                httpMock.post.mockReturnValueOnce(throwError(() => new Error('routing failed')));

                await expect(service.processQueuedEvent(fakeDto())).rejects.toThrow('routing failed');
            });

            it('should release lock on routing service failure so retry can reprocess same event', async () => {
                const dto = fakeDto();

                httpMock.post.mockReturnValueOnce(
                    throwError(() => new Error('routing failed'))
                );

                await expect(service.processQueuedEvent(dto)).rejects.toThrow('routing failed');

                // Lock must be released so BullMQ retry can acquire it
                expect(idempotencyStub.wasReleased(dto.eventId)).toBe(true);
                expect(idempotencyStub.isLocked(dto.eventId, dto.shipmentId)).toBe(false);
            });
        });

        describe('retry behavior', () => {

            it('should block second attempt when lock is still held from successful first attempt', async () => {
                const dto = fakeDto();

                // attempt 1 — succeeds, lock intentionally NOT released
                await service.processQueuedEvent(dto);

                // attempt 2 — lock still held, should skip
                await service.processQueuedEvent(dto);

                // routing called only once (attempt 2 blocked by lock)
                expect(httpMock.post).toHaveBeenCalledTimes(1);
                expect(idempotencyStub.isLocked(dto.eventId, dto.shipmentId)).toBe(true);
            });

            it('should release lock on failure so BullMQ retry can acquire it', async () => {
                const dto = fakeDto();

                // attempt 1 — fails, lock should be RELEASED in finally
                httpMock.post.mockReturnValueOnce(throwError(() => new Error('routing failed')));
                await expect(service.processQueuedEvent(dto)).rejects.toThrow('routing failed');

                // lock must be released so the next attempt can proceed
                expect(idempotencyStub.isLocked(dto.eventId, dto.shipmentId)).toBe(false);
            });

            it('should process successfully on retry after failed first attempt', async () => {
                const dto = fakeDto();

                // attempt 1 — fails, lock released in finally
                httpMock.post.mockReturnValueOnce(throwError(() => new Error('routing failed')));
                await expect(service.processQueuedEvent(dto)).rejects.toThrow('routing failed');

                // lock was released — attempt 2 can acquire lock and succeed
                await service.processQueuedEvent(dto);

                const saved = await eventRepoStub.findByEventId(dto.eventId);
                expect(saved?.status).toBe(EventStatusEnum.PROCESSED);
                expect(httpMock.post).toHaveBeenCalledTimes(2);
            });

            it('should skip retry if event already PROCESSED in DB', async () => {
                const dto = fakeDto();

                // attempt 1 — fails, lock released
                httpMock.post.mockReturnValueOnce(throwError(() => new Error('routing failed')));
                await expect(service.processQueuedEvent(dto)).rejects.toThrow('routing failed');

                // simulate another worker succeeded in the meantime
                await eventRepoStub.save({ eventId: dto.eventId, status: EventStatusEnum.PROCESSED } as EventEntity);

                // attempt 2 — lock is free (released on failure), but DB check short-circuits
                await service.processQueuedEvent(dto);

                // routing called only once (attempt 1), attempt 2 skipped via DB guard
                expect(httpMock.post).toHaveBeenCalledTimes(1);
            });

            it('should process event exactly once when same event sent multiple times concurrently', async () => {
                const dto = fakeDto();

                // simulate 3 concurrent attempts
                const results = await Promise.allSettled([
                    service.processQueuedEvent(dto),
                    service.processQueuedEvent(dto),
                    service.processQueuedEvent(dto),
                ]);

                // all resolve — duplicates return early without throwing
                const succeeded = results.filter(r => r.status === 'fulfilled');
                expect(succeeded).toHaveLength(3);

                // routing called exactly once
                expect(httpMock.post).toHaveBeenCalledTimes(1);

                // event saved exactly once
                expect(eventRepoStub.getStore()).toHaveLength(1);
            });
        });

    });
});