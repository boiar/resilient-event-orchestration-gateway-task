export interface IIdempotencyService {
    acquireLock(eventId: string): Promise<boolean>;

    releaseLock(eventId: string): Promise<void>;
}