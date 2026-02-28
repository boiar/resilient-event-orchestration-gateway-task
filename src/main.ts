import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, VersioningType } from "@nestjs/common";
import { NestExpressApplication } from '@nestjs/platform-express';
import { GlobalExceptionFilter } from "./modules/shared/filters/global-exception.filter";
import {DocumentBuilder, SwaggerModule} from "@nestjs/swagger";

async function bootstrap() {
    // Specify NestExpressApplication to get rawBody support
    const app = await NestFactory.create<NestExpressApplication>(AppModule, {
        logger: process.env.NODE_ENV === 'production'
            ? ['error', 'warn']
            : ['log', 'error', 'warn', 'debug', 'verbose'],
        rawBody: true,
    });

    // api-version
    app.enableVersioning({
        type: VersioningType.URI
    });


    app.useGlobalPipes(new ValidationPipe({
        whitelist: true,
        transform: false,
        disableErrorMessages: true,
    }));

    const config = new DocumentBuilder()
        .setTitle('Resilient Event Orchestration Gateway')
        .setDescription('High-concurrency async event gateway with idempotency')
        .setVersion('1.0')
        .addApiKey(
            { type: 'apiKey', name: 'x-hmac-signature', in: 'header' },
            'hmac-signature'
        )
        .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api-docs', app, document, {
        swaggerOptions: {
            persistAuthorization: true,
        },
    });

    app.useGlobalFilters(new GlobalExceptionFilter());
    app.enableShutdownHooks();

    await app.listen(process.env.PORT || 3000, '0.0.0.0');
    console.log(`Application is running on: ${await app.getUrl()}`);
}

bootstrap();
