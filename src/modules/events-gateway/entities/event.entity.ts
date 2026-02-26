import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { EventStatusEnum } from "../enums/event-status.enum";
import { EventTypeEnum } from "../enums/event-type.enum";

export type EventDocument = EventEntity & Document;

@Schema({
    collection: 'events',
    timestamps: { createdAt: 'createdAt', updatedAt: 'processedAt' },
    versionKey: false,
})
export class EventEntity {
    @Prop({ required: true, unique: true, index: true })
    eventId!: string;

    @Prop({ required: true, index: true })
    shipmentId!: string;

    @Prop({ type: Object, default: {} })
    payload!: any;

    @Prop({ required: true, enum: EventTypeEnum })
    type!: EventTypeEnum;

    @Prop({ enum: EventStatusEnum, default: EventStatusEnum.PENDING, index: true })
    status!: EventStatusEnum
}

export const EventSchema = SchemaFactory.createForClass(EventEntity);

EventSchema.index({ eventId: 1, status: 1 });
EventSchema.index({ shipmentId: 1, status: 1 });
