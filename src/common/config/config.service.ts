import { Injectable } from '@nestjs/common';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { join } from 'path';

export enum EnvironmentKeys {
  NODE_ENV = 'NODE_ENV',
  PORT = 'PORT',
  DATABASE_HOST = 'DATABASE_HOST',
  DATABASE_PORT = 'DATABASE_PORT',
  DATABASE_USERNAME = 'DATABASE_USERNAME',
  DATABASE_PASSWORD = 'DATABASE_PASSWORD',
  DATABASE_NAME = 'DATABASE_NAME',
  DATABASE_SYNC = 'DATABASE_SYNC',
}

@Injectable()
export class ConfigService {
  private get(key: EnvironmentKeys): string {
    const value = process.env[key];
    if (!value) {
      throw new Error(`Missing environment variable: ${key}`);
    }
    return value;
  }

  getNodeEnv(): string {
    return this.get(EnvironmentKeys.NODE_ENV);
  }

  getAppPort(): number {
    return parseInt(process.env[EnvironmentKeys.PORT] ?? '4000', 10);
  }

  getDatabaseHost(): string {
    return this.get(EnvironmentKeys.DATABASE_HOST);
  }

  getDatabasePort(): number {
    return parseInt(process.env[EnvironmentKeys.DATABASE_PORT] ?? '5432', 10);
  }

  getDatabaseUsername(): string {
    return this.get(EnvironmentKeys.DATABASE_USERNAME);
  }

  getDatabasePassword(): string {
    return this.get(EnvironmentKeys.DATABASE_PASSWORD);
  }

  getDatabaseName(): string {
    return this.get(EnvironmentKeys.DATABASE_NAME);
  }

  // Sync is only ever honoured on NODE_ENV=local; migrations own the schema everywhere else.
  getDatabaseSync(): boolean {
    return (
      process.env[EnvironmentKeys.DATABASE_SYNC] === 'true' &&
      this.getNodeEnv().toLowerCase() === 'local'
    );
  }

  getTypeOrmConfig(): TypeOrmModuleOptions {
    return {
      type: 'postgres',
      host: this.getDatabaseHost(),
      port: this.getDatabasePort(),
      username: this.getDatabaseUsername(),
      password: this.getDatabasePassword(),
      database: this.getDatabaseName(),
      synchronize: this.getDatabaseSync(),
      autoLoadEntities: true,
      logging: false,
      migrationsRun: false,
      migrationsTableName: 'migrations',
      migrations: [join(__dirname, '../../../database/migrations/*{.ts,.js}')],
      entities: [join(__dirname, '../../**/*.entity{.ts,.js}')],
      extra: {
        max: 20,
        idleTimeoutMillis: 5000,
      },
    };
  }
}
