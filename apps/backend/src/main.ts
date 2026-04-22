import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 全局异常过滤器
  app.useGlobalFilters(new AllExceptionsFilter());

  // 全局请求校验
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
  }));

  // API 版本前缀
  app.setGlobalPrefix('api/v1');

  // CORS（开发环境宽松，生产环境需配置白名单）
  app.enableCors({
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
  });

  // Swagger 文档
  const config = new DocumentBuilder()
    .setTitle('PhD_OS API')
    .setDescription('AI 驱动的博士科研工作台 —— 后端 API 文档')
    .setVersion('0.0.1')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.BACKEND_PORT || 3000;
  await app.listen(port);

  console.log(`🚀 后端服务已启动: http://localhost:${port}`);
  console.log(`📚 Swagger 文档: http://localhost:${port}/api/docs`);
  console.log(`🔌 OpenClaw Gateway: ws://localhost:18789`);
}

bootstrap();
