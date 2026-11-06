'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X, Undo2 } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastContextValue {
  showToast: (toast: Omit<ToastItem, 'id'>) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  warning: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
  undo: (message: string, onUndo: () => void, title?: string, duration?: number) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const noopToast: ToastContextValue = {
  showToast: () => {},
  success: () => {},
  error: () => {},
  warning: () => {},
  info: () => {},
  undo: () => {},
  dismiss: () => {},
};

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  return context || noopToast;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    ({ type, title, message, duration = 4000, action }: Omit<ToastItem, 'id'>) => {
      const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const newToast: ToastItem = { id, type, title, message, duration, action };

      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          dismiss(id);
        }, duration);
      }
    },
    [dismiss]
  );

  const success = useCallback(
    (message: string, title?: string) => showToast({ type: 'success', message, title }),
    [showToast]
  );

  const error = useCallback(
    (message: string, title?: string) => showToast({ type: 'error', message, title, duration: 6000 }),
    [showToast]
  );

  const warning = useCallback(
    (message: string, title?: string) => showToast({ type: 'warning', message, title }),
    [showToast]
  );

  const info = useCallback(
    (message: string, title?: string) => showToast({ type: 'info', message, title }),
    [showToast]
  );

  const undo = useCallback(
    (message: string, onUndo: () => void, title?: string, duration: number = 5000) => {
      showToast({
        type: 'info',
        title: title || 'Status Updated',
        message,
        duration,
        action: {
          label: 'Undo',
          onClick: onUndo,
        },
      });
    },
    [showToast]
  );

  return (
    <ToastContext.Provider value={{ showToast, success, error, warning, info, undo, dismiss }}>
      {children}
      {/* Toast Render Container */}
      {toasts.length > 0 && (
        <div
          aria-live="polite"
          className="fixed z-50 pointer-events-none inset-x-0 bottom-20 md:bottom-6 md:inset-x-auto md:right-6 flex flex-col items-center md:items-end gap-2 px-4 sm:px-0 max-w-full overflow-hidden"
        >
        {toasts.map((toast) => {
          const icons = {
            success: <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />,
            error: <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />,
            warning: <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />,
            info: <Info className="w-5 h-5 text-blue-600 shrink-0" />,
          };

          const borderColors = {
            success: 'border-emerald-200 bg-emerald-50/95 text-emerald-950',
            error: 'border-red-200 bg-red-50/95 text-red-950',
            warning: 'border-amber-200 bg-amber-50/95 text-amber-950',
            info: 'border-blue-200 bg-blue-50/95 text-blue-950',
          };

          return (
            <div
              key={toast.id}
              role={toast.type === 'error' ? 'alert' : 'status'}
              className={cn(
                'pointer-events-auto flex items-start gap-3 p-3.5 sm:p-4 rounded-xl border shadow-lg backdrop-blur-xs transition-all duration-200 animate-slide-up w-full max-w-sm sm:w-84',
                borderColors[toast.type]
              )}
            >
              {icons[toast.type]}
              <div className="flex-1 min-w-0 pt-0.5">
                {toast.title && (
                  <p className="text-xs font-bold leading-tight mb-0.5">
                    {toast.title}
                  </p>
                )}
                <p className="text-xs leading-snug font-medium break-words">
                  {toast.message}
                </p>

                {toast.action && (
                  <div className="mt-2">
                    <button
                      type="button"
                      data-tutorial="undo-action"
                      onClick={() => {
                        toast.action?.onClick();
                        dismiss(toast.id);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-white hover:bg-gray-100 text-gray-900 border border-gray-300 shadow-2xs transition-all active:scale-95 pointer-events-auto"
                    >
                      <Undo2 className="w-3.5 h-3.5 text-blue-600" />
                      <span>{toast.action.label}</span>
                    </button>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                className="text-gray-400 hover:text-gray-700 p-1 rounded-md -mr-1 -mt-1 transition-colors min-h-[32px] min-w-[32px] flex items-center justify-center"
                aria-label="Close notification"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
        </div>
      )}
    </ToastContext.Provider>
  );
}
