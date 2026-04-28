import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
  Injectable,
} from '@nestjs/common';

const SENSITIVE_KEYS = new Set([
  'password', 'newPassword', 'oldPassword', 'confirmPassword',
  'token', 'accessToken', 'refreshToken', 'secret', 'authorization',
]);

function sanitizeBody(body: unknown): string | undefined {
  if (!body || typeof body !== 'object' || Object.keys(body).length === 0) return undefined;
  const sanitized: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body as Record<string, unknown>)) {
    sanitized[k] = SENSITIVE_KEYS.has(k.toLowerCase()) ? '[REDACTED]' : v;
  }
  return JSON.stringify(sanitized);
}
import { Request, Response } from 'express';
import { ApiResponse } from '@shared/types/api-response.type';
import { ErrorLogService } from '../../error-log/error-log.service';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  constructor(private readonly errorLogService: ErrorLogService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let code: string | undefined;
    let errors: string[] = [];
    let stack: string | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const resp = exceptionResponse as Record<string, unknown>;
        message = (resp['message'] as string) ?? exception.message;
        code = resp['code'] as string | undefined;

        if (Array.isArray(resp['message'])) {
          errors = resp['message'] as string[];
          message = 'Validation failed';
        }
      }
      stack = exception.stack;
    } else if (exception instanceof Error) {
      message = exception.message;
      stack = exception.stack;
      this.logger.error(
        `Unhandled error: ${exception.message}`,
        exception.stack,
        `${request.method} ${request.url}`,
      );
    }

    // Log + notify only for server errors (5xx) — 4xx are expected client errors
    if (status >= 500) {
      const ipAddress =
        (request.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ??
        request.socket.remoteAddress;
      const userId = (request as Request & { user?: { id: string } }).user?.id;

      void this.errorLogService.log({
        source: 'BACKEND',
        statusCode: status,
        method: request.method,
        url: request.url,
        message,
        stack,
        userId,
        userAgent: request.headers['user-agent'],
        ipAddress,
        requestBody: sanitizeBody(request.body),
      });
    }

    // SPA fallback: non-API 404s serve index.html so React Router handles routing
    if (status === HttpStatus.NOT_FOUND && !request.path.startsWith('/api')) {
      const indexPath = path.join(process.cwd(), 'apps/api/public', 'index.html');
      if (fs.existsSync(indexPath)) {
        return response.sendFile(indexPath);
      }
    }

    const body: ApiResponse<null> = {
      success: false,
      message,
      code,
      errors: errors.length > 0 ? errors : undefined,
    };

    response.status(status).json(body);
  }
}
