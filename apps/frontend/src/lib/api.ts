import { useAuthStore } from '../stores/auth';

/**
 * 获取带认证头的请求配置
 * 自动从 auth store 读取 token 并添加到 Authorization header
 */
export function authHeaders(contentType = true): Record<string, string> {
  const token = useAuthStore.getState().token;
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (contentType) {
    headers['Content-Type'] = 'application/json';
  }
  return headers;
}
