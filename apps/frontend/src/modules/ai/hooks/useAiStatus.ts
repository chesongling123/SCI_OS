import { useState, useEffect, useCallback } from 'react';

type AiStatus = 'checking' | 'available' | 'unavailable';

const HEALTH_URL = '/api/v1/ai/health';
const CHECK_INTERVAL = 30000; // 30 秒轮询

/**
 * AI 服务状态检测 Hook
 * 检测后端 LLM API 是否可用
 */
export function useAiStatus() {
  const [status, setStatus] = useState<AiStatus>('checking');

  const check = useCallback(async () => {
    try {
      const res = await fetch(HEALTH_URL, { signal: AbortSignal.timeout(5000) });
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'available') {
          setStatus('available');
        } else {
          setStatus('unavailable');
        }
      } else {
        setStatus('unavailable');
      }
    } catch {
      setStatus('unavailable');
    }
  }, []);

  useEffect(() => {
    check();
    const interval = setInterval(check, CHECK_INTERVAL);
    return () => clearInterval(interval);
  }, [check]);

  return { status, check };
}
