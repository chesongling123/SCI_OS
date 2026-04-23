import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, BookOpen } from 'lucide-react';
import type { CreateTaskDto, UpdateTaskDto, TaskResponseDto } from '@phd/shared-types';
import { TaskStatus } from '@phd/shared-types';
import { useReferences } from '../../hooks/useReferences';

interface TaskDialogProps {
  open: boolean;
  onClose: () => void;
  onCreate: (dto: CreateTaskDto) => void;
  onUpdate?: (id: string, dto: UpdateTaskDto) => void;
  initialStatus?: TaskStatus;
  editTask?: TaskResponseDto | null;
  prefillReferenceId?: string;
}

export default function TaskDialog({ open, onClose, onCreate, onUpdate, initialStatus = TaskStatus.TODO, editTask, prefillReferenceId = '' }: TaskDialogProps) {
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState(4);
  const [referenceId, setReferenceId] = useState<string>('');
  const { data: refsData } = useReferences({ limit: 100 });
  const references = refsData?.data ?? [];

  // open 或 editTask 变化时同步表单
  const hasPrefilledRef = useRef(false);
  useEffect(() => {
    if (open) {
      if (editTask) {
        setTitle(editTask.title);
        setPriority(editTask.priority);
        setReferenceId(editTask.referenceId ?? '');
        hasPrefilledRef.current = false;
      } else {
        setTitle(prefillReferenceId && !hasPrefilledRef.current
          ? `精读：${references.find(r => r.id === prefillReferenceId)?.title ?? ''}`
          : (hasPrefilledRef.current ? title : ''));
        setPriority(4);
        if (prefillReferenceId && !hasPrefilledRef.current) {
          setReferenceId(prefillReferenceId);
          hasPrefilledRef.current = true;
        } else if (!prefillReferenceId) {
          setReferenceId('');
          hasPrefilledRef.current = false;
        }
      }
    }
  }, [open, editTask, prefillReferenceId]);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    const dto: CreateTaskDto | UpdateTaskDto = {
      title: title.trim(),
      priority,
      ...(referenceId ? { referenceId } : {}),
    };
    if (editTask && onUpdate) {
      onUpdate(editTask.id, dto as UpdateTaskDto);
    } else {
      onCreate({ ...dto, status: initialStatus } as CreateTaskDto);
    }
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full max-w-md rounded-2xl p-6"
        style={{
          background: 'var(--glass-bg)',
          backdropFilter: 'blur(24px) saturate(1.3)',
          WebkitBackdropFilter: 'blur(24px) saturate(1.3)',
          border: '1px solid var(--glass-border)',
          borderTopColor: 'var(--glass-border-highlight)',
          boxShadow: 'var(--glass-inset), var(--glass-shadow-strong)',
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            {editTask ? '编辑任务' : '新建任务'}
          </h2>
          <button
            onClick={onClose}
            className="transition-colors"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'; }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>任务标题</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="输入任务标题..."
              className="w-full px-3 py-2 rounded-xl text-sm outline-none transition-colors"
              style={{
                background: 'var(--glass-bg)',
                border: '1px solid var(--glass-border)',
                color: 'var(--text-primary)',
                boxShadow: 'var(--glass-inset)',
              }}
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>优先级</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className="flex-1 py-2 rounded-lg text-xs font-medium transition-all"
                  style={{
                    background: priority === p
                      ? p === 1 ? 'oklch(0.55 0.15 25)'
                        : p === 2 ? 'oklch(0.6 0.12 55)'
                        : p === 3 ? 'oklch(0.55 0.1 230)'
                        : 'oklch(0.5 0.05 280)'
                      : 'var(--glass-bg)',
                    border: '1px solid var(--glass-border)',
                    color: priority === p ? '#fff' : 'var(--text-muted)',
                  }}
                >
                  P{p}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
              <span className="inline-flex items-center gap-1">
                <BookOpen className="w-3.5 h-3.5" />
                关联文献（可选）
              </span>
            </label>
            <select
              value={referenceId}
              onChange={(e) => setReferenceId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-sm outline-none transition-colors"
              style={{
                background: 'var(--glass-bg)',
                border: '1px solid var(--glass-border)',
                color: 'var(--text-primary)',
                boxShadow: 'var(--glass-inset)',
              }}
            >
              <option value="">不关联文献</option>
              {references.map((ref) => (
                <option key={ref.id} value={ref.id}>
                  {ref.title}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all"
              style={{
                background: 'var(--glass-bg)',
                border: '1px solid var(--glass-border)',
                color: 'var(--text-secondary)',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = 'var(--glass-bg-hover)';
                (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = 'var(--glass-bg)';
                (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)';
              }}
            >
              取消
            </button>
            <button
              type="submit"
              disabled={!title.trim()}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50"
              style={{
                background: 'oklch(0.28 0.02 60)',
                boxShadow: '0 1px 0 rgba(255,255,255,0.15) inset',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = 'oklch(0.32 0.025 60)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = 'oklch(0.28 0.02 60)';
              }}
            >
              {editTask ? '保存' : '创建'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
