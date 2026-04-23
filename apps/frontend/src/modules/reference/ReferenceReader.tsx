import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, MessageSquare, Plus, Trash2, X, Highlighter,
  BookOpen, Tag, Calendar, User, FileText, Loader2,
} from 'lucide-react';
import type { ReferenceResponseDto } from '@phd/shared-types';
import { useReference, useUpdateReadingStatus, useReferenceNotes, useCreateReferenceNote } from '../../hooks/useReferences';
import PdfViewer from './components/PdfViewer';

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  UNREAD: { label: '待读', color: '#94a3b8' },
  READING: { label: '在读', color: '#3b82f6' },
  READ: { label: '已读', color: '#22c55e' },
  SKIMMED: { label: '泛读', color: '#f59e0b' },
  DEEP_READ: { label: '精读', color: '#8b5cf6' },
};

const HIGHLIGHT_COLORS = [
  { name: '黄色', value: '#FFD700' },
  { name: '绿色', value: '#90EE90' },
  { name: '蓝色', value: '#87CEEB' },
  { name: '粉色', value: '#FFB6C1' },
];

/**
 * PDF 阅读器页面
 * 左侧：PDF.js 渲染区
 * 右侧：文献信息 + 批注面板
 */
export default function ReferenceReader() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [panelOpen, setPanelOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<'info' | 'notes'>('notes');
  const [selectedText, setSelectedText] = useState('');
  const [selectedPage, setSelectedPage] = useState(1);
  const [noteInputOpen, setNoteInputOpen] = useState(false);
  const [noteContent, setNoteContent] = useState('');
  const [noteColor, setNoteColor] = useState('#FFD700');

  const { data: reference, isLoading: refLoading, error: refError } = useReference(id ?? '');
  const { data: notes, isLoading: notesLoading } = useReferenceNotes(id ?? '');
  const updateStatusMutation = useUpdateReadingStatus();
  const createNoteMutation = useCreateReferenceNote();

  // 页面加载时自动设为「在读」
  useEffect(() => {
    if (reference && reference.readingStatus === 'UNREAD') {
      updateStatusMutation.mutate({ id: reference.id, status: 'READING' });
    }
  }, [reference?.id, reference?.readingStatus]);

  // 文本选择回调
  const handleTextSelect = (text: string, page: number) => {
    setSelectedText(text);
    setSelectedPage(page);
    setNoteInputOpen(true);
    setActiveTab('notes');
  };

  // 添加批注
  const handleAddNote = () => {
    if (!id || !noteContent.trim()) return;
    createNoteMutation.mutate(
      {
        referenceId: id,
        data: {
          pageNumber: selectedPage,
          text: selectedText,
          color: noteColor,
          content: noteContent,
        },
      },
      {
        onSuccess: () => {
          setNoteContent('');
          setSelectedText('');
          setNoteInputOpen(false);
        },
      }
    );
  };

  if (refLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (refError || !reference) {
    return (
      <div className="flex items-center justify-center h-screen text-destructive">
        加载文献失败：{refError?.message ?? '文献不存在'}
      </div>
    );
  }

  const statusInfo = STATUS_LABELS[reference.readingStatus] ?? STATUS_LABELS.UNREAD;
  const fileUrl = reference.filePath
    ? `/uploads/papers/${reference.filePath}`
    : reference.pdfUrl ?? '';

  const pageNotes = notes?.filter((n) => n.pageNumber === selectedPage) ?? [];

  return (
    <div className="fixed inset-0 z-40 flex" style={{ background: 'var(--background)' }}>
      {/* PDF 渲染区 */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* 顶部工具栏 */}
        <div
          className="flex items-center justify-between px-4 h-14 border-b flex-shrink-0"
          style={{ background: 'var(--glass-bg)', borderColor: 'var(--glass-border)' }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => navigate('/references')}
              className="p-2 rounded-lg hover:bg-black/5 transition-colors flex-shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <h1 className="text-sm font-medium truncate">{reference.title}</h1>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <select
              value={reference.readingStatus}
              onChange={(e) => updateStatusMutation.mutate({ id: reference.id, status: e.target.value })}
              className="text-xs px-2 py-1 rounded-md outline-none cursor-pointer"
              style={{
                background: statusInfo.color + '20',
                color: statusInfo.color,
                border: `1px solid ${statusInfo.color}40`,
              }}
            >
              {Object.entries(STATUS_LABELS).map(([value, { label }]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <button
              onClick={() => setPanelOpen(!panelOpen)}
              className="p-2 rounded-lg hover:bg-black/5 transition-colors"
              title={panelOpen ? '收起面板' : '展开面板'}
            >
              {panelOpen ? <X className="w-4 h-4" /> : <MessageSquare className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* PDF 内容 */}
        {fileUrl ? (
          <PdfViewer
            fileUrl={fileUrl}
            onTextSelect={handleTextSelect}
            annotations={notes ?? []}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center space-y-3">
              <FileText className="w-12 h-12 mx-auto opacity-30" />
              <p>该文献没有上传 PDF 文件</p>
              {reference.url && (
                <a
                  href={reference.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-500 hover:underline"
                >
                  访问论文链接
                </a>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 右侧面板 */}
      {panelOpen && (
        <div
          className="w-80 border-l flex flex-col overflow-hidden flex-shrink-0"
          style={{ background: 'var(--glass-bg)', borderColor: 'var(--glass-border)' }}
        >
          {/* 标签切换 */}
          <div className="flex border-b" style={{ borderColor: 'var(--glass-border)' }}>
            <button
              onClick={() => setActiveTab('info')}
              className={`flex-1 py-2.5 text-xs font-medium transition-colors ${
                activeTab === 'info' ? 'text-foreground' : 'text-muted-foreground'
              }`}
              style={activeTab === 'info' ? { borderBottom: '2px solid oklch(0.52 0.18 260)' } : {}}
            >
              文献信息
            </button>
            <button
              onClick={() => setActiveTab('notes')}
              className={`flex-1 py-2.5 text-xs font-medium transition-colors ${
                activeTab === 'notes' ? 'text-foreground' : 'text-muted-foreground'
              }`}
              style={activeTab === 'notes' ? { borderBottom: '2px solid oklch(0.52 0.18 260)' } : {}}
            >
              批注 ({notes?.length ?? 0})
            </button>
          </div>

          {/* 内容区 */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {activeTab === 'info' ? (
              <ReferenceInfo reference={reference} />
            ) : (
              <NotesPanel
                notes={notes ?? []}
                pageNotes={pageNotes}
                selectedPage={selectedPage}
                selectedText={selectedText}
                noteInputOpen={noteInputOpen}
                noteContent={noteContent}
                noteColor={noteColor}
                onNoteContentChange={setNoteContent}
                onNoteColorChange={setNoteColor}
                onAddNote={handleAddNote}
                onCancelNote={() => {
                  setNoteInputOpen(false);
                  setNoteContent('');
                  setSelectedText('');
                }}
                isSubmitting={createNoteMutation.isPending}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ========== 文献信息面板 ==========

function ReferenceInfo({ reference: ref }: { reference: ReferenceResponseDto }) {
  return (
    <div className="space-y-4 text-sm">
      <div>
        <h3 className="font-medium text-base mb-1">{ref.title}</h3>
        {ref.authors.length > 0 && (
          <p className="text-muted-foreground flex items-center gap-1">
            <User className="w-3 h-3" />
            {ref.authors.join(', ')}
          </p>
        )}
      </div>

      <div className="space-y-1.5 text-muted-foreground">
        {ref.year && (
          <p className="flex items-center gap-1.5">
            <Calendar className="w-3 h-3" />
            {ref.year}
            {ref.journal && ` · ${ref.journal}`}
          </p>
        )}
        {ref.doi && (
          <p>
            DOI:{' '}
            <a href={`https://doi.org/${ref.doi}`} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
              {ref.doi}
            </a>
          </p>
        )}
      </div>

      {ref.abstract && (
        <div className="space-y-1">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">摘要</h4>
          <p className="text-xs leading-relaxed">{ref.abstract}</p>
        </div>
      )}

      {ref.aiSummary && (
        <div className="space-y-1">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">AI 摘要</h4>
          <p className="text-xs leading-relaxed">{ref.aiSummary}</p>
        </div>
      )}

      {ref.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {ref.tags.map((tag) => (
            <span
              key={tag}
              className="text-xs px-2 py-0.5 rounded-md flex items-center gap-0.5"
              style={{ background: 'var(--glass-bg-hover)', color: 'var(--text-muted)' }}
            >
              <Tag className="w-2.5 h-2.5" />
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ========== 批注面板 ==========

function NotesPanel({
  notes,
  pageNotes,
  selectedText,
  noteInputOpen,
  noteContent,
  noteColor,
  onNoteContentChange,
  onNoteColorChange,
  onAddNote,
  onCancelNote,
  isSubmitting,
}: {
  notes: Array<{ id: string; pageNumber: number; text?: string; color: string; content: string; createdAt: string }>;
  pageNotes: typeof notes;
  selectedPage: number;
  selectedText: string;
  noteInputOpen: boolean;
  noteContent: string;
  noteColor: string;
  onNoteContentChange: (v: string) => void;
  onNoteColorChange: (v: string) => void;
  onAddNote: () => void;
  onCancelNote: () => void;
  isSubmitting: boolean;
}) {
  // 按页分组
  const grouped = notes.reduce((acc, note) => {
    if (!acc[note.pageNumber]) acc[note.pageNumber] = [];
    acc[note.pageNumber].push(note);
    return acc;
  }, {} as Record<number, typeof notes>);

  const sortedPages = Object.keys(grouped).map(Number).sort((a, b) => a - b);

  return (
    <div className="space-y-3">
      {/* 添加批注输入区 */}
      {noteInputOpen && (
        <div
          className="p-3 rounded-xl space-y-2"
          style={{ background: 'var(--glass-bg-hover)', border: '1px solid var(--glass-border)' }}
        >
          <div className="flex items-center gap-1.5">
            <Highlighter className="w-3 h-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground truncate">选中：「{selectedText.slice(0, 30)}{selectedText.length > 30 ? '...' : ''}」</span>
          </div>
          <textarea
            value={noteContent}
            onChange={(e) => onNoteContentChange(e.target.value)}
            placeholder="添加批注..."
            rows={3}
            className="w-full px-2.5 py-2 rounded-lg text-xs outline-none resize-none"
            style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}
          />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              {HIGHLIGHT_COLORS.map((c) => (
                <button
                  key={c.value}
                  onClick={() => onNoteColorChange(c.value)}
                  className={`w-5 h-5 rounded-full border-2 transition-all ${
                    noteColor === c.value ? 'scale-110' : 'opacity-60 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: c.value, borderColor: noteColor === c.value ? 'var(--foreground)' : 'transparent' }}
                  title={c.name}
                />
              ))}
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={onCancelNote}
                className="px-2.5 py-1 rounded-md text-xs transition-colors"
                style={{ background: 'var(--glass-bg)' }}
              >
                取消
              </button>
              <button
                onClick={onAddNote}
                disabled={!noteContent.trim() || isSubmitting}
                className="px-2.5 py-1 rounded-md text-xs text-white transition-all disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, oklch(0.52 0.18 260), oklch(0.6 0.12 290))' }}
              >
                {isSubmitting ? <Loader2 className="w-3 h-3 animate-spin" /> : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 提示 */}
      {!noteInputOpen && notes.length === 0 && (
        <div className="text-center py-8 text-muted-foreground text-xs">
          <Highlighter className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p>在 PDF 中选中文本即可添加批注</p>
        </div>
      )}

      {/* 批注列表（按页分组） */}
      {sortedPages.map((page) => (
        <div key={page} className="space-y-2">
          <h4 className="text-xs font-medium text-muted-foreground">第 {page} 页</h4>
          {grouped[page].map((note) => (
            <div
              key={note.id}
              className="p-2.5 rounded-lg text-xs space-y-1"
              style={{
                background: note.color + '15',
                borderLeft: `3px solid ${note.color}`,
              }}
            >
              {note.text && (
                <p className="text-muted-foreground italic truncate">「{note.text}」</p>
              )}
              <p>{note.content}</p>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
