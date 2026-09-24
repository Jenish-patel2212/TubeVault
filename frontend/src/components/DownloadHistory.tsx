import React from 'react';
import { History, Trash2, Video, Music, CheckCircle2, XCircle, ExternalLink, FileText } from 'lucide-react';
import { HistoryItem } from '../types/api';
import { generateLicenseCertificate } from '../utils/api';
import { downloadTextFile, getActiveLicenseKey } from '../utils/storage';

interface DownloadHistoryProps {
  history: HistoryItem[];
  onClearHistory: () => void;
  onReAnalyze: (url: string) => void;
  onDeleteItem?: (id: string) => void;
  onNotify?: (title: string, message: string, type?: 'success' | 'error' | 'info') => void;
}

export const DownloadHistory: React.FC<DownloadHistoryProps> = ({
  history,
  onClearHistory,
  onReAnalyze,
  onDeleteItem,
  onNotify,
}) => {
  const handleDownloadCertificate = async (item: HistoryItem) => {
    try {
      const key = item.license_key || getActiveLicenseKey() || 'TVLT-PRO-ACTIVE';
      const cert = await generateLicenseCertificate({
        license_key: key,
        media_title: item.title,
        media_url: item.url,
        format_label: item.format_label
      });
      if (cert && cert.certificate_text) {
        downloadTextFile(cert.filename, cert.certificate_text);
        onNotify?.('Certificate Downloaded', `Saved "${cert.filename}" to your computer!`, 'success');
      }
    } catch (e: any) {
      onNotify?.('Certificate Error', e.message || 'Failed to download certificate.', 'error');
    }
  };

  if (history.length === 0) {
    return (
      <div className="glass-card rounded-3xl p-12 text-center border border-slate-200/80 dark:border-slate-800/80 my-8">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center mx-auto mb-4 border border-red-500/20">
          <History className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 font-display">No Download History Yet</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
          Your recently processed YouTube media links will appear here for easy access. History is kept private in your browser.
        </p>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-3xl p-6 sm:p-8 shadow-xl shadow-red-600/5 my-8 border border-slate-200/80 dark:border-slate-800/80">
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200/60 dark:border-slate-800/60">
        <div>
          <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center space-x-2 font-display">
            <History className="w-5 h-5 text-red-500" />
            <span>Local Download History</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Stored locally in your browser. Media files are automatically cleared from the server.
          </p>
        </div>

        <button
          onClick={onClearHistory}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-500/10 border border-red-500/25 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Clear All</span>
        </button>
      </div>

      <div className="space-y-3">
        {history.map((item) => (
          <div
            key={item.id}
            className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-2xl bg-white/70 dark:bg-slate-900/60 hover:bg-white dark:hover:bg-slate-900 border border-slate-200/80 dark:border-slate-800 transition-all duration-200 gap-3 hover:border-red-500/40"
          >
            <div className="flex items-center space-x-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center flex-shrink-0 border border-red-500/20">
                {item.media_type === 'video' ? (
                  <Video className="w-5 h-5" />
                ) : (
                  <Music className="w-5 h-5" />
                )}
              </div>

              <div className="min-w-0">
                <h4 className="font-bold text-slate-900 dark:text-white text-sm truncate">
                  {item.title}
                </h4>
                <div className="flex items-center space-x-3 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  <span>{item.date}</span>
                  <span>•</span>
                  <span className="font-semibold text-red-600 dark:text-red-400">{item.format_label}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-200/40 dark:border-slate-700/40">
              <span
                className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  item.status === 'Completed'
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : 'bg-red-500/10 text-red-600 dark:text-red-400'
                }`}
              >
                {item.status === 'Completed' ? (
                  <CheckCircle2 className="w-3 h-3" />
                ) : (
                  <XCircle className="w-3 h-3" />
                )}
                <span>{item.status}</span>
              </span>

              {item.status === 'Completed' && (
                <button
                  onClick={() => handleDownloadCertificate(item)}
                  className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/25 transition-colors"
                  title="Download Official License Certificate (.txt)"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Certificate</span>
                </button>
              )}

              <button
                onClick={() => onReAnalyze(item.url)}
                className="flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-200/60 dark:hover:bg-gray-700/60 transition-colors"
                title="Re-analyze video"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Analyze</span>
              </button>

              {onDeleteItem && (
                <button
                  onClick={() => onDeleteItem(item.id)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                  title="Remove from history"
                  aria-label="Delete history item"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
