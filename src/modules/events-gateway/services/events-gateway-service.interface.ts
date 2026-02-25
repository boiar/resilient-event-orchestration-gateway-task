import {ReceiveEventDto} from '../dtos/receive-event.dto';

export interface IEventsGatewayService {
    eventsEnqueue(dto: ReceiveEventDto): Promise<{ status: string }>;

    processQueuedEvent(dto: ReceiveEventDto): Promise<void>;
}