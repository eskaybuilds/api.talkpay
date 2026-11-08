import { ValidationPipe, VersioningType } from '@nestjs/common';
import { NestFastifyApplication } from '@nestjs/platform-fastify';

// Shared by main.ts and the e2e tests so both run the same pipeline.
export function configureApp(app: NestFastifyApplication) {
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      forbidUnknownValues: true,
      transform: true,
    }),
  );
  app.enableVersioning({
    type: VersioningType.URI,
  });
}
