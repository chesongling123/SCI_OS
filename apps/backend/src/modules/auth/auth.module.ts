import { Module } from '@nestjs/common';

/**
 * 认证模块（Phase 1 预留骨架，Phase 2 实现 JWT + OAuth2）
 * 职责：JWT 签发/校验、OAuth2 社交登录、Refresh Token 轮转
 */
@Module({
  controllers: [], // AuthController
  providers: [],   // AuthService, JwtStrategy
})
export class AuthModule {}
