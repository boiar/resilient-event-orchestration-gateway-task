import { ReceiveEventDto } from "../dtos/receive-event.dto";
import { EventEntity } from "../entities/event.entity";
import { EventStatusEnum } from "../enums/event-status.enum";
import { IRoutingServiceResponse } from "../responses/routing-service.response";
import { RoutingServiceRequestDto } from "../dtos/routing-service-request.dto";



export class EventMapper {
    static fromDtoToEntity(dto: ReceiveEventDto): EventEntity {

        const eventEntity = new EventEntity();

        return Object.assign(eventEntity, {
            eventId: dto.eventId,
            shipmentId: dto.shipmentId,
            payload: dto.payload,
            status: EventStatusEnum.PENDING,
            type: dto.type,
        });
    }

    static fromRoutingServiceResponse(raw: any): IRoutingServiceResponse {
        return {
            routed: Boolean(raw?.routed),
            routeId: raw?.routeId ?? 'UNKNOWN',
            processedAt: raw?.processedAt ?? new Date().toISOString(),
        };
    }

    static toRoutingServiceRequest(dto: ReceiveEventDto): RoutingServiceRequestDto {
        return {
            eventId: dto.eventId,
            shipmentId: dto.shipmentId,
            merchantId: dto.merchantId,
            shippingCompanyId: dto.shippingCompanyId,
            origin: dto.payload?.origin,
            destination: dto.payload?.destination,
            weight: dto.payload?.weight,
            eventType: dto.type
        };
    }
}