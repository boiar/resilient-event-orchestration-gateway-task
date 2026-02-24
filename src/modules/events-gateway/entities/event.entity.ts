import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import {EventStatusEnum} from "../enums/event-status.enum";
import {EventTypeEnum} from "../enums/event-type.enum";

export type EventDocument = EventEntity & Document;

@Schema({ collection: 'events', timestamps: { createdAt: 'createdAt', updatedAt: 'processedAt' } })
export class EventEntity {
    @Prop({ required: true, unique: true })
    eventId: string;

    @Prop({ required: true })
    shipmentId: string;

    @Prop({ type: Object, default: {} }) // as json
    payload: any;

    @Prop({ required: true, enum: EventTypeEnum })
    type: EventTypeEnum;

    @Prop({ enum: EventStatusEnum, default: EventStatusEnum.PENDING })
    status: EventStatusEnum
}

export const EventSchema = SchemaFactory.createForClass(EventEntity);
