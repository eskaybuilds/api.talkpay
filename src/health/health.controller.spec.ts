import { Test, TestingModule } from '@nestjs/testing';
import { HealthCheckService, TypeOrmHealthIndicator } from '@nestjs/terminus';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  let controller: HealthController;
  const health = { check: jest.fn() };
  const db = { pingCheck: jest.fn() };

  beforeEach(async () => {
    jest.resetAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: HealthCheckService, useValue: health },
        { provide: TypeOrmHealthIndicator, useValue: db },
      ],
    }).compile();

    controller = module.get(HealthController);
  });

  it('pings the database as part of the health check', async () => {
    health.check.mockImplementation(
      async (indicators: Array<() => Promise<unknown>>) => {
        await Promise.all(indicators.map((indicator) => indicator()));
        return { status: 'ok' };
      },
    );
    db.pingCheck.mockResolvedValue({ database: { status: 'up' } });

    await expect(controller.check()).resolves.toEqual({ status: 'ok' });
    expect(db.pingCheck).toHaveBeenCalledWith('database');
  });
});
