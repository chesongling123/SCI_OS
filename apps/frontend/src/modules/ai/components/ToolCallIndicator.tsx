import { Loader2, Check, Database, Calendar, Timer, CheckSquare, BookOpen, FileText, Search, PenLine, AlertTriangle } from 'lucide-react';
import type { ToolCallInfo } from '../types/ai.types';

interface ToolCallIndicatorProps {
  calls: ToolCallInfo[];
}

/**
 * 工具调用图标映射（按工具名前缀或完整名）
 */
function getToolIcon(toolName: string) {
  if (toolName.includes('pomodoro') || toolName.includes('focus') || toolName.includes('session')) {
    return <Timer className="w-3.5 h-3.5" />;
  }
  if (toolName.includes('task')) {
    return <CheckSquare className="w-3.5 h-3.5" />;
  }
  if (toolName.includes('calendar') || toolName.includes('event')) {
    return <Calendar className="w-3.5 h-3.5" />;
  }
  if (toolName.includes('reference') || toolName.includes('literature') || toolName.includes('doi')) {
    return <BookOpen className="w-3.5 h-3.5" />;
  }
  if (toolName.includes('note')) {
    return <FileText className="w-3.5 h-3.5" />;
  }
  if (toolName.includes('search')) {
    return <Search className="w-3.5 h-3.5" />;
  }
  if (toolName.includes('create') || toolName.includes('update')) {
    return <PenLine className="w-3.5 h-3.5" />;
  }
  return <Database className="w-3.5 h-3.5" />;
}

/**
 * 工具调用状态可视化组件
 * 显示 AI 正在调用哪些工具及其状态
 */
export function ToolCallIndicator({ calls }: ToolCallIndicatorProps) {
  return (
    <div className="space-y-1 my-1">
      {calls.map((call, i) => {
        const icon = getToolIcon(call.tool);
        const toolName = call.tool;

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
