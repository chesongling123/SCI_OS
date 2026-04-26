import { useState } from 'react';
import { Folder, FolderOpen, ChevronRight, ChevronDown, Plus, BookOpen, X, Check } from 'lucide-react';
import type { ReferenceFolderResponseDto } from '@research/shared-types';

interface Props {
  folders: ReferenceFolderResponseDto[];
  selectedFolderId: string | null;
  onSelectFolder: (id: string | null) => void;
  onCreateFolder: (name: string, parentId?: string | null) => void;
}

export default function ReferenceFolderTree({ folders, selectedFolderId, onSelectFolder, onCreateFolder }: Props) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [creatingId, setCreatingId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');

  const rootFolders = folders.filter((f) => !f.parentId);
  const getChildren = (pid: string) => folders.filter((f) => f.parentId === pid);

  const toggle = (id: string) => {
    const n = new Set(expandedIds);
    if (n.has(id)) n.delete(id); else n.add(id);
    setExpandedIds(n);
  };

  const submitCreate = (parentId?: string | null) => {
    if (!newName.trim()) return;
    onCreateFolder(newName.trim(), parentId);
    setNewName('');
    setCreatingId(null);
  };

  const renderFolder = (f: ReferenceFolderResponseDto, depth = 0) => {
    const children = getChildren(f.id);
    const open = expandedIds.has(f.id);
    const sel = selectedFolderId === f.id;
    const creating = creatingId === f.id;

    return (
      <div key={f.id}>
        <div
          className={`flex items-center gap-1 px-2 py-1.5 rounded-lg cursor-pointer text-sm transition-all ${sel ? 'font-medium' : 'text-muted-foreground'}`}
          style={{ paddingLeft: `${8 + depth * 16}px`, background: sel ? 'var(--glass-bg-hover)' : 'transparent' }}
          onClick={() => onSelectFolder(sel ? null : f.id)}
        >
          {children.length > 0 ? (
            <button onClick={(e) => { e.stopPropagation(); toggle(f.id); }} className="p-0.5 rounded hover:bg-black/5">
              {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            </button>
          ) : <span className="w-4" />}
          {open ? <FolderOpen className="w-4 h-4 flex-shrink-0" style={{ color: 'oklch(0.52 0.18 260)' }} />
                : <Folder className="w-4 h-4 flex-shrink-0" style={{ color: 'oklch(0.52 0.18 260)' }} />}
          <span className="flex-1 truncate">{f.name}</span>
          <button onClick={(e) => { e.stopPropagation(); setCreatingId(f.id); }} className="p-0.5 rounded opacity-0 hover:opacity-100 hover:bg-black/5">
            <Plus className="w-3 h-3" />
          </button>
        </div>
        {creating && (
          <div className="flex items-center gap-1 px-2 py-1" style={{ paddingLeft: `${24 + depth * 16}px` }}>
            <Folder className="w-4 h-4 text-muted-foreground" />
            <input autoFocus value={newName} onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') submitCreate(f.id); if (e.key === 'Escape') { setCreatingId(null); setNewName(''); } }}
              placeholder="新文件夹" className="flex-1 text-xs px-1.5 py-1 rounded outline-none" style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }} />
            <button onClick={() => submitCreate(f.id)} className="p-0.5 rounded hover:bg-black/5"><Check className="w-3 h-3" /></button>
            <button onClick={() => { setCreatingId(null); setNewName(''); }} className="p-0.5 rounded hover:bg-black/5"><X className="w-3 h-3" /></button>
          </div>
        )}
        {open && children.map((c) => renderFolder(c, depth + 1))}
      </div>
    );
  };

  return (
    <div className="space-y-1">
      <div
        className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer text-sm transition-all ${selectedFolderId === null ? 'font-medium' : 'text-muted-foreground'}`}
        style={{ background: selectedFolderId === null ? 'var(--glass-bg-hover)' : 'transparent' }}
        onClick={() => onSelectFolder(null)}
      >
        <BookOpen className="w-4 h-4 flex-shrink-0" />
        <span className="flex-1">全部文献</span>
      </div>
      <div className="pt-2">
        <div className="text-xs text-muted-foreground px-2 mb-1">阅读状态</div>
        {[
          { s: 'UNREAD', l: '待读', c: '#94a3b8' },
          { s: 'READING', l: '在读', c: '#3b82f6' },
          { s: 'READ', l: '已读', c: '#22c55e' },
          { s: 'SKIMMED', l: '泛读', c: '#f59e0b' },
          { s: 'DEEP_READ', l: '精读', c: '#8b5cf6' },
        ].map((item) => (
          <div key={item.s} className="flex items-center gap-2 px-2 py-1 rounded-lg cursor-pointer text-xs transition-all text-muted-foreground hover:text-foreground"
            onClick={() => onSelectFolder(`__status_${item.s}`)}>
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: item.c }} />
            <span>{item.l}</span>
          </div>
        ))}
      </div>
      <div className="pt-2">
        <div className="flex items-center justify-between px-2 mb-1">
          <span className="text-xs text-muted-foreground">文件夹</span>
          <button onClick={() => setCreatingId('root')} className="p-0.5 rounded hover:bg-black/5">
            <Plus className="w-3 h-3 text-muted-foreground" />
          </button>
        </div>
        {creatingId === 'root' && (
          <div className="flex items-center gap-1 px-2 py-1">
            <Folder className="w-4 h-4 text-muted-foreground" />
            <input autoFocus value={newName} onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') submitCreate(null); if (e.key === 'Escape') { setCreatingId(null); setNewName(''); } }}
              placeholder="新文件夹" className="flex-1 text-xs px-1.5 py-1 rounded outline-none" style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }} />
            <button onClick={() => submitCreate(null)} className="p-0.5 rounded hover:bg-black/5"><Check className="w-3 h-3" /></button>
            <button onClick={() => { setCreatingId(null); setNewName(''); }} className="p-0.5 rounded hover:bg-black/5"><X className="w-3 h-3" /></button>
          </div>
        )}
        {rootFolders.map((f) => renderFolder(f))}
      </div>
    </div>
  );
}
