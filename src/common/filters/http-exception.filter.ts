import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

interface StandardErrorResponse {
  statusCode: number;
  timestamp: string;
  path: string;
  message: string;
  errors?: string[];
}

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const statusCode = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    const body: StandardErrorResponse = {
      statusCode,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: 'Unexpected error',
    };

    if (typeof exceptionResponse === 'string') {
      body.message = exceptionResponse;
    } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
      const { message } = exceptionResponse as { message?: string | string[] };
      if (Array.isArray(message)) {
        body.message = 'Validation failed';
        body.errors = message;
      } else if (typeof message === 'string') {
        body.message = message;
      }
    }

    if (statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(`${request.method} ${request.url} -> ${statusCode}`, exception.stack);
    }

    response.status(statusCode).json(body);
  }
}
