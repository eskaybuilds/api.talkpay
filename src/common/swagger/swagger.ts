import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { version } from '../../../package.json';

export const SWAGGER_PATH = 'docs';
export const OPENAPI_JSON_PATH = `${SWAGGER_PATH}/openapi.json`;

export function setupSwagger(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle('TalkPay API')
    .setDescription('TalkPay API (Korapay sandbox, TEST MODE ONLY)')
    .setVersion(version)
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);

  // The JSON spec at /docs/openapi.json is what mobile's Orval codegen reads.
  SwaggerModule.setup(SWAGGER_PATH, app, document, {
    jsonDocumentUrl: OPENAPI_JSON_PATH,
    swaggerOptions: {
      persistAuthorization: true,
    },
  });
}
