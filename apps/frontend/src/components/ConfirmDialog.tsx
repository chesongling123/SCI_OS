import { createPortal } from 'react-dom';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
}

/**
 * 通用确认弹窗 — 通过 Portal 挂载到 body，确保层级最高
 */
export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = '确认操作',
  description = '确定要执行此操作吗？此操作不可撤销。',
  confirmText = '确认',
  cancelText = '取消',
  destructive = false,
}: ConfirmDialogProps) {
  if (!open) return null;

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* 遮罩 */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* 弹窗 */}
      <div className="confirm-dialog relative w-full max-w-sm rounded-2xl p-6">
        {/* 图标 + 标题 */}
        <div className="flex items-start gap-3 mb-3">
          <div
            className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
            style={{
              background: destructive
                ? 'oklch(0.55 0.15 25 / 0.18)'
                : 'oklch(0.55 0.14 260 / 0.14)',
            }}
          >
            <AlertTriangle
              className="w-5 h-5"
              style={{ color: destructive ? '#ef4444' : '#6366f1' }}
            />
          </div>
          <div className="flex-1 min-w-0 pt-0.5">
            <h3 className="confirm-dialog-title text-base font-semibold leading-snug">
              {title}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="confirm-dialog-close shrink-0 -mt-1 -mr-1 p-1 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 描述 */}
        <p className="confirm-dialog-desc text-sm leading-relaxed mb-5 pl-[52px]">
          {description}
        </p>

        {/* 按钮 */}
        <div className="flex gap-2.5 pl-[52px]">
          <button
            type="button"
            onClick={onClose}
            className="confirm-dialog-cancel flex-1 py-2 rounded-xl text-sm font-medium transition-all"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="flex-1 py-2 rounded-xl text-sm font-semibold text-white transition-all"
            style={{
              background: destructive ? '#dc2626' : 'oklch(0.28 0.02 60)',
              boxShadow: '0 1px 0 rgba(255,255,255,0.2) inset',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = destructive
                ? '#b91c1c'
                : 'oklch(0.34 0.025 60)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = destructive
                ? '#dc2626'
                : 'oklch(0.28 0.02 60)';
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
