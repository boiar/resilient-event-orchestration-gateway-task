import {ShipmentEntity} from "../entities/shipment.entity";

export interface IShipmentRepository {
    findByShipmentId(shipmentId: string): Promise<ShipmentEntity | null>;

    save(shipment: ShipmentEntity): Promise<ShipmentEntity>;
}
