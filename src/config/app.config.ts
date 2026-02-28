import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  webhookSecret: process.env.WEBHOOK_SECRET ?? 'change-me-in-production',
  routingServiceUrl: process.env.ROUTING_SERVICE_URL ?? 'http://localhost:3001/v1/routing-service',
}));