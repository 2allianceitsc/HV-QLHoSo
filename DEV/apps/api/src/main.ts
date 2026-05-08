// BigInt is not JSON-serializable by default; convert to Number for API responses.
// VND amounts fit safely within Number.MAX_SAFE_INTEGER (2^53-1 ≈ 9 quadrillion đồng).
(BigInt.prototype as unknown as { toJSON: () => number }).toJSON = function () {
  return Number(this);
};

import { notifyGoogleChat } from './common/utils/notify';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const cookieParser = require('cookie-parser') as () => ReturnType<typeof import('cookie-parser')>;
import { AppModule } from './app.module';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { json, urlencoded } from 'express';
import { ErrorLogService } from './error-log/error-log.service';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  const isProd = process.env.NODE_ENV === 'production';

  // Trust proxy is required so rate limiting and IP logging see the real client IP instead of Railway's Edge proxy IP.
  app.set('trust proxy', true);

  // CORS — only needed in dev (Vite proxy handles it in prod)
  if (!isProd) {
    app.enableCors({
      origin: process.env.CORS_ORIGIN ?? 'http://localhost:5391',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    });
  }

  // Cookie parser
  app.use(cookieParser());

  // Increase payload limits for Base64 image uploads
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ extended: true, limit: '50mb' }));

  // Global prefix
  app.setGlobalPrefix('api');

  // Global pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global interceptors
  app.useGlobalInterceptors(new ResponseInterceptor());

  // Swagger — always enabled (available at /api/docs)
  const config = new DocumentBuilder()
    .setTitle('HV QuyTrinhDuyetHoSo API')
    .setDescription('Document Approval Workflow — full API reference')
    .setVersion('1.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'JWT')
    .addCookieAuth('access_token', { type: 'apiKey', in: 'cookie', name: 'access_token' }, 'Cookie')
    .addServer(`http://localhost:${process.env.PORT ?? 3028}`, 'Local')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'list',
      filter: true,
      showRequestDuration: true,
    },
  });

  const port = process.env.PORT ?? 3028;
  await app.listen(port, '0.0.0.0');

  console.log(`HV QTHS API running on http://localhost:${port}`);
  console.log(`Swagger docs: http://localhost:${port}/api/docs`);

  // ── Process-level exception hooks ───────────────────────────────────────────
  // HttpExceptionFilter catches errors inside NestJS request/response cycle.
  // These hooks catch anything that escapes it: async fire-and-forget code,
  // background tasks, etc.
  const processLogger = new Logger('process');
  const errorLogService = app.get(ErrorLogService);

  process.on('unhandledRejection', (reason: unknown) => {
    const message = reason instanceof Error ? reason.message : String(reason);
    const stack   = reason instanceof Error ? reason.stack  : undefined;
    processLogger.error('Unhandled Rejection', stack ?? message);
    void errorLogService.log({ source: 'BACKEND', statusCode: 500, message, stack });
  });

  process.on('uncaughtException', (err: Error) => {
    processLogger.error('Uncaught Exception', err.stack);
    // Log then exit — staying alive after uncaughtException is unsafe
    void errorLogService.log({ source: 'BACKEND', statusCode: 500, message: err.message, stack: err.stack })
      .finally(() => process.exit(1));
  });
}

bootstrap().catch(async (err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  await notifyGoogleChat(
    `🚨 *HV-QTHHS API — Startup FAILED* (${process.env.RAILWAY_ENVIRONMENT ?? 'unknown env'})\n\`\`\`\n${message}\n\`\`\``,
  );
  console.error('Bootstrap failed:', err);
  process.exit(1);
});
