import {EventEntity} from "../entities/event.entity";
import {EventStatusEnum} from "../enums/event-status.enum";

export interface IEventRepository {
    save(event: EventEntity): Promise<EventEntity>;

    findByEventId(eventId: string): Promise<EventEntity | null>;

    updateStatus(eventId: string, eventStatus: EventStatusEnum): Promise<void>;
}