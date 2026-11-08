import { ConfigService } from './config.service';

describe('ConfigService', () => {
  const originalEnv = process.env;
  let service: ConfigService;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      NODE_ENV: 'local',
      DATABASE_HOST: 'localhost',
      DATABASE_USERNAME: 'talkpay',
      DATABASE_PASSWORD: 'talkpay',
      DATABASE_NAME: 'talkpay',
    };
    service = new ConfigService();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('throws when a required variable is missing', () => {
    delete process.env.DATABASE_HOST;
    expect(() => service.getDatabaseHost()).toThrow(
      'Missing environment variable: DATABASE_HOST',
    );
  });

  it('defaults the port and database port', () => {
    delete process.env.PORT;
    delete process.env.DATABASE_PORT;
    expect(service.getAppPort()).toBe(4000);
    expect(service.getDatabasePort()).toBe(5432);
  });

  it.each([
    ['local', 'true', true],
    ['local', 'false', false],
    ['development', 'true', false],
    ['test', 'true', false],
    ['production', 'true', false],
  ])(
    'NODE_ENV=%s DATABASE_SYNC=%s -> synchronize %s',
    (nodeEnv, sync, expected) => {
      process.env.NODE_ENV = nodeEnv;
      process.env.DATABASE_SYNC = sync;
      expect(service.getTypeOrmConfig()).toMatchObject({
        synchronize: expected,
        migrationsRun: false,
      });
    },
  );
});
