import { Loader2, Check, Database, Calendar, Timer, CheckSquare, AlertTriangle } from 'lucide-react';
import type { ToolCallInfo } from '../types/ai.types';

interface ToolCallIndicatorProps {
  calls: ToolCallInfo[];
}

/**
 * 工具调用图标映射
 */
const toolIconMap: Record<string, React.ReactNode> = {
  'phd-pomodoro': <Timer className="w-3.5 h-3.5" />,
  'phd-task': <CheckSquare className="w-3.5 h-3.5" />,
  'phd-calendar': <Calendar className="w-3.5 h-3.5" />,
  default: <Database className="w-3.5 h-3.5" />,
};

/**
 * 工具调用状态可视化组件
 * 显示 AI 正在调用哪些 MCP 工具及其状态
 */
export function ToolCallIndicator({ calls }: ToolCallIndicatorProps) {
  return (
    <div className="space-y-1 my-1">
      {calls.map((call, i) => {
        const prefix = call.tool.split('/')[0];
        const icon = toolIconMap[prefix] || toolIconMap.default;
        const toolName = call.tool.split('/').pop() || call.tool;

        return (
          <div
            key={`${call.tool}-${i}`}
            className="flex items-center gap-2 text-xs rounded-lg px-2.5 py-1"
            style={{
              background: 'var(--glass-bg)',
              border: '1px solid var(--glass-border)',
              color: 'var(--text-muted)',
            }}
          >
            {icon}
            <span className="font-mono text-[11px]">{toolName}</span>
            <StatusIcon status={call.status} />
          </div>
        );
      })}
    </div>
  );
}

function StatusIcon({ status }: { status: ToolCallInfo['status'] }) {
  switch (status) {
    case 'running':
    case 'pending':
      return <Loader2 className="w-3 h-3 animate-spin ml-auto" />;
    case 'complete':
      return <Check className="w-3 h-3 ml-auto text-green-500" />;
    case 'error':
      return <AlertTriangle className="w-3 h-3 ml-auto text-red-400" />;
    default:
      return null;
  }
}
