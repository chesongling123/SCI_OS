/**
 * JWT Payload 接口
 */
export interface JwtPayload {
  sub: string; // userId
  email: string;
  iat: number;
  exp: number;
}

/**
 * OpenClaw WebSocket 消息格式（JSON-RPC 2.0 简化）
 */
export interface OpenClawRequest {
  type: 'req';
  id: string;
  method: string;
  params?: Record<string, unknown>;
}

export interface OpenClawResponse {
  type: 'res';
  id: string;
  ok: boolean;
  payload?: unknown;
  error?: string;
}

export interface OpenClawEvent {
  type: 'event';
  event: string;
  payload?: unknown;
  seq?: number;
}

/**
 * 液态玻璃主题配置
 */
export interface GlassTheme {
  glassBg: string;
  glassBgHover: string;
  glassBorder: string;
  glassBorderHighlight: string;
  glassShadow: string;
  glassShadowStrong: string;
  glassInset: string;
}
