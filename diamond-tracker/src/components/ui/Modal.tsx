import { ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

export function Modal({ open, onClose, title, children }: ModalProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="relative w-full sm:max-w-md bg-surface border border-border rounded-t-card sm:rounded-card p-5 max-h-[85vh] overflow-y-auto animate-slide-up safe-bottom">
        {title && (
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold text-lg text-text">{title}</h3>
            <button onClick={onClose} className="text-muted hover:text-text transition-colors">
              <X size={20} />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
