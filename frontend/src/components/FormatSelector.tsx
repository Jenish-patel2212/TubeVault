import React, { useState } from 'react';
import { Video, Music, Download, Check, Sparkles, HardDrive } from 'lucide-react';
import { FormatOption, MediaMetadata, MediaType } from '../types/api';

interface FormatSelectorProps {
  metadata: MediaMetadata;
  onSelectFormat: (format: FormatOption, type: MediaType) => void;
  isDownloading: boolean;
}

export const FormatSelector: React.FC<FormatSelectorProps> = ({
  metadata,
  onSelectFormat,
  isDownloading,
}) => {
  const [activeTab, setActiveTab] = useState<MediaType>('video');

  const videoFormats = metadata?.video_formats || [];
  const audioFormats = metadata?.audio_formats || [];
  const formats = activeTab === 'video' ? videoFormats : audioFormats;

  return (
    <div className="glass-card rounded-3xl p-6 sm:p-8 shadow-xl shadow-red-600/5 mb-8 border border-slate-200/80 dark:border-slate-800/80">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-200/60 dark:border-slate-800/60">
        <div>
          <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center space-x-2 font-display">
            <span>Available Download Formats</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-red-100 dark:bg-red-950/70 text-red-600 dark:text-red-400 font-bold border border-red-500/20">
              Verified
            </span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Choose your desired quality stream. Merged in real-time with ultra-fast speed.
          </p>
        </div>

        {/* Media Type Switcher Tabs */}
        <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-900/80 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
          <button
            onClick={() => setActiveTab('video')}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === 'video'
                ? 'bg-red-600 text-white font-semibold shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Video className="w-4 h-4" />
            <span>Video ({videoFormats.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('audio')}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === 'audio'
                ? 'bg-red-600 text-white font-semibold shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Music className="w-4 h-4" />
            <span>Audio ({audioFormats.length})</span>
          </button>
        </div>
      </div>

      {/* Format Grid */}
      {formats.length === 0 ? (
        <div className="text-center py-12 text-slate-500 dark:text-slate-400 text-sm">
          No available formats found for this media item.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {formats.map((fmt, idx) => (
            <div
              key={idx}
              className="group relative bg-white dark:bg-[#151923] rounded-xl p-4 border border-slate-200 dark:border-[#232a3b] hover:border-red-600 dark:hover:border-red-500 transition-colors shadow-sm flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-red-500/10 text-red-600 dark:text-red-400 uppercase tracking-wider border border-red-500/20">
                    {activeTab === 'video' ? fmt.resolution || 'MP4' : 'MP3 Audio'}
                  </span>
                  <span className="text-xs font-mono font-medium text-slate-500 dark:text-slate-400 uppercase bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200/60 dark:border-slate-700/60">
                    .{fmt.extension}
                  </span>
                </div>

                <h4 className="font-bold text-slate-900 dark:text-white text-sm mb-1 leading-snug">
                  {fmt.note || (activeTab === 'video' ? `MP4 Video (${fmt.resolution})` : 'MP3 Audio Stream')}
                </h4>

                <div className="flex items-center space-x-1.5 text-xs text-slate-500 dark:text-slate-400 mt-2">
                  <HardDrive className="w-3.5 h-3.5 text-slate-400" />
                  <span>Est. Size: <strong>{fmt.filesize_formatted || 'Auto calculated'}</strong></span>
                </div>
              </div>

              <button
                onClick={() => onSelectFormat(fmt, activeTab)}
                disabled={isDownloading}
                className="mt-4 w-full py-2.5 px-4 rounded-lg text-xs font-semibold text-white bg-red-600 hover:bg-red-700 active:bg-red-800 disabled:opacity-50 transition-colors flex items-center justify-center space-x-2 shadow-sm"
              >
                <Download className="w-4 h-4" />
                <span>Save {activeTab === 'video' ? 'Video' : 'Audio'}</span>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
