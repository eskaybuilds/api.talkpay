import { Module } from '@nestjs/common';
import { LoggerService } from './logger.service';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';

const isLocal = ['local', 'development'].includes(process.env.NODE_ENV ?? '');

@Module({
  imports: [
    PinoLoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL ?? (isLocal ? 'debug' : 'info'),
        transport: isLocal
          ? { target: 'pino-pretty', options: { singleLine: true } }
          : undefined,
        redact: ['req.headers.authorization', 'req.headers.cookie'],
        autoLogging: {
          ignore: (req) => req.url === '/health',
        },
      },
    }),
  ],
  providers: [LoggerService],
  exports: [LoggerService],
})
export class LoggerModule {}
