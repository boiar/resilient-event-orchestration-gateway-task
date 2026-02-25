import {IsEnum, IsISO8601, IsObject, IsString} from "class-validator";
import {ApiProperty} from "@nestjs/swagger";
import {EventTypeEnum} from "../enums/event-type.enum";

export class ReceiveEventDto {

    @ApiProperty({
        description: 'Unique event ID used for idempotency',
        example: 'event_abc12'
    })
    @IsString()
    eventId!: string;

    @ApiProperty({
        description: 'Merchant ID (multi-tenant isolation)',
        example: 'merchant_789xyz',
    })
    @IsString()
    merchantId!: string;

    @ApiProperty({
        description: 'Shipping company ID',
        example: 'company_idxyz'
    })
    @IsString()
    shippingCompanyId!: string;

    @ApiProperty({
        description: 'shipment ID',
        example: 'shp_xyz123'
    })
    @IsString()
    shipmentId!: string;

    @ApiProperty({
        description: 'type',
        enum: EventTypeEnum,
        example: 'SHIPMENT_CREATED'
    })
    @IsEnum(EventTypeEnum)
    type!: string;

    @ApiProperty({
        description: 'Event occurrence timestamp',
        example: '2026-02-25T14:30:00Z',
    })
    @IsISO8601()
    occurredAt!: string;

    @ApiProperty({
        description: 'Event payload data',
        type: Object,
        example: {
            origin: 'Cairo',
            destination: 'Alexandria',
            weight: 12.5,
            status: 'pending'
        }
    })
    @IsObject()
    payload!: Record<string, any>;

    @ApiProperty({
        description: 'HMAC signature for payload authenticity validation',
        example: 'a9f5d1c3b2e6f7..',
    })
    @IsString()
    signature!: string;

}