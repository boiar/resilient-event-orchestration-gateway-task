import {IEventRepository} from "../../../repositories/event-repo.interface";
import {EventEntity} from "../../../entities/event.entity";
import {Promise} from "mongoose";
import {EventStatusEnum} from "../../../enums/event-status.enum";

export class EventRepositoryStub implements IEventRepository {

    private store: Map<string, EventEntity> = new Map();

    async findByEventId(eventId: string): Promise<EventEntity | null> {
        return this.store.get(eventId) ?? null;
    }

    async save(event: EventEntity): Promise<EventEntity> {
        this.store.set(event.eventId, event);
        return event;
    }

    async updateStatus(eventId: string, eventStatus: EventStatusEnum): Promise<void> {
        const event = this.store.get(eventId);
        if (event) {
            event.status = eventStatus;
            this.store.set(eventId, event);
        }
    }

    getStore(): Map<string, EventEntity> {
        return this.store;
    }

}