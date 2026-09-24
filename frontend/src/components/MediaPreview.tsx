import React from 'react';
import { Play, User, Clock, Eye, Video as VideoIcon, Music, CheckCircle2 } from 'lucide-react';
import { MediaMetadata } from '../types/api';

interface MediaPreviewProps {
  metadata: MediaMetadata;
}

export const MediaPreview: React.FC<MediaPreviewProps> = ({ metadata }) => {
  return (
    <div className="glass-card rounded-3xl p-6 sm:p-8 shadow-2xl shadow-indigo-500/5 mb-8 border border-gray-200/80 dark:border-gray-800/80 transition-all duration-300">
      <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-start">
        {/* Thumbnail Preview */}
        <div className="relative w-full lg:w-80 h-48 sm:h-52 rounded-2xl overflow-hidden shadow-lg group flex-shrink-0 bg-gray-900">
          {metadata.thumbnail ? (
            <img
              src={metadata.thumbnail}
              alt={metadata.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-500">
              <VideoIcon className="w-12 h-12" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />

          {/* Duration Badge */}
          {metadata.duration_formatted && (
            <div className="absolute bottom-3 right-3 bg-black/85 backdrop-blur-md text-white px-2.5 py-1 rounded-lg text-xs font-bold flex items-center space-x-1.5 border border-white/10">
              <Clock className="w-3 h-3 text-red-500" />
              <span>{metadata.duration_formatted}</span>
            </div>
          )}
        </div>

        {/* Info Details */}
        <div className="flex-1 min-w-0">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold mb-3 border border-emerald-500/20 shadow-sm">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>High-Speed Format Analysis Ready</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mb-3 line-clamp-2 leading-snug font-display">
            {metadata.title}
          </h2>

          <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-slate-600 dark:text-slate-300 mb-4">
            {metadata.channel && (
              <div className="flex items-center space-x-1.5 bg-slate-100 dark:bg-slate-800/70 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700/60 font-medium">
                <User className="w-4 h-4 text-red-500" />
                <span className="font-semibold text-slate-800 dark:text-slate-200">{metadata.channel}</span>
              </div>
            )}

            {metadata.view_count !== undefined && metadata.view_count > 0 && (
              <div className="flex items-center space-x-1.5 bg-slate-100 dark:bg-slate-800/70 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700/60 font-medium">
                <Eye className="w-4 h-4 text-slate-400" />
                <span>{metadata.view_count.toLocaleString()} views</span>
              </div>
            )}
          </div>

          {metadata.description_snippet && (
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 line-clamp-2 italic leading-relaxed">
              "{metadata.description_snippet}..."
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
