import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { ErrorResponse } from '../errors/error-response';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const status = this.getStatus(exception);

    response.status(status).json(this.getErrorResponse(exception, status));
  }

  private getStatus(exception: unknown) {
    if (exception instanceof HttpException) {
      return exception.getStatus();
    }

    return HttpStatus.INTERNAL_SERVER_ERROR;
  }

  private getErrorResponse(exception: unknown, status: number): ErrorResponse {
    if (!(exception instanceof HttpException)) {
      return {
        message: 'Internal server error',
        code: this.getStatusCode(status),
        details: {},
      };
    }

    const exceptionResponse = exception.getResponse();

    if (typeof exceptionResponse === 'string') {
      return {
        message: exceptionResponse,
        code: this.getStatusCode(status),
        details: {},
      };
    }

    const payload = exceptionResponse as Record<string, unknown>;
    const rawMessage = payload.message;

    return {
      message: this.getMessage(rawMessage, exception.message),
      code:
        typeof payload.code === 'string'
          ? payload.code
          : this.getStatusCode(status),
      details: this.getDetails(payload),
    };
  }

  private getMessage(rawMessage: unknown, fallback: string) {
    if (Array.isArray(rawMessage)) {
      return rawMessage.join('; ');
    }

    if (typeof rawMessage === 'string') {
      return rawMessage;
    }

    return fallback;
  }

  private getDetails(payload: Record<string, unknown>) {
    if (
      payload.details &&
      typeof payload.details === 'object' &&
      !Array.isArray(payload.details)
    ) {
      return payload.details as Record<string, unknown>;
    }

    if (Array.isArray(payload.message)) {
      return { errors: payload.message };
    }

    return {};
  }

  private getStatusCode(status: number) {
    return HttpStatus[status] ?? 'HTTP_ERROR';
  }
}
