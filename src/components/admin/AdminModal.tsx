import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';
import { X } from 'lucide-react';

interface AdminModalProps {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'md' | 'lg' | 'xl';
}

const SIZE_CLASSES: Record<'md' | 'lg' | 'xl', string> = {
  md: 'max-w-xl',
  lg: 'max-w-4xl',
  xl: 'max-w-6xl',
};

function AdminModal({
  open,
  title,
  description,
  onClose,
  children,
  footer,
  size = 'lg',
}: AdminModalProps) {
  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/60 px-4 py-8 backdrop-blur-md">
      <div
        className={`relative flex max-h-full w-full flex-col overflow-hidden rounded-[28px] border border-slate-200/60 bg-white shadow-[0_32px_80px_rgba(15,23,42,0.35)] ${SIZE_CLASSES[size] ?? SIZE_CLASSES.lg}`}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="relative border-b border-slate-100 px-6 py-5 sm:px-8">
          <div className="pr-12">
            <div className="mb-2 flex items-center gap-2.5">
              <div className="h-[3px] w-4 rounded-full bg-primary" />
              <p className="text-[9px] font-black uppercase tracking-[0.34em] text-slate-400">
                Admin Workspace
              </p>
            </div>
            <h2 className="text-xl font-black tracking-tight text-slate-950 sm:text-2xl">
              {title}
            </h2>
            {description && (
              <p className="mt-2 max-w-2xl text-[13px] leading-6 text-slate-500">{description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="absolute right-5 top-5 inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-400 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
            aria-label="Close modal"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto px-6 py-6 sm:px-8">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="border-t border-slate-100 bg-slate-50/60 px-6 py-4 sm:px-8">
            {footer}
          </div>
        )}
      </div>
      <button
        type="button"
        className="absolute inset-0 -z-10 cursor-default"
        onClick={onClose}
        aria-hidden="true"
      />
    </div>,
    document.body
  );
}

export default AdminModal;
