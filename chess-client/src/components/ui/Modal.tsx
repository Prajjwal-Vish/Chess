import { useEffect, type ReactNode } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
}

export function Modal({ open, onClose, children, title }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="absolute inset-0 flex items-center justify-center z-50 backdrop-modal"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="rounded-modal border-half border-border-brand min-w-[320px] max-w-[380px] w-full px-[24px] py-[22px] bg-modal-panel shadow-modal">
        {title && (
          <div className="flex items-center justify-between mb-[18px]">
            <h3 className="text-[15px] font-medium text-text-primary m-0">{title}</h3>
            <button
              onClick={onClose}
              className="text-text-tertiary text-[18px] leading-none cursor-pointer bg-transparent border-none p-0 hover:text-text-secondary transition-colors"
            >
              ×
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
