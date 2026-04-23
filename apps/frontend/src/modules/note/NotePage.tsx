import { useState, useCallback, useEffect } from 'react';
import { FileText, Save, Loader2 } from 'lucide-react';
import ConfirmDialog from '../../components/ConfirmDialog';
import { authHeaders } from '../../lib/api';
import { NoteSidebar } from './NoteSidebar';
import { NoteEditor } from './NoteEditor';
import { FolderTree } from './FolderTree';
import type { NoteListItem } from './types/note.types';

// 空笔记的默认内容（Tiptap JSON）
const EMPTY_CONTENT = {
  type: 'doc',
  content: [{ type: 'paragraph' }],
};

interface EditingNote {
  id: string | null;
  title: string;
  content: Record<string, unknown>;
  plainText: string;
  tags: string[];
  folderId: string | null;
}

interface NoteFolder {
  id: string;
  name: string;
  parentId: string | null;
}

export default function NotePage() {
  const [notes, setNotes] = useState<NoteListItem[]>([]);
  const [folders, setFolders] = useState<NoteFolder[]>([]);
  const [activeNote, setActiveNote] = useState<EditingNote | null>(null);
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // 删除确认弹窗
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  // 侧边栏收起状态
  const [isFolderCollapsed, setIsFolderCollapsed] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // 加载笔记列表
  const loadNotes = useCallback(async () => {
    setIsLoading(true);
    try {
      const url = activeFolderId
        ? `/api/v1/notes?folderId=${activeFolderId}`
        : '/api/v1/notes';
      const res = await fetch(url, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setNotes(data);
      }
    } catch (err) {
      console.error('加载笔记失败:', err);
    } finally {
      setIsLoading(false);
    }
  }, [activeFolderId]);

  // 加载文件夹
  const loadFolders = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/notes/folders/tree', { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setFolders(data);
      }
    } catch (err) {
      console.error('加载文件夹失败:', err);
    }
  }, []);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  useEffect(() => {
    loadFolders();
  }, [loadFolders]);

  // 窗口重新获得焦点时刷新
  useEffect(() => {
    const handleFocus = () => {
      loadNotes();
      loadFolders();
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [loadNotes, loadFolders]);

  // AI 创建/更新笔记后自动刷新
  useEffect(() => {
    const handleNoteChanged = () => {
      loadNotes();
      loadFolders();
    };
    window.addEventListener('phd:note-changed', handleNoteChanged);
    return () => window.removeEventListener('phd:note-changed', handleNoteChanged);
  }, [loadNotes, loadFolders]);

  // 创建新笔记
  const handleCreate = useCallback(() => {
    setActiveNote({
      id: null,
      title: '',
      content: EMPTY_CONTENT,
      plainText: '',
      tags: [],
      folderId: activeFolderId,
    });
  }, [activeFolderId]);

  // 选择笔记
  const handleSelect = useCallback((note: NoteListItem) => {
    setActiveNote({
      id: note.id,
      title: note.title,
      content: EMPTY_CONTENT,
      plainText: note.plainText,
      tags: note.tags,
      folderId: note.folderId,
    });
    fetch(`/api/v1/notes/${note.id}`, { headers: authHeaders() })
      .then((res) => res.json())
      .then((detail) => {
        setActiveNote({
          id: detail.id,
          title: detail.title,
          content: detail.content as Record<string, unknown>,
          plainText: detail.plainText,
          tags: detail.tags,
          folderId: detail.folderId,
        });
      })
      .catch((err) => console.error('获取笔记详情失败:', err));
  }, []);

  // 保存笔记
  const handleSave = useCallback(async () => {
    if (!activeNote) return;

    setIsSaving(true);
    try {
      const payload = {
        title: activeNote.title || '无标题',
        content: activeNote.content,
        plainText: activeNote.plainText,
        tags: activeNote.tags,
        folderId: activeNote.folderId,
      };

      let res: Response;
      if (activeNote.id) {
        res = await fetch(`/api/v1/notes/${activeNote.id}`, {
          method: 'PATCH',
          headers: authHeaders(),
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch('/api/v1/notes', {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify(payload),
        });
      }

      if (res.ok) {
        const saved = await res.json();
        setActiveNote((prev) => (prev ? { ...prev, id: saved.id } : null));
        await loadNotes();
      }
    } catch (err) {
      console.error('保存笔记失败:', err);
    } finally {
      setIsSaving(false);
    }
  }, [activeNote, loadNotes]);

  // 删除笔记
  const handleDelete = useCallback((id: string) => {
    setPendingDeleteId(id);
    setConfirmOpen(true);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!pendingDeleteId) return;
    try {
      const res = await fetch(`/api/v1/notes/${pendingDeleteId}`, { method: 'DELETE', headers: authHeaders() });
      if (res.ok) {
        if (activeNote?.id === pendingDeleteId) {
          setActiveNote(null);
        }
        await loadNotes();
      }
    } catch (err) {
      console.error('删除笔记失败:', err);
    } finally {
      setPendingDeleteId(null);
    }
  }, [pendingDeleteId, activeNote, loadNotes]);

  // 编辑器内容变化
  const handleEditorChange = useCallback(
    (content: Record<string, unknown>, plainText: string) => {
      setActiveNote((prev) => (prev ? { ...prev, content, plainText } : null));
    },
    []
  );

  // 文件夹操作
  const handleCreateFolder = async (parentId: string | null) => {
    const name = prompt('文件夹名称');
    if (!name?.trim()) return;
    try {
      const res = await fetch('/api/v1/notes/folders', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ name: name.trim(), parentId }),
      });
      if (res.ok) await loadFolders();
    } catch (err) {
      console.error('创建文件夹失败:', err);
    }
  };

  const handleRenameFolder = async (folder: NoteFolder) => {
    const name = prompt('新名称', folder.name);
    if (!name?.trim() || name.trim() === folder.name) return;
    try {
      const res = await fetch(`/api/v1/notes/folders/${folder.id}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ name: name.trim() }),
      });
      if (res.ok) await loadFolders();
    } catch (err) {
      console.error('重命名文件夹失败:', err);
    }
  };

  const handleDeleteFolder = async (folder: NoteFolder) => {
    if (!confirm(`确定删除文件夹「${folder.name}」吗？\n（仅空文件夹可删除）`)) return;
    try {
      const res = await fetch(`/api/v1/notes/folders/${folder.id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      if (res.ok) {
        if (activeFolderId === folder.id) setActiveFolderId(null);
        await loadFolders();
      } else {
        const err = await res.json();
        alert(err.message || '删除失败');
      }
    } catch (err) {
      console.error('删除文件夹失败:', err);
    }
  };

  // 过滤笔记
  const filteredNotes = searchQuery.trim()
    ? notes.filter(
        (n) =>
          n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          n.plainText.toLowerCase().includes(searchQuery.toLowerCase()) ||
          n.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : notes;

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4">
      {/* 左侧栏 — 文件夹 + 笔记列表 */}
      <div className="flex gap-3 shrink-0">
        {/* 文件夹树 */}
        <div
          className={`rounded-2xl overflow-hidden flex flex-col shrink-0 transition-all duration-200 ${isFolderCollapsed ? 'w-10' : 'w-44'}`}
          style={{
            background: 'var(--glass-bg)',
            backdropFilter: 'blur(24px) saturate(1.4)',
            border: '1px solid var(--glass-border)',
            boxShadow: 'var(--glass-shadow)',
          }}
        >
          <FolderTree
            folders={folders}
            activeFolderId={activeFolderId}
            onSelect={setActiveFolderId}
            onCreate={handleCreateFolder}
            onRename={handleRenameFolder}
            onDelete={handleDeleteFolder}
            collapsed={isFolderCollapsed}
            onToggleCollapse={() => setIsFolderCollapsed((v) => !v)}
          />
        </div>

        {/* 笔记列表 */}
        <div
          className={`rounded-2xl overflow-hidden flex flex-col transition-all duration-200 ${isSidebarCollapsed ? 'w-10' : 'w-[240px]'}`}
          style={{
            background: 'var(--glass-bg)',
            backdropFilter: 'blur(24px) saturate(1.4)',
            border: '1px solid var(--glass-border)',
            boxShadow: 'var(--glass-shadow)',
          }}
        >
          {isSidebarCollapsed ? (
            <NoteSidebar
              notes={filteredNotes}
              activeId={activeNote?.id ?? null}
              onSelect={handleSelect}
              onCreate={handleCreate}
              onDelete={handleDelete}
              collapsed={true}
              onToggleCollapse={() => setIsSidebarCollapsed((v) => !v)}
            />
          ) : (
            <>
              {/* 搜索栏 */}
              <div className="px-3 pt-3 pb-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="搜索笔记..."
                  className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                  style={{
                    background: 'var(--glass-bg)',
                    border: '1px solid var(--glass-border)',
                    color: 'var(--text-primary)',
                    boxShadow: 'var(--glass-inset)',
                  }}
                />
              </div>

              {isLoading ? (
                <div className="flex-1 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--text-muted)' }} />
                </div>
              ) : (
                <NoteSidebar
                  notes={filteredNotes}
                  activeId={activeNote?.id ?? null}
                  onSelect={handleSelect}
                  onCreate={handleCreate}
                  onDelete={handleDelete}
                  collapsed={false}
                  onToggleCollapse={() => setIsSidebarCollapsed((v) => !v)}
                />
              )}
            </>
          )}
        </div>
      </div>

      {/* 右侧 — 编辑器 */}
      <div
        className="flex-1 rounded-2xl overflow-hidden flex flex-col"
        style={{
          background: 'var(--glass-bg)',
          backdropFilter: 'blur(24px) saturate(1.4)',
          border: '1px solid var(--glass-border)',
          boxShadow: 'var(--glass-shadow)',
        }}
      >
        {activeNote ? (
          <>
            {/* 标题栏 */}
            <div
              className="flex items-center gap-3 px-4 py-3 border-b"
              style={{ borderColor: 'var(--glass-border)' }}
            >
              <input
                type="text"
                value={activeNote.title}
                onChange={(e) =>
                  setActiveNote((prev) => (prev ? { ...prev, title: e.target.value } : null))
                }
                placeholder="笔记标题"
                className="flex-1 text-lg font-semibold bg-transparent outline-none"
                style={{ color: 'var(--text-primary)' }}
              />
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
                style={{
                  background: 'oklch(0.52 0.18 260 / 0.15)',
                  color: 'oklch(0.7 0.15 260)',
                }}
              >
                {isSaving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                {isSaving ? '保存中...' : '保存'}
              </button>
            </div>

            {/* 标签栏 */}
            <div className="px-4 py-2 border-b flex items-center gap-2 flex-wrap" style={{ borderColor: 'var(--glass-border)' }}>
              {activeNote.tags.map((tag, index) => (
                <span
                  key={index}
                  className="text-xs px-2 py-0.5 rounded-md flex items-center gap-1"
                  style={{
                    background: 'oklch(0.52 0.18 260 / 0.1)',
                    color: 'oklch(0.65 0.12 260)',
                  }}
                >
                  {tag}
                  <button
                    onClick={() =>
                      setActiveNote((prev) =>
                        prev ? { ...prev, tags: prev.tags.filter((_, i) => i !== index) } : null
                      )
                    }
                    className="text-[10px] hover:text-white transition-colors"
                  >
                    ×
                  </button>
                </span>
              ))}
              <input
                type="text"
                placeholder="+ 添加标签"
                className="text-xs bg-transparent outline-none w-20"
                style={{ color: 'var(--text-secondary)' }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const val = e.currentTarget.value.trim();
                    if (val && !activeNote.tags.includes(val)) {
                      setActiveNote((prev) =>
                        prev ? { ...prev, tags: [...prev.tags, val] } : null
                      );
                      e.currentTarget.value = '';
                    }
                  }
                }}
              />
            </div>

            {/* 编辑器 */}
            <div className="flex-1 overflow-hidden">
              <NoteEditor content={activeNote.content} onChange={handleEditorChange} />
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center">
            <FileText className="w-16 h-16 mb-4" style={{ color: 'var(--glass-border)' }} />
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              选择一篇笔记或创建新笔记
            </p>
            <button
              onClick={handleCreate}
              className="mt-4 px-4 py-2 rounded-xl text-sm font-medium transition-colors"
              style={{
                background: 'oklch(0.52 0.18 260 / 0.15)',
                color: 'oklch(0.7 0.15 260)',
              }}
            >
              新建笔记
            </button>
          </div>
        )}
      </div>

      {/* 删除确认弹窗 */}
      <ConfirmDialog
        open={confirmOpen}
        onClose={() => { setConfirmOpen(false); setPendingDeleteId(null); }}
        onConfirm={handleConfirmDelete}
        title="删除笔记"
        description="确定要删除这篇笔记吗？删除后无法恢复。"
        confirmText="删除"
        destructive
      />
    </div>
  );
}
