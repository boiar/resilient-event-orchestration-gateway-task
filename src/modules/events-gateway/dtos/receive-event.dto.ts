import {IsEnum, IsObject, IsString} from "class-validator";
import {ApiProperty} from "@nestjs/swagger";
import {EventTypeEnum} from "../enums/event-type.enum";

export class ReceiveEventDto {

    @ApiProperty({
        description: 'Unique event ID',
        example: 'event_abc12'
    })
    @IsString()
    eventId: string;

    @ApiProperty({
        description: 'shipment ID',
        example: 'shp_9f8e7d6c'
    })
    @IsString()
    shipmentId: string;

    @ApiProperty({
        description: 'type',
        example: 'SHIPMENT_CREATED'
    })
    @IsEnum(EventTypeEnum)
    type: string;

    @ApiProperty({
        description: 'Payload data',
        type: Object,
        example: {
            origin: 'egypt',
            destination: 'egypt',
            weight: 12.5,
            status: 'pending'
        }
    })
    @IsObject()
    payload: Record<string, any>;

}