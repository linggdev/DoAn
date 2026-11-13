import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { DomainError } from '../domain/domain-error';

@Catch()
export class DomainExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();

    if (exception instanceof DomainError) {
      return res.status(exception.status).json({
        statusCode: exception.status,
        code: exception.code,
        message: exception.message,
        details: exception.details ?? null,
      });
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      const message =
        typeof body === 'string'
          ? body
          : (body as Record<string, unknown>).message ?? exception.message;
      const code =
        typeof body === 'object' && body !== null && 'code' in body
          ? (body as Record<string, unknown>).code
          : status === HttpStatus.UNAUTHORIZED
            ? 'AUTH_UNAUTHORIZED'
            : status === HttpStatus.FORBIDDEN
              ? 'AUTH_FORBIDDEN'
              : 'HTTP_ERROR';
      return res.status(status).json({
        statusCode: status,
        code,
        message: Array.isArray(message) ? message.join('; ') : String(message),
      });
    }

    const err = exception as Error;
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      code: 'INTERNAL_ERROR',
      message: err?.message || 'Lỗi máy chủ nội bộ',
    });
  }
}

