import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import {DocumentBuilder, SwaggerModule} from "@nestjs/swagger";
import {VERSION_NEUTRAL, VersioningType} from "@nestjs/common";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);



  // config swagger
  const config = new DocumentBuilder()
      .setTitle('Resilient Event Orchestration Gateway')
      .setDescription('API for ingesting and processing events')
      .setVersion('1.0')
      .addTag('events-gateway')
      .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);

  // api-version
  app.enableVersioning({
    type: VersioningType.URI
  });

  await app.listen(process.env.PORT || 3000, '0.0.0.0');
}
bootstrap();
