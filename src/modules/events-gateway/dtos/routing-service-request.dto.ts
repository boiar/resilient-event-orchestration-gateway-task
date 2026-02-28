// dtos/routing-service-request.dto.ts
import {IsString, IsNotEmpty, IsNumber, IsOptional, IsEnum} from 'class-validator';
import {EventTypeEnum} from "../enums/event-type.enum";

export class RoutingServiceRequestDto {

    @IsString()
    @IsNotEmpty()
    eventId!: string;

    @IsString()
    @IsNotEmpty()
    shipmentId!: string;

    @IsString()
    @IsNotEmpty()
    shippingCompanyId!: string;

    @IsString()
    @IsNotEmpty()
    merchantId!: string;

    @IsEnum(EventTypeEnum)
    eventType!: EventTypeEnum;

    @IsString()
    @IsOptional()
    origin?: string;

    @IsString()
    @IsOptional()
    destination?: string;

    @IsNumber()
    @IsOptional()
    weight?: number;
}