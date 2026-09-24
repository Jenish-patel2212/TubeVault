import React from 'react';

interface FooterProps {
  setActiveTab: (tab: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ setActiveTab }) => {
  return (
    <footer className="mt-16 border-t border-gray-200/60 dark:border-gray-800/60 bg-white/40 dark:bg-gray-950/40 backdrop-blur-md py-12 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand Info */}
          <div className="md:col-span-2">
            <div className="flex items-center space-x-3 mb-3">
              <div className="relative w-9 h-9 rounded-xl p-0.5 bg-gradient-to-br from-slate-200 via-slate-400 to-red-600 shadow-md shadow-red-600/20">
                <div className="w-full h-full rounded-[10px] bg-[#0c1017] dark:bg-[#07090e] flex items-center justify-center p-1 overflow-hidden">
                  <img src="/logo.png" alt="TubeVault Logo" className="w-full h-full object-contain" />
                </div>
              </div>
              <div className="flex items-center text-lg font-black tracking-tight font-display">
                <span className="text-slate-900 dark:text-white">TUBE</span>
                <span className="text-[#e50914] dark:text-[#ff1a2b]">VAULT</span>
              </div>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-md">
              High-performance media format analyzer and converter. Save, download, and enjoy your favorite videos and audio anywhere.
            </p>
            <p className="text-[10px] font-bold text-red-600 dark:text-[#ff1a2b] tracking-wider uppercase mt-2">
              SAVE • DOWNLOAD • ENJOY ANYWHERE
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h5 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-3">
              Navigation
            </h5>
            <ul className="space-y-2 text-xs font-medium text-slate-600 dark:text-slate-400">
              <li>
                <button onClick={() => setActiveTab('home')} className="hover:text-red-600 dark:hover:text-red-400 transition-colors">
                  YouTube Downloader
                </button>
              </li>
              <li>
                <button onClick={() => setActiveTab('instagram')} className="hover:text-red-600 dark:hover:text-red-400 transition-colors">
                  Instagram Reels & Posts
                </button>
              </li>
              <li>
                <button onClick={() => setActiveTab('pricing')} className="flex items-center gap-1.5 text-amber-500 dark:text-amber-400 font-bold hover:text-amber-600 dark:hover:text-amber-300 transition-colors">
                  <span>Pricing & Premium Plans</span>
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-wider bg-amber-400/20 text-amber-500 border border-amber-400/40">PRO</span>
                </button>
              </li>
              <li>
                <button onClick={() => setActiveTab('history')} className="hover:text-red-600 dark:hover:text-red-400 transition-colors">
                  Download History
                </button>
              </li>
              <li>
                <button onClick={() => setActiveTab('about')} className="hover:text-red-600 dark:hover:text-red-400 transition-colors">
                  About Architecture
                </button>
              </li>
            </ul>
          </div>

          {/* Compliance */}
          <div>
            <h5 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-3">
              Compliance & Legal
            </h5>
            <ul className="space-y-2 text-xs font-medium text-slate-600 dark:text-slate-400">
              <li>
                <button onClick={() => setActiveTab('privacy')} className="hover:text-red-600 dark:hover:text-red-400 transition-colors">
                  Privacy Policy
                </button>
              </li>
              <li>
                <button onClick={() => setActiveTab('terms')} className="hover:text-red-600 dark:hover:text-red-400 transition-colors">
                  Terms of Use
                </button>
              </li>
              <li>
                <a href="/docs" target="_blank" rel="noopener noreferrer" className="hover:text-red-600 dark:hover:text-red-400 transition-colors">
                  API Documentation
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-6 border-t border-gray-200/50 dark:border-gray-800/50 flex flex-col sm:flex-row items-center justify-between text-xs text-gray-500 dark:text-gray-400 gap-2">
          <p>© {new Date().getFullYear()} TubeVault Utility. All rights reserved.</p>
          <div className="flex items-center space-x-1.5 font-medium">
            <span>Powered by</span>
            <span className="text-red-600 dark:text-red-400 font-bold tracking-wide">JENISH PATEL</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
