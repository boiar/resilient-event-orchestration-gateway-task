import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { ShipmentDocument, ShipmentEntity } from "../../entities/shipment.entity";
import { IShipmentRepository } from "../shipment-repo.interface";

@Injectable()
export class ShipmentRepositoryMongo implements IShipmentRepository {
    constructor(
        @InjectModel(ShipmentEntity.name)
        private readonly shipmentModel: Model<ShipmentDocument>,
    ) { }

    async findByShipmentId(shipmentId: string): Promise<ShipmentEntity | null> {
        return this.shipmentModel.findOne({ shipmentId }).exec();
    }

    async save(shipment: ShipmentEntity): Promise<ShipmentEntity> {
        return this.shipmentModel.findOneAndUpdate(
            { shipmentId: shipment.shipmentId },
            { $set: shipment },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        ).exec();
    }
}
