import {ReceiveEventDto} from "../dtos/receive-event.dto";
import {EventEntity} from "../entities/event.entity";
import {EventStatusEnum} from "../enums/event-status.enum";
import {EventTypeEnum} from "../enums/event-type.enum";

export class EventMapper {
    static fromDtoToEntity(dto: ReceiveEventDto): EventEntity {

        const eventEntity = new EventEntity();

        return Object.assign(eventEntity, {
            eventId: dto.eventId,
            shipmentId: dto.shipmentId,
            payload: dto.payload,
            status: EventStatusEnum.PENDING,
            type: dto.type,
            createdAt: new Date(),
        });
    }
}