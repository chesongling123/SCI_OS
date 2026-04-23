import { PrismaClient, TaskStatus, ReadingStatus, LiteratureType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 开始注入种子数据...');

  // 清理旧数据
  await prisma.referenceNote.deleteMany();
  await prisma.reference.deleteMany();
  await prisma.referenceFolder.deleteMany();
  await prisma.note.deleteMany();
  await prisma.noteFolder.deleteMany();
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

  // ========== 笔记种子数据 ==========
  // 创建文件夹
  const folderResearch = await prisma.noteFolder.create({
    data: { userId: user.id, name: '科研记录' },
  });
  const folderPapers = await prisma.noteFolder.create({
    data: { userId: user.id, name: '文献阅读' },
  });
  const folderIdeas = await prisma.noteFolder.create({
    data: { userId: user.id, name: '灵感想法' },
  });

  const notes = [
    {
      title: 'Transformer 综述阅读笔记',
      plainText: 'Attention Is All You Need 是 Transformer 架构的开山之作。核心创新在于完全基于注意力机制，摒弃了 RNN 和 CNN。\n\n关键概念：\n- Self-Attention：计算序列中每个位置与其他位置的关系\n- Multi-Head Attention：并行计算多组注意力，捕捉不同子空间信息\n- Positional Encoding：注入位置信息，因为 Attention 本身是无序的\n\n实验结果：在 WMT 2014 英德翻译任务上达到 28.4 BLEU，训练速度大幅提升。',
      tags: ['深度学习', 'NLP', '论文笔记'],
      folderId: folderPapers.id,
      isPinned: true,
    },
    {
      title: '实验 Week 12 数据汇总',
      plainText: '本周主要完成了 DiffAct 模型在 THUMOS14 数据集上的消融实验。\n\n实验配置：\n- Backbone: I3D + RGB\n- Batch size: 16\n- Learning rate: 1e-4 with cosine decay\n\n结果对比：\n- 完整模型: mAP@0.5 = 52.3\n- 去掉 temporal attention: mAP@0.5 = 48.7 (-3.6)\n- 去掉 actionness branch: mAP@0.5 = 49.1 (-3.2)\n\n结论：temporal attention 和 actionness branch 都是关键组件。下一步尝试引入多尺度特征融合。',
      tags: ['实验记录', 'DiffAct', 'THUMOS14'],
      folderId: folderResearch.id,
    },
    {
      title: '导师组会反馈 —— 开题报告修改',
      plainText: '2026-04-15 组会要点：\n\n1. 研究背景需要补充时序动作检测的最新进展（2024-2025）\n2. 创新点表述不够清晰，建议用「问题-方法-效果」三段式\n3. 技术路线图过于笼统，需要细化到模块级别\n4. 实验设计缺少对比基线，至少补充 3 个 SOTA 方法\n\n下次组会前完成：\n- [ ] 重写第一章研究背景（2页）\n- [ ] 画一张详细的技术路线图\n- [ ] 列出完整的实验对比表格',
      tags: ['导师', '开题报告', '待办'],
      folderId: folderResearch.id,
      isPinned: true,
    },
    {
      title: '关于 MCP 协议在科研工具中应用的思考',
      plainText: '最近调研了 Model Context Protocol (MCP)，感觉非常适合用来构建科研助手。\n\n核心想法：\n- 用 MCP 统一封装文献检索、实验数据查询、论文写作辅助等工具\n- AI 助手通过 Function Calling 调用这些工具，而不是直接生成答案\n- 本地优先：所有数据存在本地 PostgreSQL，AI 只读取不存储\n\n可能的实现路径：\n1. 先实现笔记系统的 RAG 检索（pgvector）\n2. 再封装 Zotero 的文献查询接口\n3. 最后接入论文写作辅助（LaTeX 模板、参考文献格式化）\n\n风险：MCP 生态还不够成熟，可能需要自己维护适配器。',
      tags: ['MCP', '架构设计', '灵感'],
      folderId: folderIdeas.id,
    },
    {
      title: 'PyTorch 2.0 compile 模式踩坑记录',
      plainText: '尝试将训练代码迁移到 PyTorch 2.0 的 torch.compile()，遇到几个问题：\n\n1. 动态 shape 导致 graph break\n   - 解决：在 collate_fn 中统一 padding 到固定长度\n\n2. 自定义 CUDA kernel 不兼容\n   - 解决：暂时 fallback 到 eager mode\n\n3. 编译时间太长（首次运行 5 分钟）\n   - 解决：使用 torch.compile(mode="reduce-overhead") 而非默认的 max-autotune\n\n性能提升：\n- 训练速度提升约 15-20%\n- 显存占用略微增加（约 200MB）\n\n结论：对于相对固定的模型结构值得开启，但调试阶段建议关闭。',
      tags: ['PyTorch', '工程优化', '踩坑'],
    },
  ];

  for (const n of notes) {
    const content = {
      type: 'doc',
      content: n.plainText.split('\n\n').map((para) => ({
        type: 'paragraph',
        content: [{ type: 'text', text: para }],
      })),
    };
    await prisma.note.create({
      data: {
        userId: user.id,
        title: n.title,
        content: content as any,
        plainText: n.plainText,
        tags: n.tags,
        folderId: n.folderId ?? null,
        isPinned: n.isPinned ?? false,
      },
    });
  }
  console.log(`✅ 已创建 ${notes.length} 条示例笔记 + 3 个文件夹`);

  // ========== 文献种子数据 ==========
  const references = [
    {
      title: 'Attention Is All You Need',
      authors: ['Vaswani, A.', 'Shazeer, N.', 'Parmar, N.', 'Uszkoreit, J.', 'Jones, L.', 'Gomez, A. N.', 'Kaiser, Ł.', 'Polosukhin, I.'],
      year: 2017,
      journal: 'Advances in Neural Information Processing Systems (NeurIPS)',
      pages: '5998-6008',
      doi: '10.48550/arXiv.1706.03762',
      url: 'https://arxiv.org/abs/1706.03762',
      abstract: 'The dominant sequence transduction models are based on complex recurrent or convolutional neural networks that include an encoder and a decoder. The best performing models also connect the encoder and decoder through an attention mechanism. We propose a new simple network architecture, the Transformer, based solely on attention mechanisms, dispensing with recurrence and convolutions entirely.',
      keywords: ['Transformer', 'Attention', 'NLP', 'Deep Learning'],
      literatureType: LiteratureType.CONFERENCE_PAPER,
      readingStatus: ReadingStatus.DEEP_READ,
      priority: 1,
      rating: 5,
      tags: ['深度学习', 'NLP', '必读经典'],
    },
    {
      title: 'BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding',
      authors: ['Devlin, J.', 'Chang, M. W.', 'Lee, K.', 'Toutanova, K.'],
      year: 2019,
      journal: 'Proceedings of NAACL-HLT',
      pages: '4171-4186',
      doi: '10.18653/v1/N19-1423',
      url: 'https://arxiv.org/abs/1810.04805',
      abstract: 'We introduce a new language representation model called BERT, which stands for Bidirectional Encoder Representations from Transformers. Unlike recent language representation models, BERT is designed to pre-train deep bidirectional representations from unlabeled text by jointly conditioning on both left and right context in all layers.',
      keywords: ['BERT', 'Pre-training', 'NLP', 'Transformer'],
      literatureType: LiteratureType.CONFERENCE_PAPER,
      readingStatus: ReadingStatus.READ,
      priority: 1,
      rating: 5,
      tags: ['深度学习', 'NLP', '预训练'],
    },
    {
      title: 'Deep Residual Learning for Image Recognition',
      authors: ['He, K.', 'Zhang, X.', 'Ren, S.', 'Sun, J.'],
      year: 2016,
      journal: 'IEEE Conference on Computer Vision and Pattern Recognition (CVPR)',
      pages: '770-778',
      doi: '10.1109/CVPR.2016.90',
      url: 'https://arxiv.org/abs/1512.03385',
      abstract: 'Deeper neural networks are more difficult to train. We present a residual learning framework to ease the training of networks that are substantially deeper than those used previously. We explicitly reformulate the layers as learning residual functions with reference to the layer inputs, instead of learning unreferenced functions.',
      keywords: ['ResNet', 'Computer Vision', 'Deep Learning', 'Image Recognition'],
      literatureType: LiteratureType.CONFERENCE_PAPER,
      readingStatus: ReadingStatus.DEEP_READ,
      priority: 1,
      rating: 5,
      tags: ['计算机视觉', '深度学习', '必读经典'],
    },
    {
      title: 'A Survey on Temporal Action Localization',
      authors: ['Zhao, Y.', 'Xiong, Y.', 'Lin, D.'],
      year: 2020,
      journal: 'IEEE Transactions on Pattern Analysis and Machine Intelligence',
      volume: '43',
      issue: '10',
      pages: '3323-3345',
      doi: '10.1109/TPAMI.2020.2984090',
      abstract: 'Temporal action localization is a fundamental yet challenging task in video understanding. In this survey, we provide a comprehensive review of the state-of-the-art approaches for temporal action localization, including one-stage and two-stage methods, as well as emerging topics such as weakly-supervised and few-shot learning.',
      keywords: ['Temporal Action Localization', 'Video Understanding', 'Survey'],
      literatureType: LiteratureType.JOURNAL_ARTICLE,
      readingStatus: ReadingStatus.READING,
      priority: 2,
      rating: 4,
      tags: ['时序动作检测', '综述', '视频理解'],
    },
    {
      title: 'An Image is Worth 16x16 Words: Transformers for Image Recognition at Scale',
      authors: ['Dosovitskiy, A.', 'Beyer, L.', 'Kolesnikov, A.', 'Weissenborn, D.', 'Zhai, X.', 'Unterthiner, T.', 'Dehghani, M.', 'Minderer, M.', 'Heigold, G.', 'Gelly, S.', 'Uszkoreit, J.', 'Houlsby, N.'],
      year: 2021,
      journal: 'International Conference on Learning Representations (ICLR)',
      doi: '10.48550/arXiv.2010.11929',
      url: 'https://arxiv.org/abs/2010.11929',
      abstract: 'While the Transformer architecture has become the de-facto standard for natural language processing tasks, its applications to computer vision remain limited. In vision, attention is either applied in conjunction with convolutional networks, or used to replace certain components of convolutional networks while keeping their overall structure in place.',
      keywords: ['Vision Transformer', 'ViT', 'Computer Vision', 'Transformer'],
      literatureType: LiteratureType.CONFERENCE_PAPER,
      readingStatus: ReadingStatus.UNREAD,
      priority: 2,
      tags: ['计算机视觉', 'ViT', 'Transformer'],
    },
    {
      title: 'Generative Adversarial Networks',
      authors: ['Goodfellow, I.', 'Pouget-Abadie, J.', 'Mirza, M.', 'Xu, B.', 'Warde-Farley, D.', 'Ozair, S.', 'Courville, A.', 'Bengio, Y.'],
      year: 2014,
      journal: 'Advances in Neural Information Processing Systems (NeurIPS)',
      pages: '2672-2680',
      doi: '10.48550/arXiv.1406.2661',
      url: 'https://arxiv.org/abs/1406.2661',
      abstract: 'We propose a new framework for estimating generative models via an adversarial process, in which we simultaneously train two models: a generative model G that captures the data distribution, and a discriminative model D that estimates the probability that a sample came from the training data rather than G.',
      keywords: ['GAN', 'Generative Models', 'Deep Learning'],
      literatureType: LiteratureType.CONFERENCE_PAPER,
      readingStatus: ReadingStatus.SKIMMED,
      priority: 3,
      rating: 4,
      tags: ['生成模型', '深度学习', '经典论文'],
    },
    {
      title: 'Language Models are Few-Shot Learners',
      authors: ['Brown, T.', 'Mann, B.', 'Ryder, N.', 'Subbiah, M.', 'Kaplan, J. D.', 'Dhariwal, P.', 'Neelakantan, A.', 'Shyam, P.', 'Sastry, G.', 'Askell, A.'],
      year: 2020,
      journal: 'Advances in Neural Information Processing Systems (NeurIPS)',
      pages: '1877-1901',
      doi: '10.48550/arXiv.2005.14165',
      url: 'https://arxiv.org/abs/2005.14165',
      abstract: 'Recent work has demonstrated substantial gains on many NLP tasks and benchmarks by pre-training on a large corpus of text followed by fine-tuning on a specific task. While typically task-agnostic in architecture, this method still requires task-specific fine-tuning datasets of thousands or tens of thousands of examples. By contrast, humans can perform many novel language tasks from only a few examples or from simple instructions.',
      keywords: ['GPT-3', 'Few-Shot Learning', 'Language Models', 'NLP'],
      literatureType: LiteratureType.CONFERENCE_PAPER,
      readingStatus: ReadingStatus.UNREAD,
      priority: 2,
      tags: ['大语言模型', 'NLP', 'GPT'],
    },
    {
      title: 'Momentum Contrast for Unsupervised Visual Representation Learning',
      authors: ['He, K.', 'Fan, H.', 'Wu, Y.', 'Xie, S.', 'Girshick, R.'],
      year: 2020,
      journal: 'IEEE/CVF Conference on Computer Vision and Pattern Recognition (CVPR)',
      pages: '9729-9738',
      doi: '10.1109/CVPR42600.2020.00975',
      url: 'https://arxiv.org/abs/1911.05722',
      abstract: 'We present Momentum Contrast (MoCo) for unsupervised visual representation learning. From a perspective on contrastive learning as dictionary look-up, we build a dynamic dictionary with a queue and a moving-averaged encoder.',
      keywords: ['Self-Supervised Learning', 'Contrastive Learning', 'Computer Vision'],
      literatureType: LiteratureType.CONFERENCE_PAPER,
      readingStatus: ReadingStatus.UNREAD,
      priority: 3,
      tags: ['自监督学习', '计算机视觉', '对比学习'],
    },
  ];

  for (const r of references) {
    await prisma.reference.create({
      data: {
        ...r,
        userId: user.id,
        authors: r.authors as any,
        keywords: r.keywords as any,
        tags: r.tags as any,
        keyFindings: [] as any,
      } as any,
    });
  }
  console.log(`✅ 已创建 ${references.length} 条示例文献`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
