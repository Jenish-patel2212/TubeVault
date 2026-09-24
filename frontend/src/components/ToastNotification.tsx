import React from 'react';
import { AlertCircle, AlertTriangle, CheckCircle, Info, X, Trash2 } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message: string;
}

interface ToastNotificationProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
  onClearAll?: () => void;
}

export const ToastNotification: React.FC<ToastNotificationProps> = ({
  toasts,
  onDismiss,
  onClearAll,
}) => {
  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed bottom-5 right-5 z-50 flex flex-col space-y-2.5 max-w-md w-full px-4 pointer-events-none"
    >
      {/* Clear All Notices Action Bar when multiple notifications exist */}
      {toasts.length > 1 && onClearAll && (
        <div className="flex justify-end pointer-events-auto animate-fade-in">
          <button
            onClick={onClearAll}
            className="flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-gray-900/90 dark:bg-gray-800/90 text-gray-200 hover:text-white hover:bg-gray-800 dark:hover:bg-gray-700 backdrop-blur-md border border-gray-700/60 shadow-lg transition-all"
            title="Clear all active notifications"
          >
            <Trash2 className="w-3.5 h-3.5 text-indigo-400" />
            <span>Clear all notices ({toasts.length})</span>
          </button>
        </div>
      )}

      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto p-4 rounded-2xl shadow-2xl backdrop-blur-xl border flex items-start space-x-3 transition-all duration-300 animate-slide-up relative overflow-hidden ${
            t.type === 'error'
              ? 'bg-red-950/90 border-red-800/70 text-red-200'
              : t.type === 'success'
              ? 'bg-emerald-950/90 border-emerald-800/70 text-emerald-200'
              : t.type === 'warning'
              ? 'bg-amber-950/90 border-amber-800/70 text-amber-200'
              : 'bg-indigo-950/90 border-indigo-800/70 text-indigo-200'
          }`}
        >
          {t.type === 'error' && <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />}
          {t.type === 'success' && <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />}
          {t.type === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />}
          {t.type === 'info' && <Info className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />}

          <div className="flex-1 min-w-0 pr-2">
            <h5 className="font-bold text-sm text-white tracking-wide">{t.title}</h5>
            <p className="text-xs mt-0.5 opacity-90 leading-relaxed break-words">{t.message}</p>
          </div>

          <button
            onClick={() => onDismiss(t.id)}
            className="p-1 hover:bg-white/15 rounded-lg text-gray-400 hover:text-white transition-colors flex-shrink-0"
            title="Clear this notice"
            aria-label="Dismiss notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};
