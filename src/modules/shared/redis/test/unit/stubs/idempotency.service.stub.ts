import {IIdempotencyService} from "../../../services/idempotency-service.interface";

export class IdempotencyServiceStub implements IIdempotencyService {
    private lockedKeys = new Set<string>();
    private releasedKeys: string[] = [];

    async acquireLock(eventId: string, shipmentId: string): Promise<boolean> {
        const key = `event:lock:${eventId}:${shipmentId}`;
        if (this.lockedKeys.has(key)) {
            return false;
        }
        this.lockedKeys.add(key);
        return true;
    }

    async releaseLock(eventId: string, shipmentId: string): Promise<void> {
        const keyPrefix = `event:lock:${eventId}:${shipmentId}`;
        this.lockedKeys.forEach(key => {
            if (key.startsWith(keyPrefix)) this.lockedKeys.delete(key);
        });
        this.releasedKeys.push(eventId);
    }

    // for testing
    simulateDuplicate(eventId: string, shipmentId: string): void {
        const key = `event:lock:${eventId}:${shipmentId}`;
        this.lockedKeys.add(key);
    }

    isLocked(eventId: string, shipmentId: string): boolean {
        const key = `event:lock:${eventId}:${shipmentId}`;
        return this.lockedKeys.has(key);
    }

    wasReleased(eventId: string): boolean {
        return this.releasedKeys.includes(eventId);
    }

    clear(): void {
        this.lockedKeys.clear();
        this.releasedKeys = [];
    }
}