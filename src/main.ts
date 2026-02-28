import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, VersioningType } from "@nestjs/common";
import { NestExpressApplication } from '@nestjs/platform-express';
import { GlobalExceptionFilter } from "./modules/shared/filters/global-exception.filter";

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

    app.useGlobalFilters(new GlobalExceptionFilter());
    app.enableShutdownHooks();

    await app.listen(process.env.PORT || 3000, '0.0.0.0');
    console.log(`Application is running on: ${await app.getUrl()}`);
}

bootstrap();
