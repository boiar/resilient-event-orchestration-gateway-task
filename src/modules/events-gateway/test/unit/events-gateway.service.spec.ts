import { Test, TestingModule } from '@nestjs/testing';
import { EventsGatewayService } from '../../services/implemention/events-gateway.service';
import { IdempotencyService } from '../../../shared/redis/services/implemetion/idempotency.service';
import { EVENT_REPOSITORY, EVENTS_QUEUE_CLIENT } from '../../constants/event.constants';
import { EventStatusEnum } from '../../enums/event-status.enum';
import { EventTypeEnum } from '../../enums/event-type.enum';
import { EventEntity } from '../../entities/event.entity';
import { ReceiveEventDto } from '../../dtos/receive-event.dto';
import { EventRepositoryStub } from './stubs/event-repository.stub';
import { IdempotencyServiceStub } from '../../../shared/redis/test/unit/stubs/idempotency.service.stub';
import { Logger } from '@nestjs/common';
import { of, Subject } from 'rxjs';


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
    connect: jest.fn().mockResolvedValue(undefined),
    emit: jest.fn().mockReturnValue(of(null)),
    close: jest.fn(),
});


describe('EventsGatewayService', () => {
    let service: EventsGatewayService;
    let idempotencyStub: IdempotencyServiceStub;
    let eventRepoStub: EventRepositoryStub;
    let queueStub: ReturnType<typeof makeQueueStub>;
    let loggerErrorSpy: jest.SpyInstance;

    beforeEach(async () => {
        idempotencyStub = new IdempotencyServiceStub();
        eventRepoStub = new EventRepositoryStub();
        queueStub = makeQueueStub();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                EventsGatewayService,
                { provide: IdempotencyService, useValue: idempotencyStub },
                { provide: EVENT_REPOSITORY, useValue: eventRepoStub },
                { provide: EVENTS_QUEUE_CLIENT, useValue: queueStub },
            ],
        }).compile();

        service = module.get<EventsGatewayService>(EventsGatewayService);
        loggerErrorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        loggerErrorSpy.mockRestore();
        idempotencyStub.clear();
        eventRepoStub.clear();
    });


    describe('onModuleInit', () => {
        it('should connect the queue client on init', async () => {
            await service.onModuleInit();
            expect(queueStub.connect).toHaveBeenCalledTimes(1);
        });

        it('should log error when queue client connection fails', async () => {
            const error = new Error('connection refused');
            queueStub.connect.mockRejectedValueOnce(error);

            await service.onModuleInit();

            expect(loggerErrorSpy).toHaveBeenCalledWith(
                'Failed to connect queue client',
                error,
            );
        });
    });


    describe('eventsEnqueue', () => {
        it('should always return accepted status', async () => {
            const result = await service.eventsEnqueue(fakeReceiveEventDto());
            expect(result).toEqual({ status: 'accepted' });
        });

        it('should emit the event to the queue with correct pattern and payload', async () => {
            const dto = fakeReceiveEventDto();

            await service.eventsEnqueue(dto);

            expect(queueStub.emit).toHaveBeenCalledTimes(1);
            expect(queueStub.emit).toHaveBeenCalledWith('process-event', dto);
        });

        it('should return accepted even when queue emit errors', async () => {
            // emit returns an observable that errors — catchError in service swallows it
            queueStub.emit.mockReturnValueOnce(
                new Subject(), // never emits, timeout will trigger
            );

            const result = await service.eventsEnqueue(fakeReceiveEventDto());

            expect(result).toEqual({ status: 'accepted' });
        });

        it('should not interact with idempotency on enqueue', async () => {
            const acquireSpy = jest.spyOn(idempotencyStub, 'acquireLock');

            await service.eventsEnqueue(fakeReceiveEventDto());

            expect(acquireSpy).not.toHaveBeenCalled();
        });

        it('should not save to repository on enqueue', async () => {
            await service.eventsEnqueue(fakeReceiveEventDto());
            expect(eventRepoStub.getStore()).toHaveLength(0);
        });
    });


    describe('processQueuedEvent', () => {

        describe('when lock is acquired', () => {
            it('should save the event to the repository', async () => {
                const dto = fakeReceiveEventDto();

                await service.processQueuedEvent(dto);

                // give fire-and-forget save a tick to complete
                await new Promise(resolve => setImmediate(resolve));

                const saved = await eventRepoStub.findByEventId(dto.eventId);
                expect(saved).not.toBeNull();
                expect(saved?.eventId).toBe(dto.eventId);
            });

            it('should update status to PROCESSED on success', async () => {
                const dto = fakeReceiveEventDto();
                await eventRepoStub.save({ eventId: dto.eventId } as EventEntity);

                await service.processQueuedEvent(dto);

                const saved = await eventRepoStub.findByEventId(dto.eventId);
                expect(saved?.status).toBe(EventStatusEnum.PROCESSED);
            });

            it('should log error but not throw when repo save fails', async () => {
                const dto = fakeReceiveEventDto();
                jest.spyOn(eventRepoStub, 'save').mockRejectedValueOnce(new Error('db error'));

                await service.processQueuedEvent(dto);

                await new Promise(resolve => setImmediate(resolve));

                expect(loggerErrorSpy).toHaveBeenCalledWith(
                    expect.stringContaining(dto.eventId),
                    expect.any(Error),
                );
            });
        });

        describe('when lock is not acquired (duplicate)', () => {
            it('should return early without saving to repo', async () => {
                const dto = fakeReceiveEventDto();
                idempotencyStub.simulateDuplicate(dto.eventId, dto.shipmentId);

                await service.processQueuedEvent(dto);

                expect(eventRepoStub.getStore()).toHaveLength(0);
            });

            it('should return early without updating status', async () => {
                const dto = fakeReceiveEventDto();
                await eventRepoStub.save({ eventId: dto.eventId } as EventEntity);
                idempotencyStub.simulateDuplicate(dto.eventId, dto.shipmentId);
                const updateSpy = jest.spyOn(eventRepoStub, 'updateStatus');

                await service.processQueuedEvent(dto);

                expect(updateSpy).not.toHaveBeenCalled();
            });
        });

        describe('when processing fails', () => {
            it('should update status to FAILED', async () => {
                const dto = fakeReceiveEventDto();
                await eventRepoStub.save({ eventId: dto.eventId } as EventEntity);
                (service as any).processEventByType = jest.fn()
                    .mockRejectedValueOnce(new Error('processing failed'));

                await expect(service.processQueuedEvent(dto)).rejects.toThrow();

                const saved = await eventRepoStub.findByEventId(dto.eventId);
                expect(saved?.status).toBe(EventStatusEnum.FAILED);
            });

            it('should rethrow the original error', async () => {
                const dto = fakeReceiveEventDto();
                await eventRepoStub.save({ eventId: dto.eventId } as EventEntity);
                const error = new Error('unexpected failure');
                (service as any).processEventByType = jest.fn().mockRejectedValueOnce(error);

                await expect(service.processQueuedEvent(dto)).rejects.toThrow(error);
            });

            it('should log the error before rethrowing', async () => {
                const dto = fakeReceiveEventDto();
                await eventRepoStub.save({ eventId: dto.eventId } as EventEntity);
                (service as any).processEventByType = jest.fn()
                    .mockRejectedValueOnce(new Error('fail'));

                await expect(service.processQueuedEvent(dto)).rejects.toThrow();

                expect(loggerErrorSpy).toHaveBeenCalledWith(
                    expect.stringContaining(dto.eventId),
                    expect.any(Error),
                );
            });
        });
    });
});