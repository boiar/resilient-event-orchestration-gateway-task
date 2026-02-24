import { registerAs } from '@nestjs/config';

export default registerAs('queue', () => ({
    workerPrefetch: parseInt(process.env.WORKER_PREFETCH ?? '10', 10),
    maxRetries: parseInt(process.env.WORKER_MAX_RETRIES ?? '3', 10),
    routingServiceDelayMs: parseInt(process.env.ROUTING_SERVICE_DELAY_MS ?? '2000', 10),
}));