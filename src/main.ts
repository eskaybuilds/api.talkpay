import { NestFactory } from '@nestjs/core';
import { Logger as NestLogger } from '@nestjs/common';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';
import { ConfigService } from './common/config/config.service';
import { setupSwagger } from './common/swagger/swagger';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
    {
      cors: {
        origin: '*',
        methods: ['POST', 'PATCH', 'GET', 'PUT', 'OPTIONS', 'HEAD', 'DELETE'],
      },
      bufferLogs: true,
    },
  );

  const logger = app.get(Logger);
  const config = app.get(ConfigService);

  app.useLogger(logger);
  configureApp(app);
  setupSwagger(app);
  app.enableShutdownHooks();

  const port = config.getAppPort();
  await app.listen(port, '0.0.0.0');
  logger.log(`App started on port ${port}`);
}

bootstrap().catch((error) => {
  const fallbackLogger = new NestLogger('BootstrapError');
  fallbackLogger.error('Error during bootstrap', error);
  process.exit(1);
});
