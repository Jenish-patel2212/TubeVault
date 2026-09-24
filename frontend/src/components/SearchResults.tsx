import React from 'react';
import { SearchResultItem } from '../types/api';
import { Clock, User, Eye, Download, Play, Sparkles } from 'lucide-react';

interface SearchResultsProps {
  results: SearchResultItem[];
  query: string;
  onSelectVideo: (url: string) => void;
  isLoading: boolean;
}

export const SearchResults: React.FC<SearchResultsProps> = ({
  results,
  query,
  onSelectVideo,
  isLoading,
}) => {
  if (results.length === 0) return null;

  return (
    <div className="glass-card rounded-3xl p-6 sm:p-8 shadow-xl shadow-red-600/5 mb-8 border border-slate-200/80 dark:border-slate-800/80">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-6 pb-4 border-b border-slate-200/60 dark:border-slate-800/60">
        <div>
          <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center space-x-2 font-display">
            <Sparkles className="w-5 h-5 text-red-500" />
            <span>Search Results for "{query}"</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Found {results.length} results. Click any video/song below to load formats and download.
          </p>
        </div>
      </div>

      {/* Grid of Results */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {results.map((item) => (
          <div
            key={item.id}
            className="group bg-white/70 dark:bg-slate-900/60 hover:bg-white dark:hover:bg-slate-900 rounded-2xl overflow-hidden border border-slate-200/80 dark:border-slate-800 hover:border-red-500/50 dark:hover:border-red-500/50 transition-all duration-200 shadow-sm hover:shadow-xl flex flex-col justify-between"
          >
            {/* Thumbnail Header */}
            <div>
              <div className="relative w-full h-44 bg-slate-950 overflow-hidden">
                {item.thumbnail ? (
                  <img
                    src={item.thumbnail}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-600">
                    <Play className="w-10 h-10" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />

                {/* Duration Badge */}
                {item.duration_formatted && (
                  <div className="absolute bottom-2 right-2 bg-black/85 backdrop-blur-md text-white px-2 py-0.5 rounded-md text-[11px] font-bold flex items-center space-x-1 border border-white/10">
                    <Clock className="w-3 h-3 text-red-500" />
                    <span>{item.duration_formatted}</span>
                  </div>
                )}
              </div>

              {/* Video Info */}
              <div className="p-4">
                <h4 className="font-bold text-slate-900 dark:text-white text-sm line-clamp-2 leading-snug group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">
                  {item.title}
                </h4>

                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-2.5">
                  {item.channel && (
                    <div className="flex items-center space-x-1 truncate max-w-[140px]">
                      <User className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                      <span className="truncate font-medium">{item.channel}</span>
                    </div>
                  )}

                  {item.view_count !== undefined && item.view_count > 0 && (
                    <div className="flex items-center space-x-1">
                      <Eye className="w-3.5 h-3.5 text-slate-400" />
                      <span>{item.view_count.toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Action Button */}
            <div className="p-4 pt-0">
              <button
                onClick={() => onSelectVideo(item.url)}
                disabled={isLoading}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center space-x-2 shadow-sm group-hover:shadow-md group-hover:shadow-red-600/30"
              >
                <Download className="w-4 h-4" />
                <span>Select & Get Formats</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
