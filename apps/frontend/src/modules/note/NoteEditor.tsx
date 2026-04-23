import { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { NoteToolbar } from './NoteToolbar';

interface NoteEditorProps {
  content: Record<string, unknown>;
  onChange: (json: Record<string, unknown>, plainText: string) => void;
}

/**
 * TipTap 富文本编辑器
 * 支持标题、加粗、斜体、列表、代码块、任务列表、链接
 */
export function NoteEditor({ content, onChange }: NoteEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Placeholder.configure({
        placeholder: '开始写作……',
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Table.configure({
        resizable: false,
      }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: content,
    onUpdate: ({ editor }) => {
      onChange(editor.getJSON() as Record<string, unknown>, editor.getText());
    },
    editorProps: {
      attributes: {
        class: 'max-w-none focus:outline-none min-h-[300px] px-4 py-3',
        style: 'color: var(--text-primary);',
      },
    },
  });

  // 外部 content 变化时更新编辑器内容
  useEffect(() => {
    if (editor && content && !editor.isDestroyed) {
      const current = editor.getJSON();
      if (JSON.stringify(current) !== JSON.stringify(content)) {
        editor.commands.setContent(content);
      }
    }
  }, [editor, content]);

  if (!editor) {
    return (
      <div className="flex items-center justify-center h-[300px]">
        <div
          className="w-8 h-8 rounded-full border-2 animate-spin"
          style={{
            borderColor: 'var(--glass-border)',
            borderTopColor: 'oklch(0.52 0.18 260)',
          }}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <NoteToolbar editor={editor} />
      <div className="flex-1 overflow-y-auto">
        <EditorContent editor={editor} className="tiptap-content" />
      </div>
    </div>
  );
}
