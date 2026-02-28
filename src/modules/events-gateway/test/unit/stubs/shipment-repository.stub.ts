import { IShipmentRepository } from '../../../repositories/shipment-repo.interface';
import { ShipmentEntity } from '../../../entities/shipment.entity';

export class ShipmentRepositoryStub implements IShipmentRepository {
    private store: ShipmentEntity[] = [];

    async save(shipment: ShipmentEntity): Promise<ShipmentEntity> {
        const index = this.store.findIndex(s => s.shipmentId === shipment.shipmentId);
        if (index !== -1) {
            this.store[index] = shipment;
        } else {
            this.store.push(shipment);
        }
        return shipment;
    }

    async findByShipmentId(shipmentId: string): Promise<ShipmentEntity | null> {
        return this.store.find(s => s.shipmentId === shipmentId) ?? null;
    }

    getStore(): ShipmentEntity[] {
        return this.store;
    }

    clear(): void {
        this.store = [];
    }
}
