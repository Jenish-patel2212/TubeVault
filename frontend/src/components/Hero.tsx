import React from 'react';
import { Film, Music2, ArrowUpRight, CheckCircle2, Shield } from 'lucide-react';

interface HeroProps {
  onNavigateToPricing?: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onNavigateToPricing }) => {
  return (
    <div className="text-center max-w-3xl mx-auto pt-4 pb-2 px-4">
      {/* Brand Badge */}
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/70 text-xs font-medium text-slate-700 dark:text-slate-300 mb-4">
        <span className="w-2 h-2 rounded-full bg-red-600 inline-block" />
        <span>Universal Media Downloader</span>
        {onNavigateToPricing && (
          <button
            onClick={onNavigateToPricing}
            className="inline-flex items-center gap-0.5 text-red-600 dark:text-red-400 hover:underline font-semibold ml-1 pl-1 border-l border-slate-300 dark:border-slate-700"
          >
            <span>Pro Plans</span>
            <ArrowUpRight className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Main Headline */}
      <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-slate-900 dark:text-white mb-3 leading-tight">
        Download YouTube Videos & Audio
      </h1>

      <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-xl mx-auto mb-5 leading-relaxed">
        Save high-definition MP4 videos up to 4K or extract crystal-clear 320kbps MP3 audio directly to your device without ads.
      </p>

      {/* Supported formats bar */}
      <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-slate-500 dark:text-slate-400">
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 font-medium">
          <Film className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
          <span>4K & 1080p MP4</span>
        </span>
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 font-medium">
          <Music2 className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
          <span>320kbps MP3 Audio</span>
        </span>
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 font-medium">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>YouTube Shorts</span>
        </span>
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 font-medium">
          <Shield className="w-3.5 h-3.5 text-slate-400" />
          <span>No Ads or Trackers</span>
        </span>
      </div>
    </div>
  );
};
