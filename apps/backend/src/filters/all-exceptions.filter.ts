import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

/**
 * 全局异常过滤器
 * 统一所有异常的响应格式为 { message: string, statusCode: number }
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const rawMessage = exception instanceof Error ? exception.message : String(exception);
    const message =
      exception instanceof HttpException
        ? exception.message
        : '服务器内部错误';

    // 非 HTTP 异常输出原始错误到控制台，便于调试
    if (!(exception instanceof HttpException)) {
      console.error('[AllExceptionsFilter] 原始错误:', rawMessage);
    }

    response.status(status).json({
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
    });
  }
}
