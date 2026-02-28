import { IEventRepository } from '../../../repositories/event-repo.interface';
import { EventEntity } from '../../../entities/event.entity';
import { EventStatusEnum } from '../../../enums/event-status.enum';

export class EventRepositoryStub implements IEventRepository {

    private store: EventEntity[] = [];

    async save(event: EventEntity): Promise<EventEntity> {
        const index = this.store.findIndex(e => e.eventId === event.eventId);
        if (index !== -1) {
            this.store[index] = event;
        } else {
            this.store.push(event);
        }
        return event;
    }

    async findByEventId(eventId: string): Promise<EventEntity | null> {
        return this.store.find(e => e.eventId === eventId) ?? null;
    }

    async updateStatus(eventId: string, eventStatus: EventStatusEnum): Promise<void> {
        const event = this.store.find(e => e.eventId === eventId);
        if (event) event.status = eventStatus;
    }

    async countByStatus(status: EventStatusEnum): Promise<number> {
        return this.store.filter(e => e.status === status).length;
    }

    getStore(): EventEntity[] {
        return this.store;
    }

    clear(): void {
        this.store = [];
    }
}