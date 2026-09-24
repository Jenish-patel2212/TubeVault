import React, { useState } from 'react';
import { Search, Clipboard, X, Loader2, Link as LinkIcon, AlertCircle, Music } from 'lucide-react';

interface URLInputProps {
  onAnalyze: (url: string) => void;
  onSearch: (query: string) => void;
  isLoading: boolean;
  errorMsg?: string | null;
  onClearError?: () => void;
}

const SAMPLE_SEARCHES = [
  'Lofi Hip Hop Chill Beats',
  'NoCopyrightSounds Gaming',
  'Big Buck Bunny 4K',
  'Synthwave Chillout Music',
];

const SAMPLE_URLS = [
  { label: 'Big Buck Bunny (CC)', url: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ' },
  { label: 'Blender Teaser', url: 'https://www.youtube.com/watch?v=YE7VzlLtp-4' },
];

export const URLInput: React.FC<URLInputProps> = ({
  onAnalyze,
  onSearch,
  isLoading,
  errorMsg,
  onClearError,
}) => {
  const [mode, setMode] = useState<'url' | 'search'>('url');
  const [inputValue, setInputValue] = useState('');

  const isUrlLike = (text: string) => {
    return text.includes('youtube.com') || text.includes('youtu.be') || text.startsWith('http://') || text.startsWith('https://');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = inputValue.trim();
    if (!clean) return;

    if (errorMsg && onClearError) {
      onClearError();
    }

    if (isUrlLike(clean)) {
      onAnalyze(clean);
    } else {
      // If it's a song title, keyword, or query, search YouTube directly
      setMode('search');
      onSearch(clean);
    }
  };

  const handleModeChange = (newMode: 'url' | 'search') => {
    setMode(newMode);
    if (errorMsg && onClearError) {
      onClearError();
    }
  };

  const handlePaste = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.readText === 'function') {
        const text = await navigator.clipboard.readText();
        if (text) {
          setInputValue(text);
          if (errorMsg && onClearError) {
            onClearError();
          }
          if (isUrlLike(text)) {
            setMode('url');
          } else {
            setMode('search');
          }
        }
      }
    } catch (err) {
      console.warn('Clipboard read failed:', err);
    }
  };

  const handleClear = () => {
    setInputValue('');
    if (errorMsg && onClearError) {
      onClearError();
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto px-4 my-6">
      {/* Mode Switcher Tabs */}
      <div className="flex items-center justify-center space-x-2 mb-3">
        <button
          type="button"
          onClick={() => handleModeChange('url')}
          className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            mode === 'url'
              ? 'bg-red-600 text-white font-semibold'
              : 'bg-slate-200/70 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
        >
          <LinkIcon className="w-3.5 h-3.5" />
          <span>Paste Video URL</span>
        </button>
        <button
          type="button"
          onClick={() => handleModeChange('search')}
          className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            mode === 'search'
              ? 'bg-red-600 text-white font-semibold'
              : 'bg-slate-200/70 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
        >
          <Search className="w-3.5 h-3.5" />
          <span>Search YouTube</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="relative">
        <div className="p-2 sm:p-2.5 rounded-xl bg-white dark:bg-[#12151d] border border-slate-300 dark:border-[#232938] shadow-sm focus-within:border-red-600 dark:focus-within:border-red-500 transition-colors">
          <div className="flex flex-col sm:flex-row items-center gap-2">
            {/* Input Icon + Field */}
            <div className="relative flex-1 w-full flex items-center">
              <div className="absolute left-3.5 text-slate-400">
                {mode === 'url' ? <LinkIcon className="w-5 h-5 text-red-600 dark:text-red-500" /> : <Search className="w-5 h-5 text-red-600 dark:text-red-500" />}
              </div>

              <input
                type="text"
                value={inputValue}
                onChange={(e) => {
                  setInputValue(e.target.value);
                  if (errorMsg && onClearError) {
                    onClearError();
                  }
                }}
                placeholder={
                  mode === 'url'
                    ? 'Paste YouTube link (e.g. https://www.youtube.com/watch?v=...)'
                    : 'Search songs, artists, or video titles...'
                }
                disabled={isLoading}
                className="w-full pl-11 pr-20 py-3 bg-transparent text-slate-900 dark:text-white placeholder-slate-400 text-sm sm:text-base focus:outline-none"
              />

              {/* Action Buttons Inside Input */}
              <div className="absolute right-2 flex items-center space-x-1">
                {inputValue && (
                  <button
                    type="button"
                    onClick={handleClear}
                    disabled={isLoading}
                    className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    title="Clear text"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={handlePaste}
                  disabled={isLoading}
                  className="flex items-center space-x-1 px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition-colors border border-slate-200 dark:border-slate-700"
                  title="Paste from clipboard"
                >
                  <Clipboard className="w-3.5 h-3.5" />
                  <span>Paste</span>
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || !inputValue.trim()}
              className="w-full sm:w-auto px-6 py-3 rounded-lg font-semibold text-white bg-red-600 hover:bg-red-700 active:bg-red-800 disabled:opacity-50 disabled:pointer-events-none transition-colors flex items-center justify-center space-x-2 text-sm sm:text-base min-w-[140px] shadow-sm"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{mode === 'url' ? 'Analyzing...' : 'Searching...'}</span>
                </>
              ) : (
                <>
                  {mode === 'url' ? <Search className="w-4 h-4" /> : <Music className="w-4 h-4" />}
                  <span>{mode === 'url' ? 'Analyze Video' : 'Search'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Error Alert */}
      {errorMsg && (
        <div className="mt-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 flex items-start justify-between space-x-3 text-sm animate-fade-in">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-500" />
            <div>
              <p className="font-semibold text-red-700 dark:text-red-300">Action Notice</p>
              <p className="mt-0.5 text-red-600/90 dark:text-red-400/90">{errorMsg}</p>
            </div>
          </div>
          {onClearError && (
            <button
              type="button"
              onClick={onClearError}
              className="p-1 hover:bg-red-500/15 rounded-lg text-red-500 hover:text-red-700 dark:hover:text-red-200 transition-colors flex-shrink-0"
              title="Clear notice"
              aria-label="Clear notice"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Quick Suggestions / Sample Links */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs text-slate-500 dark:text-slate-400">
        <span className="font-medium">Suggestions:</span>
        {mode === 'search'
          ? SAMPLE_SEARCHES.map((query) => (
              <button
                key={query}
                type="button"
                onClick={() => {
                  setInputValue(query);
                  onSearch(query);
                }}
                className="px-2.5 py-1 rounded-lg bg-slate-200/50 dark:bg-slate-800/50 hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400 transition-colors border border-slate-300/30 dark:border-slate-700/30"
              >
                {query}
              </button>
            ))
          : SAMPLE_URLS.map((sample) => (
              <button
                key={sample.label}
                type="button"
                onClick={() => {
                  setInputValue(sample.url);
                  onAnalyze(sample.url);
                }}
                className="px-2.5 py-1 rounded-lg bg-slate-200/50 dark:bg-slate-800/50 hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400 transition-colors border border-slate-300/30 dark:border-slate-700/30"
              >
                {sample.label}
              </button>
            ))}
      </div>
    </div>
  );
};
