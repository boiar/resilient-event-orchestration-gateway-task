export interface IIdempotencyService {
    acquireLock(eventId: string, shipmentId: string): Promise<boolean>;

    releaseLock(eventId: string, shipmentId: string): Promise<void>;
}