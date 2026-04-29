# 上下文感知预判系统设计方案

> **状态**: 设计阶段 | **优先级**: P2 | **创建日期**: 2026-04-29

---

## 1. 设计目标

将 AI 助手从「被动应答」升级为「主动伴随」，通过感知用户当前上下文，在合适的时机提供恰到好处的帮助。

**核心原则**:
- **不打扰**: 预判提示必须可忽略，不能打断用户当前工作流
- **相关性**: 只在与当前场景强相关时触发
- **渐进式**: 根据用户使用深度逐步展示更多能力

---

## 2. 系统架构

```
┌─────────────────────────────────────────────────────────────┐
│                     上下文采集层                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │ 路由监听  │ │ 行为追踪  │ │ 内容感知  │ │ 时间上下文 │       │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘       │
└───────┼────────────┼────────────┼────────────┼─────────────┘
        └────────────┴──────┬─────┴────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                     上下文聚合器                              │
│              UserContext（统一状态对象）                       │
└──────────────────────────┬──────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                     预判触发引擎                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              TriggerRule[] 规则数组                   │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐   │   │
│  │  │规则 1   │ │规则 2   │ │规则 3   │ │  ...    │   │   │
│  │  │condition│ │condition│ │condition│ │condition│   │   │
│  │  │suggestion│ │suggestion│ │suggestion│ │suggestion│   │   │
│  │  │cooldown │ │cooldown │ │cooldown │ │cooldown │   │   │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘   │   │
│  └─────────────────────────────────────────────────────┘   │
└──────────────────────────┬──────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                     提示呈现层                                │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐        │
│  │ Ghost Text   │ │ 轻量提示条    │ │ 面板内联建议  │        │
│  │ （输入框内）  │ │ （输入条上方） │ │ （对话面板）  │        │
│  └──────────────┘ └──────────────┘ └──────────────┘        │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. 上下文模型

```typescript
interface UserContext {
  // === 页面上下文 ===
  currentPage: 'dashboard' | 'calendar' | 'task' | 'pomodoro' | 'note' | 'reference' | 'settings';
  pageTitle?: string;
  routeParams?: Record<string, string>;

  // === 时间上下文 ===
  currentTime: Date;
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  dayOfWeek: number;        // 0-6
  isWeekend: boolean;
  isHoliday?: boolean;

  // === 行为上下文 ===
  lastAction: string;       // 最近操作标识
  lastActionTime: Date;
  idleTime: number;         // 页面空闲毫秒数
  sessionDuration: number;  // 当前会话时长（毫秒）
  pageViewCount: number;    // 当前页面浏览次数

  // === 内容上下文（页面特定） ===
  selectedText?: string;           // 当前选中的文字
  selectedTextLength?: number;
  activeNoteId?: string;           // 当前编辑的笔记 ID
  activeReferenceId?: string;      // 当前阅读的文献 ID
  activeTaskIds?: string[];        // 当前可见/选中的任务
  upcomingEvents?: Array<{         // 即将到来的日程
    id: string;
    title: string;
    startTime: Date;
    minutesUntil: number;
  }>;
  pomodoroState?: {                // 番茄钟状态
    isRunning: boolean;
    elapsedMinutes: number;
    totalFocusToday: number;
  };

  // === 历史上下文 ===
  recentQueries: string[];         // 最近 5 次 AI 查询
  recentActions: string[];         // 最近 10 次操作记录
  conversationOpen: boolean;       // 对话面板是否打开
  lastSuggestionTime: Date;        // 上次显示预判提示的时间
  dismissedSuggestions: string[];  // 用户忽略过的建议类型
}
```

---

## 4. 触发规则设计

### 4.1 规则结构

```typescript
type TriggerRule = {
  id: string;                    // 规则唯一标识
  name: string;                  // 人类可读名称
  description: string;           // 规则说明

  // 触发条件（必须全部满足）
  condition: (ctx: UserContext) => boolean;

  // 提示内容
  suggestion: {
    text: string;                // Ghost text / 提示文案
    detailText?: string;         // 详细说明（轻量提示条用）
    action: {                    // 点击后执行的操作
      type: 'send_message' | 'navigate' | 'open_panel' | 'execute_tool';
      payload: Record<string, unknown>;
    };
  };

  // 冷却与限制
  cooldown: number;              // 冷却时间（毫秒）
  maxPerSession: number;         // 每会话最大触发次数
  priority: 'high' | 'medium' | 'low';

  // 呈现方式
  display: 'ghost_text' | 'light_toast' | 'inline_panel';
};
```

### 4.2 默认规则集

#### 文献阅读场景

| 规则 ID | 触发条件 | 提示文案 | 动作 | 冷却 |
|:---|:---|:---|:---|:---|
| `reading-assist` | 在文献页停留 > 30s | 需要总结这篇文献吗？ | 发送"总结这篇文献" | 5min |
| `reading-translate` | 选中 > 20 字英文 | 翻译选中内容？ | 发送"/translate {选中}" | 30s |
| `reading-long-session` | 连续阅读 > 45min | 阅读 45 分钟了，需要休息一下吗？ | 导航到番茄钟 | 30min |

#### 笔记编辑场景

| 规则 ID | 触发条件 | 提示文案 | 动作 | 冷却 |
|:---|:---|:---|:---|:---|
| `note-polish` | 在笔记页输入 > 100 字后暂停 5s | 润色这段文字？ | 发送"/polish {最后一段}" | 10min |
| `note-summarize` | 笔记长度 > 1000 字 | 生成笔记摘要？ | 发送"总结这篇笔记" | 单次 |
| `note-link-suggest` | 检测到类似标题的已有笔记 | 关联到「xxx」笔记？ | 创建双向链接 | 单次 |

#### 任务管理场景

| 规则 ID | 触发条件 | 提示文案 | 动作 | 冷却 |
|:---|:---|:---|:---|:---|
| `overdue-alert` | 有逾期任务且打开任务页 | 有逾期任务，要重新排期吗？ | 发送"帮我重新排期逾期任务" | 15min |
| `task-focus-suggest` | 查看高优先级任务后停留 | 开始专注处理这个任务？ | 导航到番茄钟 | 20min |
| `daily-plan` | 早上首次打开任务页 | 查看今天的任务安排？ | 发送"今天有哪些任务" | 单次/天 |

#### 番茄钟场景

| 规则 ID | 触发条件 | 提示文案 | 动作 | 冷却 |
|:---|:---|:---|:---|:---|
| `pomodoro-complete` | 番茄钟完成 | 记录一下专注内容？ | 发送"帮我记录番茄钟" | 单次 |
| `pomodoro-break-over` | 休息结束 | 休息结束，继续下一个番茄？ | 开始番茄钟 | 单次 |
| `focus-streak` | 连续完成 4 个番茄 | 完成 4 个番茄了！查看统计？ | 发送"今天专注统计" | 单次 |

#### 日程场景

| 规则 ID | 触发条件 | 提示文案 | 动作 | 冷却 |
|:---|:---|:---|:---|:---|
| `event-soon` | 日程开始前 15min | 「xxx」将在 15 分钟后开始 | 导航到日历 | 单次 |
| `event-followup` | 日程结束后 5min | 需要记录会议纪要吗？ | 发送"帮我写会议纪要" | 单次 |
| `schedule-conflict` | 检测到日程冲突 | 检测到日程冲突，要调整吗？ | 发送"帮我调整冲突日程" | 单次 |

#### 全局场景

| 规则 ID | 触发条件 | 提示文案 | 动作 | 冷却 |
|:---|:---|:---|:---|:---|
| `daily-brief` | 早上首次打开应用 | 查看今日简报？ | 打开 AI 面板发送"今日简报" | 单次/天 |
| `late-night` | 22:00 后仍在活跃 | 已经晚上 10 点了，总结今天？ | 发送"总结今天的工作" | 单次/天 |
| `weekend-plan` | 周五下午打开应用 | 规划周末安排？ | 发送"帮我规划周末" | 单次/周 |
| `welcome-back` | 离开 > 2 小时后返回 | 欢迎回来！查看有什么新动态？ | 发送"有什么新动态" | 单次/天 |

---

## 5. 呈现方式详解

### 5.1 Ghost Text（幽灵文本）

**适用**: 输入框已聚焦，有明确的文本操作建议

```
┌─────────────────────────────────────────────────┐
│  [🎙]  [有什么可以帮你的？需要总结这篇文献吗？|]  [➤] │
└─────────────────────────────────────────────────┘
                          ↑ 灰色 ghost text，按 Tab 采纳
```

**实现要点**:
- 使用 `<input>` + 绝对定位 `<span>` 叠加
- Ghost text 颜色: `var(--text-muted)` + `opacity: 0.5`
- 按 `Tab` 或点击 → 自动填入并发送
- 3 秒无操作后淡出切换下一条

### 5.2 轻量提示条（Light Toast）

**适用**: 输入框未聚焦，但有重要上下文建议

```
┌─────────────────────────────────────────────────────────┐
│  ┌─────────────────────────────────────────────────┐    │
│  │  📄 检测到你在阅读文献 · 需要总结摘要吗？  [✓] [✗] │    │
│  └─────────────────────────────────────────────────┘    │
├─────────────────────────────────────────────────────────┤
│  [🎙]  [有什么可以帮你的？                      ]  [➤]  │
└─────────────────────────────────────────────────────────┘
```

**实现要点**:
- 显示在输入条上方，不遮挡主内容
- 8 秒后自动消失（hover 时暂停）
- 点击 ✓ 执行建议，点击 ✗ 忽略并记录反馈
- 同一时间最多显示 1 条

### 5.3 面板内联建议（Inline Suggestion）

**适用**: 用户已打开 AI 对话面板

复用现有 `InlineSuggestion` 组件，增加更多类型支持。

---

## 6. 实现路线图

### Phase 1: 基础框架（1-2 天）

- [ ] 创建 `useAiContext.ts` — 上下文采集 hook
- [ ] 创建 `useAiTriggers.ts` — 触发引擎 hook
- [ ] 实现路由监听 + 行为追踪
- [ ] 实现 Ghost Text 呈现组件

### Phase 2: 核心规则（2-3 天）

- [ ] 实现文献阅读场景规则（3 条）
- [ ] 实现番茄钟场景规则（3 条）
- [ ] 实现全局场景规则（4 条）
- [ ] 添加用户反馈收集（接受/忽略/打断）

### Phase 3: 高级场景（3-5 天）

- [ ] 实现笔记编辑场景规则
- [ ] 实现任务管理场景规则
- [ ] 实现日程场景规则
- [ ] 添加规则冷却与会话计数

### Phase 4: 智能优化（持续）

- [ ] 根据用户反馈调整规则优先级
- [ ] 添加机器学习模型（可选）
- [ ] A/B 测试不同提示文案

---

## 7. 技术实现细节

### 7.1 上下文采集

```typescript
// hooks/useAiContext.ts
export function useAiContext(): UserContext {
  const [context, setContext] = useState<UserContext>(defaultContext);

  useEffect(() => {
    // 1. 路由监听
    const unlistenRoute = listenRouteChange((path) => {
      setContext(prev => ({
        ...prev,
        currentPage: pathToPage(path),
        lastAction: `navigate:${path}`,
        lastActionTime: new Date(),
      }));
    });

    // 2. 用户活动追踪（idle 检测）
    const idleTracker = createIdleTracker(5000, (idleTime) => {
      setContext(prev => ({ ...prev, idleTime }));
    });

    // 3. 选中文字监听
    const handleSelection = debounce(() => {
      const text = window.getSelection()?.toString();
      setContext(prev => ({
        ...prev,
        selectedText: text || undefined,
        selectedTextLength: text?.length || 0,
      }));
    }, 300);
    document.addEventListener('selectionchange', handleSelection);

    // 4. 页面可见性
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        setContext(prev => ({
          ...prev,
          lastAction: 'return_to_app',
          lastActionTime: new Date(),
        }));
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    // 5. 心跳更新（每分钟）
    const heartbeat = setInterval(() => {
      setContext(prev => ({
        ...prev,
        currentTime: new Date(),
        sessionDuration: Date.now() - sessionStartTime,
      }));
    }, 60000);

    return () => {
      unlistenRoute();
      idleTracker.destroy();
      document.removeEventListener('selectionchange', handleSelection);
      document.removeEventListener('visibilitychange', handleVisibility);
      clearInterval(heartbeat);
    };
  }, []);

  return context;
}
```

### 7.2 触发引擎

```typescript
// hooks/useAiTriggers.ts
export function useAiTriggers() {
  const context = useAiContext();
  const [activeSuggestion, setActiveSuggestion] = useState<Suggestion | null>(null);
  const triggeredRef = useRef<Set<string>>(new Set());
  const cooldownRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    // 遍历所有规则，检查触发条件
    for (const rule of defaultTriggers) {
      // 检查冷却
      const lastTriggered = cooldownRef.current.get(rule.id);
      if (lastTriggered && Date.now() - lastTriggered < rule.cooldown) {
        continue;
      }

      // 检查会话次数
      const sessionCount = getSessionTriggerCount(rule.id);
      if (sessionCount >= rule.maxPerSession) {
        continue;
      }

      // 检查条件
      if (rule.condition(context)) {
        setActiveSuggestion({
          ruleId: rule.id,
          text: rule.suggestion.text,
          detailText: rule.suggestion.detailText,
          action: rule.suggestion.action,
          display: rule.display,
          priority: rule.priority,
        });

        // 记录触发
        cooldownRef.current.set(rule.id, Date.now());
        incrementSessionTriggerCount(rule.id);
        break; // 一次只触发一条
      }
    }
  }, [context]);

  const accept = useCallback(() => {
    if (!activeSuggestion) return;
    executeSuggestion(activeSuggestion);
    setActiveSuggestion(null);
  }, [activeSuggestion]);

  const dismiss = useCallback(() => {
    if (!activeSuggestion) return;
    recordFeedback(activeSuggestion.ruleId, 'dismissed');
    setActiveSuggestion(null);
  }, [activeSuggestion]);

  return {
    suggestion: activeSuggestion,
    accept,
    dismiss,
  };
}
```

### 7.3 与现有组件集成

```tsx
// AiCompanionBar.tsx 集成 Ghost Text
function AiCompanionBar() {
  const { suggestion, accept, dismiss } = useAiTriggers();
  const [input, setInput] = useState('');

  return (
    <div>
      {/* 轻量提示条 */}
      {suggestion?.display === 'light_toast' && (
        <ContextSuggestion
          text={suggestion.detailText || suggestion.text}
          onAccept={accept}
          onDismiss={dismiss}
        />
      )}

      {/* 输入条 */}
      <div>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="有什么可以帮你的？"
        />
        {/* Ghost Text 叠加 */}
        {!input && suggestion?.display === 'ghost_text' && (
          <GhostText text={suggestion.text} onAccept={accept} />
        )}
      </div>
    </div>
  );
}
```

---

## 8. 隐私与安全

1. **本地处理**: 所有上下文采集和规则匹配在浏览器端完成，不上传敏感数据
2. **最小采集**: 只采集与 AI 建议直接相关的信息，不记录敏感内容
3. **用户控制**: 设置中提供「主动建议」总开关和频率调节
4. **透明性**: 所有建议显示触发原因（如「基于你正在阅读文献」）

---

## 9. 评估指标

| 指标 | 目标 | 测量方式 |
|:---|:---|:---|
| 建议接受率 | > 30% | 接受次数 / 展示次数 |
| 用户打断率 | < 10% | 手动关闭 / 展示次数 |
| 建议相关性评分 | > 4/5 | 用户反馈问卷 |
| 功能发现率 | > 50% | 通过预判首次使用功能的用户比例 |

---

## 10. 参考产品

| 产品 | 借鉴点 |
|:---|:---|
| **Arc Max** | Ghost text 提示方式 |
| **Notion AI** | 选中文字后的浮动操作 |
| **GitHub Copilot** | 渐进式能力展示 |
| **Claude Desktop** | 上下文感知文件建议 |
| **iOS Siri Suggestions** | 场景化触发时机 |
