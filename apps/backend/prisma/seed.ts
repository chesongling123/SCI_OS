import { PrismaClient, TaskStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 开始注入种子数据...');

  // 清理旧数据
  await prisma.pomodoroSession.deleteMany();
  await prisma.task.deleteMany();
  await prisma.event.deleteMany();
  await prisma.user.deleteMany();

  // 创建默认用户
  const user = await prisma.user.upsert({
    where: { email: 'demo@phd-os.local' },
    update: {},
    create: { email: 'demo@phd-os.local', name: '演示用户', password: '$2b$10$cFhE6/.sYggl3eB5nbCEGeUIvlvO4K3BB4u96GZEMzQierFjq9YwG' },
  });

  // ========== 任务种子数据 ==========
  const tasks = [
    { title: '阅读 Transformer 综述论文', status: TaskStatus.DONE, priority: 2, sortOrder: 0, pomodoroCount: 3 },
    { title: '整理实验数据（Week 12）', status: TaskStatus.DONE, priority: 1, sortOrder: 1, pomodoroCount: 2 },
    { title: '撰写论文第三章方法论', status: TaskStatus.IN_PROGRESS, priority: 1, sortOrder: 0, pomodoroCount: 4 },
    { title: '复现 DiffAct 基准实验', status: TaskStatus.IN_PROGRESS, priority: 2, sortOrder: 1, pomodoroCount: 2 },
    { title: '回复导师关于开题报告的修改意见', status: TaskStatus.IN_PROGRESS, priority: 3, sortOrder: 2, pomodoroCount: 1 },
    { title: '调研 MCP 协议在科研工具中的应用', status: TaskStatus.TODO, priority: 2, sortOrder: 0, pomodoroCount: 0 },
    { title: '准备组会 PPT（下周四）', status: TaskStatus.TODO, priority: 1, sortOrder: 1, pomodoroCount: 0 },
    { title: '更新 Zotero 文献库标签', status: TaskStatus.TODO, priority: 4, sortOrder: 2, pomodoroCount: 0 },
    { title: '学习 PyTorch 2.0 compile 模式', status: TaskStatus.TODO, priority: 3, sortOrder: 3, pomodoroCount: 0 },
    { title: '预定下周实验室设备', status: TaskStatus.TODO, priority: 4, sortOrder: 4, pomodoroCount: 0 },
  ];

  for (const t of tasks) {
    await prisma.task.create({ data: { ...t, userId: user.id } as any });
  }
  console.log(`✅ 已创建 ${tasks.length} 条示例任务`);

  // ========== 日程种子数据 ==========
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const events = [
    {
      title: '组会汇报 — DiffAct 实验进展',
      startAt: new Date(today.getTime() + 9 * 60 * 60 * 1000),
      endAt: new Date(today.getTime() + 10.5 * 60 * 60 * 1000),
      color: '#3b82f6',
      location: '实验室 302',
    },
    {
      title: '文献阅读 — Transformer 综述',
      startAt: new Date(today.getTime() + 14 * 60 * 60 * 1000),
      endAt: new Date(today.getTime() + 16 * 60 * 60 * 1000),
      color: '#22c55e',
      description: '重点阅读 Attention 机制章节',
    },
    {
      title: '番茄钟 — 论文第三章写作',
      startAt: new Date(today.getTime() + 16.5 * 60 * 60 * 1000),
      endAt: new Date(today.getTime() + 18.5 * 60 * 60 * 1000),
      color: '#a855f7',
    },
    {
      title: '导师一对一讨论',
      startAt: new Date(today.getTime() + 24 * 60 * 60 * 1000 + 10 * 60 * 60 * 1000),
      endAt: new Date(today.getTime() + 24 * 60 * 60 * 1000 + 11 * 60 * 60 * 1000),
      color: '#ef4444',
      location: '导师办公室',
    },
    {
      title: '学术研讨会（线上）',
      startAt: new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000 + 14 * 60 * 60 * 1000),
      endAt: new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000 + 16 * 60 * 60 * 1000),
      color: '#f59e0b',
      description: 'CVPR 2026 预讲会',
    },
    {
      title: '论文 Deadline',
      startAt: new Date(today.getTime() + 5 * 24 * 60 * 60 * 1000),
      endAt: new Date(today.getTime() + 5 * 24 * 60 * 60 * 1000 + 1 * 60 * 60 * 1000),
      isAllDay: true,
      color: '#ef4444',
    },
  ];

  for (const e of events) {
    await prisma.event.create({
      data: { ...e, timezone: 'Asia/Shanghai', rrule: null, userId: user.id } as any,
    });
  }
  console.log(`✅ 已创建 ${events.length} 条示例日程`);

  // ========== 番茄钟历史数据（用于热力图） ==========
  const pomodoroSessions = [];
  for (let dayOffset = 0; dayOffset < 90; dayOffset++) {
    const date = new Date(today);
    date.setDate(date.getDate() - dayOffset);

    // 随机生成 0-5 个番茄钟/天
    const count = Math.floor(Math.random() * 6);
    for (let i = 0; i < count; i++) {
      const startedAt = new Date(date.getTime() + (9 + i * 2) * 60 * 60 * 1000);
      const duration = 1500 + Math.floor(Math.random() * 300 - 150); // 20-27 分钟
      pomodoroSessions.push({
        userId: user.id,
        taskId: null,
        plannedDuration: 1500,
        duration,
        interruptions: Math.random() > 0.7 ? 1 : 0,
        startedAt,
        endedAt: new Date(startedAt.getTime() + duration * 1000),
      });
    }
  }

  for (const s of pomodoroSessions) {
    await prisma.pomodoroSession.create({ data: s as any });
  }
  console.log(`✅ 已创建 ${pomodoroSessions.length} 条番茄钟历史记录`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
