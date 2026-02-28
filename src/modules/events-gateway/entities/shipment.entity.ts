import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import {ShipmentStatusEnum} from "../enums/shipment-status.enum";

export type ShipmentDocument = ShipmentEntity & Document;

@Schema({
    collection: 'shipments',
    timestamps: true,
    versionKey: false,
})
export class ShipmentEntity {
    @Prop({ required: true, unique: true, index: true })
    shipmentId!: string;

    @Prop({ required: true, default: ShipmentStatusEnum.ACTIVE })
    status!: ShipmentStatusEnum;

    @Prop({ required: true })
    merchantId!: string;
}

export const ShipmentSchema = SchemaFactory.createForClass(ShipmentEntity);
