import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { ReceiveEventDto } from '../dtos/receive-event.dto';
import { EventsGatewayService } from '../services/implementation/events-gateway.service';

@Processor('events-processing', { concurrency: 20 })
export class EventsProcessor extends WorkerHost {
    private readonly logger = new Logger(EventsProcessor.name);

    constructor(private readonly eventsGatewayService: EventsGatewayService) {
        super();
    }

    async process(job: Job<ReceiveEventDto, any, string>): Promise<void> {
        const { name, data: dto } = job;

        if (name === 'process-event') {
            this.logger.log(`Processing event: ${dto.eventId}`);
            await this.eventsGatewayService.processQueuedEvent(dto);
        }
    }

    @OnWorkerEvent('failed')
    async onJobFailed(job: Job<ReceiveEventDto>, error: Error) {
        if (job.attemptsMade >= (job.opts.attempts || 1)) {
            const dto = job.data;
            this.logger.error(
                `Dead letter received - ${job.attemptsMade} attempts: ${dto.eventId} | type: ${dto.type} | shipmentId: ${dto.shipmentId} | error: ${error.message}`,
            );

            // send alert (ex ->email)
        }
    }
}