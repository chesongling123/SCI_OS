import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Send,
  Square,
  Sparkles,
  Wifi,
  WifiOff,
  RefreshCw,
  Plus,
  Trash2,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Languages,
  Wand2,
  FileText,
  X,
} from 'lucide-react';
import { useAiChat } from '../hooks/useAiChat';
import { authHeaders } from '../../../lib/api';
import { useAiStatus } from '../hooks/useAiStatus';
import {
  useAiConversations,
  useAiConversation,
  useCreateConversation,
  useDeleteConversation,
} from '../hooks/useAiConversations';
import { AiMessageBubble } from './AiMessageBubble';
import { InlineSuggestion } from './InlineSuggestion';

interface AiChatPanelProps {
  onClose?: () => void;
}

/**
 * AI 聊天面板主体（Phase 3：支持对话持久化）
 * 液态玻璃风格，左侧对话列表 + 右侧聊天区域
 */
export function AiChatPanel({ onClose }: AiChatPanelProps) {
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [input, setInput] = useState('');
  const [activeCommand, setActiveCommand] = useState<string | null>(null);
  const [showCommandMenu, setShowCommandMenu] = useState(false);
  const [isQuickLoading, setIsQuickLoading] = useState(false);

  const { status: aiStatus, check: recheckAi } = useAiStatus();
  const aiAvailable = aiStatus === 'available';

  const {
    messages,
    isStreaming,
    currentConversationId,
    sendMessage,
    cancel,
    clear,
    loadHistory,
    addMessages,
    updateMessage,
    useMock,
    resetMock,
  } = useAiChat(selectedConversationId);

  const { data: conversations, isLoading: convLoading } = useAiConversations();
  const { data: conversationDetail } = useAiConversation(selectedConversationId);
  const createConversation = useCreateConversation();
  const deleteConversation = useDeleteConversation();

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // AI 服务恢复后，尝试重置 mock 状态
  useEffect(() => {
    if (aiAvailable && useMock) {
      resetMock();
    }
  }, [aiAvailable, useMock, resetMock]);

  // 新消息时自动滚动到底部
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, isStreaming]);

  // 面板打开时聚焦输入框
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // 当 currentConversationId 变化（新对话创建后），刷新列表并选中
  useEffect(() => {
    if (currentConversationId && currentConversationId !== selectedConversationId) {
      setSelectedConversationId(currentConversationId);
    }
  }, [currentConversationId, selectedConversationId]);

  // 加载选中对话的历史消息
  useEffect(() => {
    if (conversationDetail?.messages && conversationDetail.messages.length > 0) {
      loadHistory(conversationDetail.messages);
    }
  }, [conversationDetail, loadHistory]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isStreaming || isQuickLoading) return;
    const text = input.trim();

    // 快捷命令处理
    if (activeCommand) {
      setInput('');
      setActiveCommand(null);
      setShowCommandMenu(false);
      await sendQuickCommand(activeCommand, text);
      return;
    }

    setInput('');
    await sendMessage(text, {
      onConversationCreated: (id) => {
        setSelectedConversationId(id);
      },
    });
  };

  const handleExampleClick = (text: string) => {
    if (isStreaming || isQuickLoading) return;
    sendMessage(text, {
      onConversationCreated: (id) => {
        setSelectedConversationId(id);
      },
    });
  };

  /**
   * 发送快捷命令（直接 LLM，非流式，不保存到数据库）
   */
  const sendQuickCommand = async (command: string, text: string) => {
    setIsQuickLoading(true);

    // 添加用户消息到 UI
    const userMsgId = crypto.randomUUID();
    const assistantId = crypto.randomUUID();
    addMessages([
      {
        id: userMsgId,
        role: 'user',
        content: `/${command} ${text}`,
        timestamp: new Date(),
        status: 'complete',
      },
      {
        id: assistantId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        status: 'streaming',
      },
    ]);

    try {
      const res = await fetch('/api/v1/ai/quick', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ command, text }),
      });

      if (!res.ok) {
        throw new Error('快捷命令执行失败');
      }

      const data = await res.json();
      const result = data.result as string;

      // 逐字显示结果（打字机效果）
      let displayed = '';
      for (let i = 0; i < result.length; i++) {
        displayed += result[i];
        updateMessage(assistantId, (msg) => ({ ...msg, content: displayed }));
        await new Promise((r) => setTimeout(r, 8));
      }

      updateMessage(assistantId, (msg) => ({ ...msg, status: 'complete' }));
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : '未知错误';
      updateMessage(assistantId, (msg) => ({
        ...msg,
        status: 'error',
        content: `Error: ${errorMsg}`,
      }));
    } finally {
      setIsQuickLoading(false);
    }
  };

  /**
   * 输入框变化处理（检测 / 命令）
   */
  const handleInputChange = (value: string) => {
    setInput(value);

    if (value.startsWith('/')) {
      const cmd = value.split(' ')[0].slice(1);
      if (cmd === '' || ['translate', 'polish', 'summarize'].some((c) => c.startsWith(cmd))) {
        setShowCommandMenu(true);
      } else {
        setShowCommandMenu(false);
      }

      if (['translate', 'polish', 'summarize'].includes(cmd)) {
        setActiveCommand(cmd);
      } else {
        setActiveCommand(null);
      }
    } else {
      setShowCommandMenu(false);
      setActiveCommand(null);
    }
  };

  /**
   * 选择命令
   */
  const selectCommand = (cmd: string) => {
    setInput(`/${cmd} `);
    setActiveCommand(cmd);
    setShowCommandMenu(false);
    inputRef.current?.focus();
  };

  const handleNewConversation = async () => {
    if (isStreaming) return;
    clear();
    setSelectedConversationId(null);
    const result = await createConversation.mutateAsync('新对话');
    setSelectedConversationId(result.id);
    inputRef.current?.focus();
  };

  const handleSelectConversation = useCallback(
    (id: string) => {
      if (isStreaming) return;
      clear();
      setSelectedConversationId(id);
    },
    [isStreaming, clear]
  );

  const handleDeleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('确定删除这个对话吗？')) return;
    await deleteConversation.mutateAsync(id);
    if (selectedConversationId === id) {
      clear();
      setSelectedConversationId(null);
    }
  };

  // 格式化相对时间
  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 7) return `${days}天前`;
    return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  };

  const panelWidth = sidebarOpen ? 520 : 400;

  return (
    <div
      className="flex rounded-2xl overflow-hidden"
      style={{
        width: `${panelWidth}px`,
        height: '600px',
        background: 'var(--glass-bg)',
        backdropFilter: 'blur(24px) saturate(1.4)',
        WebkitBackdropFilter: 'blur(24px) saturate(1.4)',
        border: '1px solid var(--glass-border)',
        borderTopColor: 'var(--glass-border-highlight)',
        boxShadow: 'var(--glass-inset), var(--glass-shadow-strong)',
        transition: 'width 200ms ease',
      }}
    >
      {/* 左侧对话列表 */}
      {sidebarOpen && (
        <div
          className="flex flex-col border-r shrink-0"
          style={{
            width: '200px',
            borderColor: 'var(--glass-border)',
          }}
        >
          {/* 列表头部 */}
          <div className="flex items-center justify-between px-3 py-3">
            <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
              对话历史
            </span>
            <button
              onClick={handleNewConversation}
              disabled={createConversation.isPending || isStreaming}
              className="p-1 rounded-lg transition-colors hover:bg-white/10 disabled:opacity-40"
              style={{ color: 'var(--text-secondary)' }}
              title="新建对话"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* 对话列表 */}
          <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-1">
            {convLoading && (
              <div className="text-center py-4 text-xs" style={{ color: 'var(--text-muted)' }}>
                加载中…
              </div>
            )}
            {conversations?.length === 0 && !convLoading && (
              <div className="text-center py-4 text-xs" style={{ color: 'var(--text-muted)' }}>
                暂无对话
              </div>
            )}
            {conversations?.map((conv) => {
              const isActive = conv.id === selectedConversationId;
              return (
                <div
                  key={conv.id}
                  onClick={() => handleSelectConversation(conv.id)}
                  className="group relative flex items-start gap-2 px-2.5 py-2 rounded-lg cursor-pointer transition-colors"
                  style={{
                    background: isActive ? 'var(--glass-bg-hover, rgba(255,255,255,0.08))' : 'transparent',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) e.currentTarget.style.background = 'var(--glass-bg-hover, rgba(255,255,255,0.04))';
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <MessageSquare className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: 'var(--text-muted)' }} />
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-xs truncate"
                      style={{ color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)' }}
                    >
                      {conv.title || '新对话'}
                    </p>
                    <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {formatTime(conv.updatedAt)} · {conv.messageCount}条消息
                    </p>
                  </div>
                  <button
                    onClick={(e) => handleDeleteConversation(conv.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded transition-all"
                    style={{ color: 'var(--text-muted)' }}
                    title="删除"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 右侧聊天区域 */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* 头部 */}
        <div
          className="flex items-center justify-between px-4 py-3 border-b"
          style={{ borderColor: 'var(--glass-border)' }}
        >
          <div className="flex items-center gap-2">
            {/* 收起/展开侧边栏按钮 */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1 rounded-lg transition-colors hover:bg-white/10"
              style={{ color: 'var(--text-muted)' }}
              title={sidebarOpen ? '收起列表' : '展开列表'}
            >
              {sidebarOpen ? <ChevronLeft className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </button>

            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs"
              style={{
                background: 'linear-gradient(135deg, oklch(0.52 0.18 260), oklch(0.6 0.12 290))',
              }}
            >
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                科研助手
              </h3>
              <div className="flex items-center gap-1.5">
                {aiStatus === 'checking' && (
                  <span className="text-[10px] flex items-center gap-0.5" style={{ color: 'var(--text-muted)' }}>
                    <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                    检测中…
                  </span>
                )}
                {aiAvailable && !useMock && (
                  <span className="text-[10px] flex items-center gap-0.5 text-green-500">
                    <Wifi className="w-2.5 h-2.5" />
                    AI 在线
                  </span>
                )}
                {(!aiAvailable || useMock) && (
                  <span className="text-[10px] flex items-center gap-0.5 text-amber-500">
                    <WifiOff className="w-2.5 h-2.5" />
                    本地模拟模式
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {/* 新建对话按钮（收起列表时显示） */}
            {!sidebarOpen && (
              <button
                onClick={handleNewConversation}
                disabled={createConversation.isPending || isStreaming}
                className="p-1.5 rounded-lg transition-colors hover:bg-white/10 disabled:opacity-40"
                style={{ color: 'var(--text-muted)' }}
                title="新建对话"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            )}
            {aiStatus === 'unavailable' && (
              <button
                onClick={recheckAi}
                className="p-1.5 rounded-lg transition-colors hover:bg-white/10"
                style={{ color: 'var(--text-muted)' }}
                title="重新检测 AI 服务"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            )}
            {onClose && (
              <button
                onClick={onClose}
                className="text-xs px-2 py-1 rounded-lg transition-colors hover:bg-white/10"
                style={{ color: 'var(--text-muted)' }}
              >
                收起
              </button>
            )}
          </div>
        </div>

        {/* AI 离线提示 Banner */}
        {aiStatus === 'unavailable' && (
          <div
            className="mx-4 mt-3 px-3 py-2.5 rounded-xl text-xs"
            style={{
              background: 'oklch(0.3 0.02 80 / 0.15)',
              border: '1px solid oklch(0.5 0.05 80 / 0.2)',
              color: 'oklch(0.7 0.03 80)',
            }}
          >
            <p className="font-medium mb-1">🔧 AI 服务暂不可用</p>
            <p className="opacity-80 mb-1.5">
              当前为本地模拟模式，AI 回复是预设的示例内容。
            </p>
            <p className="opacity-70">
              配置 AI API Key 后可获得真实 AI 能力：
            </p>
            <ol className="list-decimal list-inside opacity-70 space-y-0.5 mt-0.5 ml-0.5">
              <li>在 apps/backend/.env 中设置 KIMI_CODING_API_KEY</li>
              <li>重启后端服务</li>
            </ol>
            <p className="opacity-60 mt-1.5">
              配置完成后点击上方 ⟳ 按钮重新检测。
            </p>
          </div>
        )}

        {/* 消息列表区 */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {/* 内联建议卡片 */}
          <InlineSuggestion />

          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-white"
                style={{
                  background: 'linear-gradient(135deg, oklch(0.52 0.18 260), oklch(0.6 0.12 290))',
                }}
              >
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  {selectedConversationId ? '继续对话' : '科研助手'}
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                  {selectedConversationId ? '历史消息已加载' : '直连 LLM · 本地优先'}
                </p>
              </div>

              {/* 快捷示例 */}
              <div className="w-full space-y-2 pt-2">
                <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                  试试这样问我
                </p>
                {[
                  '我今天专注了多久？',
                  '我还有哪些待办任务？',
                  '帮我安排下周的计划',
                ].map((text) => (
                  <button
                    key={text}
                    onClick={() => handleExampleClick(text)}
                    className="w-full text-left text-xs px-3 py-2 rounded-xl transition-colors hover:bg-white/5"
                    style={{
                      background: 'var(--glass-bg)',
                      border: '1px solid var(--glass-border)',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    {text}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <AiMessageBubble key={msg.id} message={msg} />
          ))}

          <div ref={scrollRef} />
        </div>

        {/* 输入区 */}
        <div
          className="px-4 py-3 border-t"
          style={{ borderColor: 'var(--glass-border)' }}
        >
          <form onSubmit={handleSubmit} className="flex gap-2 relative">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder="输入问题，或 / 查看快捷命令…"
              disabled={isStreaming || isQuickLoading}
              className="flex-1 px-3 py-2.5 rounded-xl text-sm outline-none transition-colors disabled:opacity-60"
              style={{
                background: 'var(--glass-bg)',
                border: activeCommand ? '1px solid oklch(0.52 0.18 260)' : '1px solid var(--glass-border)',
                color: 'var(--text-primary)',
                boxShadow: 'var(--glass-inset)',
                paddingLeft: activeCommand ? '80px' : '12px',
              }}
            />
            {/* 快捷命令面板 */}
            {showCommandMenu && (
              <div
                className="absolute bottom-full left-0 mb-2 w-64 rounded-xl overflow-hidden z-10"
                style={{
                  background: 'var(--glass-bg)',
                  backdropFilter: 'blur(24px)',
                  border: '1px solid var(--glass-border)',
                  boxShadow: 'var(--glass-shadow-strong)',
                }}
              >
                <div className="px-3 py-2 text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                  快捷命令
                </div>
                {[
                  { cmd: 'translate', label: '翻译', desc: '将文本翻译成中文', icon: <Languages className="w-4 h-4" /> },
                  { cmd: 'polish', label: '润色', desc: '让表达更专业流畅', icon: <Wand2 className="w-4 h-4" /> },
                  { cmd: 'summarize', label: '摘要', desc: '提取文本核心要点', icon: <FileText className="w-4 h-4" /> },
                ].map((item) => (
                  <button
                    key={item.cmd}
                    type="button"
                    onClick={() => selectCommand(item.cmd)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-white/5"
                  >
                    <span style={{ color: 'var(--text-muted)' }}>{item.icon}</span>
                    <div>
                      <div className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                        /{item.cmd}
                      </div>
                      <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                        {item.desc}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
            {/* 当前激活命令标签 */}
            {activeCommand && (
              <div
                className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1 px-2 py-0.5 rounded text-[10px]"
                style={{
                  background: 'oklch(0.52 0.18 260 / 0.15)',
                  color: 'oklch(0.6 0.15 260)',
                }}
              >
                {activeCommand === 'translate' && <Languages className="w-3 h-3" />}
                {activeCommand === 'polish' && <Wand2 className="w-3 h-3" />}
                {activeCommand === 'summarize' && <FileText className="w-3 h-3" />}
                {activeCommand}
                <button
                  type="button"
                  onClick={() => {
                    setActiveCommand(null);
                    setInput('');
                  }}
                  className="ml-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
            {isStreaming || isQuickLoading ? (
              <button
                type="button"
                onClick={cancel}
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white transition-all hover:opacity-90 shrink-0"
                style={{ background: 'oklch(0.55 0.15 25)' }}
                title="取消"
              >
                <Square className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!input.trim()}
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white transition-all hover:opacity-90 disabled:opacity-40 shrink-0"
                style={{
                  background: 'linear-gradient(135deg, oklch(0.52 0.18 260), oklch(0.6 0.12 290))',
                }}
                title="发送"
              >
                <Send className="w-4 h-4" />
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
