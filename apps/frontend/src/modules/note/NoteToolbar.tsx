import type { Editor } from '@tiptap/react';
import {
  Bold, Italic, Strikethrough, Heading1, Heading2, Heading3,
  List, ListOrdered, CheckSquare, Code, Quote, Link, Undo, Redo,
} from 'lucide-react';

interface NoteToolbarProps {
  editor: Editor;
}

/**
 * 编辑器顶部工具栏
 * 液态玻璃风格，与整体 UI 保持一致
 */
export function NoteToolbar({ editor }: NoteToolbarProps) {
  const tools = [
    {
      icon: Bold,
      action: () => editor.chain().focus().toggleBold().run(),
      active: () => editor.isActive('bold'),
      title: '加粗',
    },
    {
      icon: Italic,
      action: () => editor.chain().focus().toggleItalic().run(),
      active: () => editor.isActive('italic'),
      title: '斜体',
    },
    {
      icon: Strikethrough,
      action: () => editor.chain().focus().toggleStrike().run(),
      active: () => editor.isActive('strike'),
      title: '删除线',
    },
    { divider: true },
    {
      icon: Heading1,
      action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
      active: () => editor.isActive('heading', { level: 1 }),
      title: '一级标题',
    },
    {
      icon: Heading2,
      action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
      active: () => editor.isActive('heading', { level: 2 }),
      title: '二级标题',
    },
    {
      icon: Heading3,
      action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
      active: () => editor.isActive('heading', { level: 3 }),
      title: '三级标题',
    },
    { divider: true },
    {
      icon: List,
      action: () => editor.chain().focus().toggleBulletList().run(),
      active: () => editor.isActive('bulletList'),
      title: '无序列表',
    },
    {
      icon: ListOrdered,
      action: () => editor.chain().focus().toggleOrderedList().run(),
      active: () => editor.isActive('orderedList'),
      title: '有序列表',
    },
    {
      icon: CheckSquare,
      action: () => editor.chain().focus().toggleTaskList().run(),
      active: () => editor.isActive('taskList'),
      title: '任务列表',
    },
    { divider: true },
    {
      icon: Code,
      action: () => editor.chain().focus().toggleCodeBlock().run(),
      active: () => editor.isActive('codeBlock'),
      title: '代码块',
    },
    {
      icon: Quote,
      action: () => editor.chain().focus().toggleBlockquote().run(),
      active: () => editor.isActive('blockquote'),
      title: '引用',
    },
    {
      icon: Link,
      action: () => {
        const url = window.prompt('输入链接地址');
        if (url) {
          editor.chain().focus().setLink({ href: url }).run();
        }
      },
      active: () => editor.isActive('link'),
      title: '链接',
    },
    { divider: true },
    {
      icon: Undo,
      action: () => editor.chain().focus().undo().run(),
      active: () => false,
      title: '撤销',
    },
    {
      icon: Redo,
      action: () => editor.chain().focus().redo().run(),
      active: () => false,
      title: '重做',
    },
  ];

  return (
    <div
      className="flex items-center gap-0.5 px-3 py-2 border-b flex-wrap"
      style={{
        background: 'var(--glass-bg)',
        borderColor: 'var(--glass-border)',
      }}
    >
      {tools.map((tool, index) => {
        if ('divider' in tool) {
          return (
            <div
              key={`div-${index}`}
              className="w-px h-5 mx-1"
              style={{ background: 'var(--glass-border)' }}
            />
          );
        }

        const Icon = tool.icon;
        const isActive = tool.active();

        return (
          <button
            key={tool.title}
            onClick={tool.action}
            title={tool.title}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-150"
            style={{
              background: isActive ? 'oklch(0.52 0.18 260 / 0.15)' : 'transparent',
              color: isActive ? 'oklch(0.7 0.15 260)' : 'var(--text-secondary)',
            }}
            onMouseEnter={(e) => {
              if (!isActive) {
                (e.currentTarget as HTMLButtonElement).style.background = 'var(--glass-bg-hover)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
              }
            }}
          >
            <Icon className="w-4 h-4" />
          </button>
        );
      })}
    </div>
  );
}
