import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, type: ToastType = 'info') => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-20 sm:bottom-4 left-1/2 -translate-x-1/2 z-[60] flex flex-col gap-2 w-full max-w-sm px-4 pointer-events-none">
        {toasts.map((t) => {
          const Icon = t.type === 'success' ? CheckCircle2 : t.type === 'error' ? AlertCircle : Info;
          const color = t.type === 'success' ? 'text-sage' : t.type === 'error' ? 'text-danger' : 'text-accent';
          return (
            <div
              key={t.id}
              className="flex items-center gap-2.5 bg-surface border border-border rounded-card px-4 py-3 shadow-lg animate-slide-up pointer-events-auto"
            >
              <Icon size={18} className={color} />
              <span className="text-sm text-text">{t.message}</span>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (ctx === undefined) throw new Error('useToast must be used within ToastProvider');
  return ctx.toast;
}
