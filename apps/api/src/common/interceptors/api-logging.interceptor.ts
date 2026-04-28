import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { Request } from 'express';
import { ApiLogService, serializeBody } from '../../system/api-log/api-log.service';

const SKIP_PATHS = ['/api/health', '/favicon.ico'];

@Injectable()
export class ApiLoggingInterceptor implements NestInterceptor {
  constructor(private readonly apiLogService: ApiLogService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();

    const req = context.switchToHttp().getRequest<Request>();
    const { method, url, body, query, headers } = req;

    // Skip health checks and static assets
    const path = url.split('?')[0];
    if (SKIP_PATHS.some((p) => path.startsWith(p))) return next.handle();

    const startTime = Date.now();

    // Extract user from JWT payload (populated by JwtAuthGuard)
    const user = (req as Request & { user?: { sub?: string; username?: string } }).user;

    const ipAddress =
      (headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ??
      req.socket?.remoteAddress;

    const requestBody = serializeBody(body);
    const queryParams =
      query && Object.keys(query).length > 0 ? serializeBody(query) as string : undefined;
    const clientInfo = headers['x-client-info'] as string | undefined;

    const logRequest = (statusCode: number) => {
      const durationMs = Date.now() - startTime;
      // Fire-and-forget — don't block the response
      this.apiLogService.create({
        method,
        url: path,
        statusCode,
        durationMs,
        userId: user?.sub,
        userName: user?.username,
        ipAddress,
        userAgent: headers['user-agent'],
        requestBody,
        queryParams,
        clientInfo,
      }).catch(() => { /* never let logging crash the app */ });
    };

    const res = context.switchToHttp().getResponse<{ statusCode: number }>();

    return next.handle().pipe(
      tap(() => logRequest(res.statusCode)),
      catchError((err: unknown) => {
        const code = (err as { status?: number })?.status ?? 500;
        logRequest(code);
        return throwError(() => err);
      }),
    );
  }
}
