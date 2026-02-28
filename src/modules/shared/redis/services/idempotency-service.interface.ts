export interface IIdempotencyService {
    acquireLock(eventId: string, shipmentId: string): Promise<string | null>;

    releaseLock(eventId: string, shipmentId: string, token: string): Promise<void>;
}