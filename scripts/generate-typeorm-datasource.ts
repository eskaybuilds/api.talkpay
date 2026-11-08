import 'dotenv/config';
import { writeFileSync } from 'fs';
import { ConfigService } from '../src/common/config/config.service';

// Writes ormconfig.ts (gitignored) so the TypeORM CLI uses the exact same
// connection + migration settings as the running app.
const configService = new ConfigService();

const content = `
import { DataSource, DataSourceOptions } from 'typeorm';

export const dataSourceOptions = ${JSON.stringify(
  configService.getTypeOrmConfig(),
  null,
  2,
)};

export const dataSource = new DataSource(dataSourceOptions as DataSourceOptions);
export default dataSourceOptions;
`;

writeFileSync('ormconfig.ts', content);
