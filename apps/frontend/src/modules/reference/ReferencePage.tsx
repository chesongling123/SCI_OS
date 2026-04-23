import { useState, useRef } from 'react';
import {
  BookOpen, Search, Upload, Loader2, Trash2,
  FileText, Star, Tag, Calendar, User, X, ExternalLink,
  CheckCircle2, Circle, Clock, ArrowRight,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ReadingStatus } from '@phd/shared-types';
import type { ReferenceResponseDto } from '@phd/shared-types';
import {
  useReferences,
  useReference,
  useUpdateReadingStatus,
  useDeleteReference,
  useUploadPdf,
  useReferenceFolders,
  useCreateReferenceFolder,
} from '../../hooks/useReferences';
import ConfirmDialog from '../../components/ConfirmDialog';
import ReferenceFolderTree from './components/ReferenceFolderTree';

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  UNREAD: { label: '待读', color: '#94a3b8' },
  READING: { label: '在读', color: '#3b82f6' },
  READ: { label: '已读', color: '#22c55e' },
  SKIMMED: { label: '泛读', color: '#f59e0b' },
  DEEP_READ: { label: '精读', color: '#8b5cf6' },
};

const STATUS_OPTIONS = Object.entries(STATUS_LABELS).map(([value, { label }]) => ({ value, label }));

const PRIORITY_LABELS: Record<number, string> = {
  1: 'P1 核心',
  2: 'P2 重要',
  3: 'P3 泛读',
  4: 'P4 备选',
};

/**
 * 文献库主页面
 * 迭代1：列表视图 + 筛选 + 搜索 + 上传 + 手动创建
 */
export default function ReferencePage() {
  const navigate = useNavigate();

  // 筛选与搜索状态
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [folderFilter, setFolderFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>();

  // 弹窗状态
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedRef, setSelectedRef] = useState<ReferenceResponseDto | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  // 文件上传
  const fileInputRef = useRef<HTMLInputElement>(null);

  // API hooks
  const { data, isLoading, error } = useReferences({
    status: statusFilter || undefined,
    folderId: folderFilter ?? undefined,
    q: debouncedQuery || undefined,
    sortBy: 'createdAt',
    sortOrder: 'desc',
    limit: 50,
  });
  const { data: folders } = useReferenceFolders();
  const updateStatusMutation = useUpdateReadingStatus();
  const deleteMutation = useDeleteReference();
  const uploadMutation = useUploadPdf();
  const createFolderMutation = useCreateReferenceFolder();

  const references = data?.data ?? [];

  // 搜索防抖
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => setDebouncedQuery(value), 300);
  };

  // 文件夹/状态选择
  const handleSelectFolder = (id: string | null) => {
    if (id && id.startsWith('__status_')) {
      setStatusFilter(id.replace('__status_', ''));
      setFolderFilter(null);
    } else {
      setFolderFilter(id);
      setStatusFilter('');
    }
  };

  // 状态切换
  const handleStatusChange = (id: string, status: string) => {
    updateStatusMutation.mutate({ id, status });
  };

  // 删除
  const handleDelete = (id: string) => {
    setPendingDeleteId(id);
    setConfirmOpen(true);
  };

  const handleConfirmDelete = () => {
    if (pendingDeleteId) {
      deleteMutation.mutate(pendingDeleteId);
      setPendingDeleteId(null);
    }
  };

  // 查看详情
  const handleViewDetail = (ref: ReferenceResponseDto) => {
    setSelectedRef(ref);
    setDetailOpen(true);
  };

  // 文件上传
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    uploadMutation.mutate({ file });
    e.target.value = '';
  };

  return (
    <div className="flex gap-6 h-[calc(100vh-8rem)]">
      {/* 左侧文件夹树 */}
      <div className="w-56 flex-shrink-0 overflow-y-auto">
        <ReferenceFolderTree
          folders={folders ?? []}
          selectedFolderId={folderFilter}
          onSelectFolder={handleSelectFolder}
          onCreateFolder={(name, parentId) => createFolderMutation.mutate({ name, parentId })}
        />
      </div>

      {/* 主内容区 */}
      <div className="flex-1 min-w-0 space-y-6 overflow-y-auto">
        {/* 页面标题 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BookOpen className="w-6 h-6" style={{ color: 'oklch(0.52 0.18 260)' }} />
            <h1 className="text-2xl font-semibold tracking-tight">文献库</h1>
            <span className="text-sm text-muted-foreground">{references.length} 篇</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadMutation.isPending}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white transition-all"
              style={{ background: 'linear-gradient(135deg, oklch(0.52 0.18 260), oklch(0.6 0.12 290))' }}
            >
              {uploadMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              上传 PDF
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>
        </div>

        {/* 工具栏：搜索 + 筛选 */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="搜索标题、作者、摘要、标签..."
              className="w-full pl-9 pr-4 py-2 rounded-lg text-sm outline-none transition-all"
              style={{
                background: 'var(--glass-bg)',
                border: '1px solid var(--glass-border)',
              }}
            />
          </div>
          <div className="flex items-center gap-1">
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setStatusFilter(statusFilter === opt.value ? '' : opt.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  statusFilter === opt.value
                    ? 'text-white'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                style={
                  statusFilter === opt.value
                    ? { background: STATUS_LABELS[opt.value].color }
                    : { background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }
                }
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* 内容区 */}
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-64 text-destructive gap-3">
            <p>加载文献失败：{error.message}</p>
            {error.message.includes('登录') && (
              <button
                onClick={() => navigate('/login')}
                className="px-4 py-2 rounded-lg text-sm text-white"
                style={{ background: 'linear-gradient(135deg, oklch(0.52 0.18 260), oklch(0.6 0.12 290))' }}
              >
                重新登录
              </button>
            )}
          </div>
        ) : references.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground gap-3">
            <BookOpen className="w-12 h-12 opacity-30" />
            <p>文献库为空</p>
            <p className="text-sm">点击「上传 PDF」开始收藏</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {references.map((ref) => (
              <ReferenceCard
                key={ref.id}
                reference={ref}
                onStatusChange={handleStatusChange}
                onViewDetail={handleViewDetail}
                onDelete={handleDelete}
                isUpdating={updateStatusMutation.isPending}
              />
            ))}
          </div>
        )}
      </div>

      {/* 文献详情弹窗 */}
      {detailOpen && selectedRef && (
        <ReferenceDetailDialog
          reference={selectedRef}
          onClose={() => setDetailOpen(false)}
        />
      )}

      {/* 删除确认 */}
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="确认删除"
        description="删除后文献将进入回收站，可随时恢复。"
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}

// ========== 文献卡片 ==========

function ReferenceCard({
  reference: ref,
  onStatusChange,
  onViewDetail,
  onDelete,
  isUpdating,
}: {
  reference: ReferenceResponseDto;
  onStatusChange: (id: string, status: string) => void;
  onViewDetail: (ref: ReferenceResponseDto) => void;
  onDelete: (id: string) => void;
  isUpdating: boolean;
}) {
  const statusInfo = STATUS_LABELS[ref.readingStatus] ?? STATUS_LABELS.UNREAD;

  return (
    <div
      className="group flex items-start gap-4 p-4 rounded-xl transition-all cursor-pointer"
      style={{
        background: 'var(--glass-bg)',
        border: '1px solid var(--glass-border)',
      }}
      onClick={() => onViewDetail(ref)}
    >
      {/* 缩略图占位 */}
      <div
        className="w-14 h-18 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: 'var(--glass-bg-hover)' }}
      >
        {ref.thumbnailPath ? (
          <img
            src={`/uploads/papers/${ref.thumbnailPath}`}
            alt=""
            className="w-full h-full object-cover rounded-lg"
          />
        ) : (
          <FileText className="w-6 h-6 text-muted-foreground opacity-50" />
        )}
      </div>

      {/* 内容 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-medium text-sm leading-snug truncate">{ref.title}</h3>
          <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/references/${ref.id}/read`);
              }}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
              title="打开阅读器"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(ref.id);
              }}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
          {ref.authors.length > 0 && (
            <span className="flex items-center gap-0.5">
              <User className="w-3 h-3" />
              {ref.authors.slice(0, 3).join(', ')}
              {ref.authors.length > 3 && ' 等'}
            </span>
          )}
          {ref.year && (
            <span className="flex items-center gap-0.5">
              <Calendar className="w-3 h-3" />
              {ref.year}
            </span>
          )}
          {ref.journal && <span>{ref.journal}</span>}
        </div>

        {ref.abstract && (
          <p className="mt-1.5 text-xs text-muted-foreground line-clamp-2">{ref.abstract}</p>
        )}

        <div className="flex items-center gap-2 mt-2">
          {/* 状态标签 */}
          <select
            value={ref.readingStatus}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => onStatusChange(ref.id, e.target.value)}
            disabled={isUpdating}
            className="text-xs px-2 py-0.5 rounded-md outline-none cursor-pointer"
            style={{
              background: statusInfo.color + '20',
              color: statusInfo.color,
              border: `1px solid ${statusInfo.color}40`,
            }}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          {/* 优先级 */}
          <span
            className="text-xs px-2 py-0.5 rounded-md"
            style={{
              background: ref.priority <= 2 ? 'oklch(0.55 0.15 25 / 0.12)' : 'var(--glass-bg-hover)',
              color: ref.priority <= 2 ? 'oklch(0.55 0.15 25)' : 'var(--text-muted)',
            }}
          >
            {PRIORITY_LABELS[ref.priority] ?? `P${ref.priority}`}
          </span>

          {/* 标签 */}
          {ref.tags.slice(0, 3).map((tag) => (
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
      </div>
    </div>
  );
}

// ========== 文献详情弹窗 ==========

function ReferenceDetailDialog({
  reference: ref,
  onClose,
}: {
  reference: ReferenceResponseDto;
  onClose: () => void;
}) {
  const statusInfo = STATUS_LABELS[ref.readingStatus] ?? STATUS_LABELS.UNREAD;
  const navigate = useNavigate();
  const { data: fullRef } = useReference(ref.id);
  const linkedTasks = fullRef?.tasks ?? [];
  const linkedNotes = fullRef?.linkedNotes ?? [];

  const handleCreateTask = () => {
    onClose();
    navigate('/tasks', {
      state: { prefillReferenceId: ref.id, prefillTitle: `精读：${ref.title}` },
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }}>
      <div
        className="w-full max-w-xl rounded-2xl p-6 space-y-4 max-h-[80vh] overflow-y-auto"
        style={{
          background: 'var(--glass-bg)',
          backdropFilter: 'blur(24px) saturate(1.4)',
          border: '1px solid var(--glass-border)',
          boxShadow: 'var(--glass-shadow)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-lg font-semibold leading-snug">{ref.title}</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-black/5 transition-colors flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span
            className="text-xs px-2 py-0.5 rounded-md"
            style={{ background: statusInfo.color + '20', color: statusInfo.color }}
          >
            {statusInfo.label}
          </span>
          {ref.priority && (
            <span
              className="text-xs px-2 py-0.5 rounded-md"
              style={{
                background: ref.priority <= 2 ? 'oklch(0.55 0.15 25 / 0.12)' : 'var(--glass-bg-hover)',
                color: ref.priority <= 2 ? 'oklch(0.55 0.15 25)' : 'var(--text-muted)',
              }}
            >
              {PRIORITY_LABELS[ref.priority]}
            </span>
          )}
          {ref.rating && (
            <span className="flex items-center gap-0.5 text-xs text-amber-500">
              <Star className="w-3 h-3 fill-current" />
              {ref.rating}
            </span>
          )}
        </div>

        <div className="space-y-2 text-sm">
          {ref.authors.length > 0 && (
            <div className="flex items-start gap-2">
              <User className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <span>{ref.authors.join(', ')}</span>
            </div>
          )}
          {(ref.year || ref.journal) && (
            <div className="flex items-start gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <span>
                {ref.year && `${ref.year} `}
                {ref.journal && `· ${ref.journal}`}
                {ref.volume && ` Vol.${ref.volume}`}
                {ref.issue && `(${ref.issue})`}
                {ref.pages && ` · ${ref.pages}`}
              </span>
            </div>
          )}
          {ref.doi && (
            <div className="flex items-start gap-2">
              <span className="text-xs text-muted-foreground mt-0.5 flex-shrink-0">DOI</span>
              <a
                href={`https://doi.org/${ref.doi}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline text-xs"
              >
                {ref.doi}
              </a>
            </div>
          )}
          {ref.url && (
            <div className="flex items-start gap-2">
              <span className="text-xs text-muted-foreground mt-0.5 flex-shrink-0">URL</span>
              <a
                href={ref.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline text-xs truncate"
              >
                {ref.url}
              </a>
            </div>
          )}
        </div>

        {ref.abstract && (
          <div className="space-y-1">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">摘要</h3>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {ref.abstract}
            </p>
          </div>
        )}

        {ref.aiSummary && (
          <div className="space-y-1">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">AI 摘要</h3>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {ref.aiSummary}
            </p>
          </div>
        )}

        {ref.tags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
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

        {/* 关联任务 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">关联任务</h3>
            <button
              onClick={handleCreateTask}
              className="text-xs px-2 py-1 rounded-md transition-all"
              style={{
                background: 'var(--glass-bg-hover)',
                border: '1px solid var(--glass-border)',
                color: 'var(--text-muted)',
              }}
            >
              + 创建精读任务
            </button>
          </div>
          {linkedTasks.length === 0 ? (
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>暂无关联任务</p>
          ) : (
            <div className="space-y-1.5">
              {linkedTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm"
                  style={{
                    background: 'var(--glass-bg-hover)',
                    border: '1px solid var(--glass-border)',
                  }}
                >
                  {task.status === 'DONE' ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                  ) : task.status === 'IN_PROGRESS' ? (
                    <Clock className="w-3.5 h-3.5 text-blue-500" />
                  ) : (
                    <Circle className="w-3.5 h-3.5 text-slate-400" />
                  )}
                  <span className="flex-1 truncate">{task.title}</span>
                  {task.pomodoroCount > 0 && (
                    <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                      🍅 × {task.pomodoroCount}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 关联笔记 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">关联笔记</h3>
            <button
              onClick={() => {
                onClose();
                navigate('/notes', { state: { prefillReferenceId: ref.id, prefillTitle: `读书笔记：${ref.title}` } });
              }}
              className="text-xs px-2 py-1 rounded-md transition-all"
              style={{
                background: 'var(--glass-bg-hover)',
                border: '1px solid var(--glass-border)',
                color: 'var(--text-muted)',
              }}
            >
              + 写读书笔记
            </button>
          </div>
          {linkedNotes.length === 0 ? (
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>暂无关联笔记</p>
          ) : (
            <div className="space-y-1.5">
              {linkedNotes.map((note) => (
                <div
                  key={note.id}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm"
                  style={{
                    background: 'var(--glass-bg-hover)',
                    border: '1px solid var(--glass-border)',
                  }}
                >
                  <FileText className="w-3.5 h-3.5 text-blue-400" />
                  <span className="flex-1 truncate">{note.title}</span>
                  {note.tags.length > 0 && (
                    <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                      {note.tags.slice(0, 2).join(', ')}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {ref.filePath && (
          <div className="pt-2">
            <a
              href={`/uploads/papers/${ref.filePath}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all"
              style={{
                background: 'var(--glass-bg-hover)',
                border: '1px solid var(--glass-border)',
              }}
            >
              <FileText className="w-4 h-4" />
              查看 PDF
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
