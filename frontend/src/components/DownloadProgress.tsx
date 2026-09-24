import React from 'react';
import { Download, CheckCircle2, AlertTriangle, XCircle, RefreshCw, Save, Loader2, Gauge, Clock, X } from 'lucide-react';
import { DownloadJobStatus } from '../types/api';

interface DownloadProgressProps {
  status: DownloadJobStatus | null;
  downloadUrl?: string;
  onCancel: () => void;
  onRetry: () => void;
  onSaveFile: () => void;
  onDismiss?: () => void;
}

export const DownloadProgress: React.FC<DownloadProgressProps> = ({
  status,
  downloadUrl,
  onCancel,
  onRetry,
  onSaveFile,
  onDismiss,
}) => {
  if (!status) return null;

  const isCompleted = status.status === 'completed';
  const isFailed = status.status === 'failed';
  const isCancelled = status.status === 'cancelled';
  const isDownloading = status.status === 'downloading' || status.status === 'pending';

  return (
    <div className="glass-card rounded-3xl p-6 sm:p-8 shadow-2xl shadow-red-600/10 mb-8 border border-red-500/30 dark:border-red-500/30 transition-all duration-300 relative">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          {isDownloading && (
            <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center animate-pulse border border-red-500/20">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          )}

          {isCompleted && (
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          )}

          {(isFailed || isCancelled) && (
            <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center border border-red-500/20">
              <XCircle className="w-6 h-6" />
            </div>
          )}

          <div>
            <h4 className="font-black text-slate-900 dark:text-white text-base sm:text-lg font-display">
              {isDownloading && 'Retrieving & Processing Media...'}
              {isCompleted && 'Download Ready!'}
              {isFailed && 'Download Failed'}
              {isCancelled && 'Download Cancelled'}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isDownloading && 'Merging video & audio streams securely in high-speed storage'}
              {isCompleted && 'Click below to save the file directly to your device'}
              {(isFailed || isCancelled) && (status.error || 'The download could not be completed.')}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2">
          {isDownloading && (
            <button
              onClick={onCancel}
              className="px-3 py-1.5 rounded-lg text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-500/10 border border-red-500/25 transition-colors"
            >
              Cancel
            </button>
          )}

          {(isFailed || isCancelled) && (
            <button
              onClick={onRetry}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-500/10 border border-red-500/25 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
          )}

          {!isDownloading && onDismiss && (
            <button
              onClick={onDismiss}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/60 transition-colors"
              title="Clear download panel"
              aria-label="Dismiss progress panel"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar Container */}
      <div className="my-4">
        <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
          <span>{status.percent}% Complete</span>
          <span>{status.file_size_formatted || 'Calculating size...'}</span>
        </div>

        <div className="w-full h-3 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-300/40 dark:border-slate-700/50">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              isCompleted
                ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50'
                : isFailed || isCancelled
                ? 'bg-red-500'
                : 'bg-gradient-to-r from-red-600 via-rose-500 to-amber-400 animate-gradient-x shadow-sm shadow-red-500/50'
            }`}
            style={{ width: `${Math.max(status.percent, 3)}%` }}
          />
        </div>
      </div>

      {/* Speed & ETA Stats */}
      {isDownloading && (
        <div className="flex items-center justify-between pt-2 text-xs text-slate-500 dark:text-slate-400 border-t border-slate-200/60 dark:border-slate-800/60">
          <div className="flex items-center space-x-1.5">
            <Gauge className="w-3.5 h-3.5 text-red-500" />
            <span>Speed: <strong className="text-slate-800 dark:text-slate-200">{status.speed_formatted}</strong></span>
          </div>

          <div className="flex items-center space-x-1.5">
            <Clock className="w-3.5 h-3.5 text-rose-500" />
            <span>ETA: <strong className="text-slate-800 dark:text-slate-200">{status.eta_seconds !== undefined && status.eta_seconds !== null ? `${status.eta_seconds}s` : 'Calculating...'}</strong></span>
          </div>
        </div>
      )}

      {/* Completed Save File CTA */}
      {isCompleted && (
        <div className="mt-6 pt-4 border-t border-gray-200/60 dark:border-gray-800/60 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-xs">
            File name: <strong className="text-slate-800 dark:text-slate-200">{status.filename}</strong>
          </span>

          {downloadUrl ? (
            <a
              href={downloadUrl}
              download={status.filename || 'tube_vault_media'}
              target="_blank"
              rel="noopener noreferrer"
              onClick={onSaveFile}
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl font-extrabold text-white bg-emerald-600 hover:bg-emerald-500 active:scale-95 transition-all shadow-lg shadow-emerald-500/25 flex items-center justify-center space-x-2 text-sm text-center"
            >
              <Save className="w-4 h-4" />
              <span>Save to Phone / Device</span>
            </a>
          ) : (
            <button
              onClick={onSaveFile}
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl font-extrabold text-white bg-emerald-600 hover:bg-emerald-500 active:scale-95 transition-all shadow-lg shadow-emerald-500/25 flex items-center justify-center space-x-2 text-sm text-center"
            >
              <Save className="w-4 h-4" />
              <span>Save to Phone / Device</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
