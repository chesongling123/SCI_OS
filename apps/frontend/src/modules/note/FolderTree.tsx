import { useState, useCallback } from 'react';
import { Folder, FolderOpen, ChevronRight, ChevronDown, Plus, Trash2, Edit3, PanelLeftClose, PanelLeftOpen } from 'lucide-react';

export interface FolderNode {
  id: string;
  name: string;
  parentId: string | null;
}

interface FolderTreeProps {
  folders: FolderNode[];
  activeFolderId: string | null;
  onSelect: (folderId: string | null) => void;
  onCreate: (parentId: string | null) => void;
  onRename: (folder: FolderNode) => void;
  onDelete: (folder: FolderNode) => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

/**
 * 文件夹树组件
 * 支持展开/收起、新建、重命名、删除
 */
export function FolderTree({
  folders,
  activeFolderId,
  onSelect,
  onCreate,
  onRename,
  onDelete,
  collapsed = false,
  onToggleCollapse,
}: FolderTreeProps) {
  if (collapsed) {
    return (
      <div className="flex flex-col h-full items-center">
        <button
          onClick={onToggleCollapse}
          className="mt-2 w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
          style={{ color: 'var(--text-muted)' }}
          title="展开文件夹"
        >
          <PanelLeftOpen className="w-4 h-4" />
        </button>
      </div>
    );
  }
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; folder: FolderNode } | null>(null);

  const toggleExpand = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // 构建树结构
  const rootFolders = folders.filter((f) => f.parentId === null);

  const getChildren = (parentId: string) => folders.filter((f) => f.parentId === parentId);

  const renderFolder = (folder: FolderNode, depth = 0) => {
    const children = getChildren(folder.id);
    const isExpanded = expanded.has(folder.id);
    const isActive = activeFolderId === folder.id;

    return (
      <div key={folder.id}>
        <div
          className="group flex items-center gap-1 rounded-lg cursor-pointer transition-colors select-none"
          style={{
            paddingLeft: `${depth * 16 + 8}px`,
            paddingRight: '8px',
            paddingTop: '4px',
            paddingBottom: '4px',
            background: isActive ? 'var(--glass-bg-hover)' : 'transparent',
          }}
          onClick={() => onSelect(folder.id)}
          onContextMenu={(e) => {
            e.preventDefault();
            setContextMenu({ x: e.clientX, y: e.clientY, folder });
          }}
          onMouseEnter={(e) => {
            if (!isActive) (e.currentTarget as HTMLDivElement).style.background = 'var(--glass-bg)';
          }}
          onMouseLeave={(e) => {
            if (!isActive) (e.currentTarget as HTMLDivElement).style.background = 'transparent';
          }}
        >
          {children.length > 0 ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(folder.id);
              }}
              className="w-4 h-4 flex items-center justify-center shrink-0"
              style={{ color: 'var(--text-muted)' }}
            >
              {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            </button>
          ) : (
            <span className="w-4 shrink-0" />
          )}

          {isExpanded ? (
            <FolderOpen className="w-4 h-4 shrink-0" style={{ color: 'oklch(0.6 0.12 85)' }} />
          ) : (
            <Folder className="w-4 h-4 shrink-0" style={{ color: 'oklch(0.6 0.12 85)' }} />
          )}

          <span
            className="text-sm truncate flex-1"
            style={{ color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)' }}
          >
            {folder.name}
          </span>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onCreate(folder.id);
            }}
            className="opacity-0 group-hover:opacity-100 w-5 h-5 rounded flex items-center justify-center transition-opacity"
            style={{ color: 'var(--text-muted)' }}
            title="在文件夹内新建"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>

        {isExpanded && children.length > 0 && (
          <div>
            {children.map((child) => renderFolder(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* 头部 */}
      <div
        className="flex items-center justify-between px-3 py-2 border-b"
        style={{ borderColor: 'var(--glass-border)' }}
      >
        <h3 className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
          文件夹
        </h3>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onCreate(null)}
            className="w-5 h-5 rounded flex items-center justify-center transition-colors"
            style={{ color: 'var(--text-muted)' }}
            title="新建文件夹"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onToggleCollapse}
            className="w-5 h-5 rounded flex items-center justify-center transition-colors"
            style={{ color: 'var(--text-muted)' }}
            title="收起文件夹"
          >
            <PanelLeftClose className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 全部笔记 */}
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer mx-2 mt-2 transition-colors"
        style={{
          background: activeFolderId === null ? 'var(--glass-bg-hover)' : 'transparent',
        }}
        onClick={() => onSelect(null)}
        onMouseEnter={(e) => {
          if (activeFolderId !== null) (e.currentTarget as HTMLDivElement).style.background = 'var(--glass-bg)';
        }}
        onMouseLeave={(e) => {
          if (activeFolderId !== null) (e.currentTarget as HTMLDivElement).style.background = 'transparent';
        }}
      >
        <FileTextIcon className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
        <span className="text-sm" style={{ color: activeFolderId === null ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
          全部笔记
        </span>
      </div>

      {/* 文件夹列表 */}
      <div className="flex-1 overflow-y-auto py-1">
        {rootFolders.map((folder) => renderFolder(folder))}
      </div>

      {/* 右键菜单 */}
      {contextMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setContextMenu(null)}
          />
          <div
            className="fixed z-50 rounded-xl py-1 min-w-[120px]"
            style={{
              left: contextMenu.x,
              top: contextMenu.y,
              background: 'var(--glass-bg)',
              backdropFilter: 'blur(16px)',
              border: '1px solid var(--glass-border)',
              boxShadow: 'var(--glass-shadow)',
            }}
          >
            <button
              onClick={() => {
                onRename(contextMenu.folder);
                setContextMenu(null);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors"
              style={{ color: 'var(--text-secondary)' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--glass-bg-hover)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
            >
              <Edit3 className="w-3.5 h-3.5" />
              重命名
            </button>
            <button
              onClick={() => {
                onDelete(contextMenu.folder);
                setContextMenu(null);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors"
              style={{ color: 'var(--destructive)' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'oklch(0.55 0.15 25 / 0.1)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
            >
              <Trash2 className="w-3.5 h-3.5" />
              删除
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function FileTextIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
    >
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
    </svg>
  );
}
