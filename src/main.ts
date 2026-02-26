import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, VersioningType } from "@nestjs/common";
import { MicroserviceOptions, Transport } from "@nestjs/microservices";
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
    // Specify NestExpressApplication to get rawBody support
    const app = await NestFactory.create<NestExpressApplication>(AppModule, {
        logger: process.env.NODE_ENV === 'production'
            ? ['error', 'warn']
            : ['log', 'error', 'warn', 'debug', 'verbose'],
        rawBody: true, // Critical for fast HMAC validation
    });

    // connect to rabbitMQ
    app.connectMicroservice<MicroserviceOptions>({
        transport: Transport.RMQ,
        options: {
            urls: [process.env.RABBITMQ_URL || 'amqp://fincart:fincart_pass@rabbitmq:5672'],
            queue: 'events',
            queueOptions: { durable: true },
            noAck: false,
            prefetchCount: parseInt(process.env.WORKER_PREFETCH ?? '10', 10),
            socketOptions: {
                keepAlive: true,
                heartbeatIntervalInSeconds: 60,
            },
        },
    });

    // api-version
    app.enableVersioning({
        type: VersioningType.URI
    });

    // Disable body parsing overhead for large requests if needed, 
    // but here we just need rawBody.

    app.useGlobalPipes(new ValidationPipe({
        whitelist: true,
        transform: false,
        disableErrorMessages: true, // Small perf gain in production
    }));

    await app.startAllMicroservices();

    await app.listen(process.env.PORT || 3000, '0.0.0.0');
    console.log(`Application is running on: ${await app.getUrl()}`);
}

bootstrap();
