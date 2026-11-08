import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from '@app/logger';
import { ConfigService } from './common/config/config.service';
import { ConfigModule as CustomConfigModule } from './common/config/config.module';
import { validationSchema } from './common/config/validation';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validationSchema,
    }),
    CustomConfigModule,
    TypeOrmModule.forRootAsync({
      imports: [CustomConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        configService.getTypeOrmConfig(),
    }),
    LoggerModule,
    HealthModule,
  ],
})
export class AppModule {}
