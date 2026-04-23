import { FileText, Plus, Pin, Trash2, Clock, PanelLeftClose, PanelRightOpen } from 'lucide-react';
import type { NoteListItem } from './types/note.types';

interface NoteSidebarProps {
  notes: NoteListItem[];
  activeId: string | null;
  onSelect: (note: NoteListItem) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

/**
 * 笔记列表侧边栏
 * 显示笔记列表、新建按钮、笔记元信息
 */
export function NoteSidebar({ notes, activeId, onSelect, onCreate, onDelete, collapsed = false, onToggleCollapse }: NoteSidebarProps) {
  if (collapsed) {
    return (
      <div className="flex flex-col h-full items-center">
        <button
          onClick={onToggleCollapse}
          className="mt-2 w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
          style={{ color: 'var(--text-muted)' }}
          title="展开笔记列表"
        >
          <PanelRightOpen className="w-4 h-4" />
        </button>
      </div>
    );
  }
  return (
    <div className="flex flex-col h-full">
      {/* 头部 */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{ borderColor: 'var(--glass-border)' }}
      >
        <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          笔记
        </h2>
        <div className="flex items-center gap-1">
          <button
            onClick={onCreate}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
            style={{
              background: 'oklch(0.52 0.18 260 / 0.15)',
              color: 'oklch(0.7 0.15 260)',
            }}
            title="新建笔记"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            onClick={onToggleCollapse}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
            style={{ color: 'var(--text-muted)' }}
            title="收起笔记列表"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 列表 */}
      <div className="flex-1 overflow-y-auto">
        {notes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <FileText className="w-10 h-10 mb-3" style={{ color: 'var(--text-muted)' }} />
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              还没有笔记
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              点击上方 + 创建第一篇笔记
            </p>
          </div>
        ) : (
          <div className="py-1">
            {notes.map((note) => {
              const isActive = note.id === activeId;
              return (
                <div
                  key={note.id}
                  onClick={() => onSelect(note)}
                  className="group relative mx-2 mb-1 rounded-xl px-3 py-2.5 cursor-pointer transition-all duration-150"
                  style={{
                    background: isActive ? 'var(--glass-bg-hover)' : 'transparent',
                    border: isActive ? '1px solid var(--glass-border)' : '1px solid transparent',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      (e.currentTarget as HTMLDivElement).style.background = 'var(--glass-bg)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      (e.currentTarget as HTMLDivElement).style.background = 'transparent';
                    }
                  }}
                >
                  <div className="flex items-start gap-2">
                    <div className="mt-0.5 shrink-0">
                      {note.isPinned ? (
                        <Pin className="w-3.5 h-3.5" style={{ color: 'oklch(0.65 0.15 45)' }} />
                      ) : (
                        <FileText className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-sm font-medium truncate leading-tight"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {note.title || '无标题'}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        {note.tags.length > 0 && (
                          <div className="flex items-center gap-1 flex-wrap">
                            {note.tags.slice(0, 3).map((tag) => (
                              <span
                                key={tag}
                                className="text-[10px] px-1.5 py-0.5 rounded-md"
                                style={{
                                  background: 'oklch(0.52 0.18 260 / 0.1)',
                                  color: 'oklch(0.65 0.12 260)',
                                }}
                              >
                                {tag}
                              </span>
                            ))}
                            {note.tags.length > 3 && (
                              <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                                +{note.tags.length - 3}
                              </span>
                            )}
                          </div>
                        )}
                        <span className="text-[10px] flex items-center gap-0.5" style={{ color: 'var(--text-muted)' }}>
                          <Clock className="w-3 h-3" />
                          {formatRelativeTime(note.updatedAt)}
                        </span>
                      </div>
                    </div>
                    {/* 删除按钮 — 悬停显示 */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(note.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded-md transition-all shrink-0 mt-0.5"
                      style={{ color: 'var(--text-muted)' }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.color = 'var(--destructive)';
                        (e.currentTarget as HTMLButtonElement).style.background = 'oklch(0.55 0.15 25 / 0.1)';
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)';
                        (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                      }}
                      title="删除"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function formatRelativeTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffMin < 1) return '刚刚';
  if (diffMin < 60) return `${diffMin}分钟前`;
  if (diffHour < 24) return `${diffHour}小时前`;
  if (diffDay < 7) return `${diffDay}天前`;
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
}
