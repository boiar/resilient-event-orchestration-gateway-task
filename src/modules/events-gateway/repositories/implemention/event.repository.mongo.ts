import {Injectable} from "@nestjs/common";
import {IEventRepository} from "../event-repo.interface";
import {EventDocument, EventEntity} from "../../entities/event.entity";
import {Model} from 'mongoose'
import {InjectModel} from "@nestjs/mongoose";
import {EventStatusEnum} from "../../enums/event-status.enum";

@Injectable()
export class EventRepositoryMongo implements IEventRepository {

    constructor(@InjectModel(EventEntity.name) private readonly model: Model<EventDocument>) {
    }

    async findByEventId(eventId: string): Promise<EventEntity | null> {
        return this.model.findOne({eventId}).exec();
    }

    async save(event: EventEntity): Promise<EventEntity> {
        const createdEvent = new this.model(event);
        return createdEvent.save();
    }

    async updateStatus(eventId: string, eventStatus: EventStatusEnum): Promise<void> {
        await this.model.updateOne(
            {eventId},
            {$set: {status: eventStatus, processedAt: new Date()}}
        ).exec();
    }
}