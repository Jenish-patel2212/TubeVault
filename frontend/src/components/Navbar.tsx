import React, { useState } from 'react';
import { 
  Shield, 
  Sun, 
  Moon, 
  History, 
  Home, 
  Info, 
  Scale, 
  Instagram, 
  Smartphone, 
  X, 
  Copy, 
  Check, 
  Wifi, 
  Globe,
  ExternalLink,
  QrCode,
  Crown,
  Server
} from 'lucide-react';
import { safeGetSession } from '../utils/storage';
import { ServerConnectionModal } from './ServerConnectionModal';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  onOpenAccountModal?: () => void;
  onOpenOwnerModal?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  isDarkMode,
  toggleDarkMode,
  onOpenAccountModal,
  onOpenOwnerModal,
}) => {
  const [showMobileModal, setShowMobileModal] = useState(false);
  const [showServerModal, setShowServerModal] = useState(false);
  const [copied, setCopied] = useState(false);

  // Check if currently accessed through an online tunnel or domain
  const isOnline = typeof window !== 'undefined' && (
    window.location.protocol === 'https:' ||
    window.location.hostname.includes('trycloudflare.com') ||
    window.location.hostname.includes('serveousercontent.com') ||
    window.location.hostname.includes('loca.lt') ||
    window.location.hostname.includes('vercel.app') ||
    window.location.hostname.includes('netlify.app')
  );

  // If already on a tunnel/live domain, use the current origin without broken port
  // Otherwise default to the live public Cloudflare URL
  const mobileUrl = isOnline 
    ? window.location.origin 
    : 'https://replied-col-feeding-introduces.trycloudflare.com';

  const navItems = [
    { id: 'home', label: 'YouTube', icon: Home },
    { id: 'instagram', label: 'Instagram Reels', icon: Instagram },
    { id: 'pricing', label: 'Premium', icon: Crown, isSpecial: true },
    { id: 'history', label: 'History', icon: History },
    { id: 'about', label: 'About', icon: Info },
    { id: 'privacy', label: 'Privacy', icon: Shield },
    { id: 'terms', label: 'Terms', icon: Scale },
  ];

  // Mobile bottom bar displays key destinations
  const mobileNavItems = [
    { id: 'home', label: 'YouTube', icon: Home },
    { id: 'instagram', label: 'Reels', icon: Instagram },
    { id: 'pricing', label: 'Premium', icon: Crown },
    { id: 'history', label: 'History', icon: History },
  ];

  const handleCopyUrl = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        await navigator.clipboard.writeText(mobileUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-50 glass-nav transition-all duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 py-2 flex items-center justify-between">
          {/* Brand Logo */}
          <button
            onClick={() => setActiveTab('home')}
            className="flex items-center space-x-2.5 group focus:outline-none"
          >
            <div className="w-9 h-9 rounded-lg bg-red-600 flex items-center justify-center p-1.5 shadow-sm">
              <img
                src="/logo.png"
                alt="TubeVault Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="flex flex-col text-left">
              <div className="flex items-center text-lg font-bold tracking-tight">
                <span className="text-slate-900 dark:text-white">Tube</span>
                <span className="text-red-600 dark:text-red-500">Vault</span>
              </div>
            </div>
          </button>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-1 bg-slate-100 dark:bg-slate-900/80 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-red-600 text-white font-semibold shadow-sm'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-slate-800'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${item.isSpecial && !isActive ? 'text-amber-500' : ''}`} />
                  <span>{item.label}</span>
                  {item.isSpecial && (
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider bg-amber-400 text-slate-950 ml-0.5">
                      PRO
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Action Controls */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Customer Account & Email Pass Button */}
            {onOpenAccountModal && (
              <button
                onClick={onOpenAccountModal}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-bold transition-all shadow-sm"
                title="Customer Subscription & Email Status"
              >
                <Crown className="w-4 h-4 text-amber-500" />
                <span className="hidden sm:inline">My Pass</span>
              </button>
            )}

            {/* Admin Portal Toggle - ONLY visible when admin is active or viewing admin */}
            {(activeTab === 'admin' || Boolean(safeGetSession('tubevault_admin_token'))) && (
              <button
                onClick={() => setActiveTab(activeTab === 'admin' ? 'home' : 'admin')}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition-all shadow-sm ${
                  activeTab === 'admin'
                    ? 'bg-red-600 text-white border-red-600 shadow-md shadow-red-600/30'
                    : 'bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 dark:hover:bg-neutral-700 text-slate-700 dark:text-neutral-300 border-slate-200 dark:border-neutral-700'
                }`}
                title="TubeVault Admin Central Command"
              >
                <Shield className={`w-4 h-4 ${activeTab === 'admin' ? 'text-white' : 'text-red-500'}`} />
                <span className="hidden sm:inline">Admin</span>
              </button>
            )}

            {/* Server Connection Status & Config Button */}
            <button
              onClick={() => setShowServerModal(true)}
              className="inline-flex items-center gap-1.5 px-2.5 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold transition-all shadow-sm"
              title="Backend Server Connection & Ping Status"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500 animate-pulse" />
              <Server className="w-3.5 h-3.5 text-emerald-500" />
              <span className="hidden sm:inline">Server</span>
            </button>

            {/* Mobile Phone Connect Button */}
            <button
              onClick={() => setShowMobileModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-red-600/10 to-rose-600/10 hover:from-red-600/20 hover:to-rose-600/20 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-bold transition-all shadow-sm"
              title="Open TubeVault on your Mobile Phone"
            >
              <Smartphone className="w-4 h-4" />
              <span className="hidden sm:inline">Use on Phone</span>
            </button>

            {/* Owner Permission Control Button */}
            {onOpenOwnerModal && (
              <button
                onClick={onOpenOwnerModal}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 text-zinc-300 hover:text-white text-xs font-bold transition-all shadow-sm"
                title="Owner Device Approval Control"
              >
                <Shield className="w-4 h-4 text-red-500" />
                <span className="hidden sm:inline">Owner</span>
              </button>
            )}

            {/* Dark/Light Mode Toggle */}
            <button
              onClick={toggleDarkMode}
              className="p-2.5 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800/60 transition-colors focus:outline-none"
              title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDarkMode ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-red-600" />}
            </button>
          </div>
        </div>

        {/* Mobile App Bottom Navigation Bar (Fixed for phone screens) */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 dark:border-[#1e2433] px-2 py-2 flex justify-around items-center bg-white dark:bg-[#0d0f15] shadow-lg pb-safe">
          {mobileNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all duration-200 active:scale-90 ${
                  isActive
                    ? 'text-red-600 dark:text-[#ff1a2b] font-bold'
                    : 'text-slate-500 dark:text-slate-400 font-medium hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <div className={`p-1 rounded-lg ${isActive ? 'bg-red-500/15' : ''}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-[10px] mt-0.5 tracking-tight">{item.label}</span>
              </button>
            );
          })}
          {onOpenAccountModal && (
            <button
              onClick={onOpenAccountModal}
              className="flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all duration-200 text-amber-500 dark:text-amber-400 active:scale-90"
            >
              <div className="p-1 rounded-lg bg-amber-500/10">
                <Crown className="w-5 h-5" />
              </div>
              <span className="text-[10px] mt-0.5 tracking-tight font-semibold">My Pass</span>
            </button>
          )}
          {onOpenOwnerModal && (
            <button
              onClick={onOpenOwnerModal}
              className="flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all duration-200 text-red-500 dark:text-red-400 active:scale-90"
            >
              <div className="p-1 rounded-lg bg-red-500/10">
                <Shield className="w-5 h-5" />
              </div>
              <span className="text-[10px] mt-0.5 tracking-tight font-semibold">Owner</span>
            </button>
          )}
          {(activeTab === 'admin' || Boolean(safeGetSession('tubevault_admin_token'))) && (
            <button
              onClick={() => setActiveTab(activeTab === 'admin' ? 'home' : 'admin')}
              className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all duration-200 active:scale-90 ${
                activeTab === 'admin' ? 'text-red-500 font-bold' : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <div className={`p-1 rounded-lg ${activeTab === 'admin' ? 'bg-red-500/15' : ''}`}>
                <Shield className="w-5 h-5" />
              </div>
              <span className="text-[10px] mt-0.5 tracking-tight">Admin</span>
            </button>
          )}
        </div>
      </header>

      {/* Mobile Phone Connection Modal */}
      {showMobileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-[#0c1017] border border-zinc-800 rounded-3xl p-6 shadow-2xl space-y-5 text-white">
            {/* Close Button */}
            <button
              onClick={() => setShowMobileModal(false)}
              className="absolute top-4 right-4 p-2 rounded-full text-zinc-400 hover:text-white bg-zinc-800/50 hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header */}
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-red-500/20 to-rose-600/20 border border-red-500/30 flex items-center justify-center text-red-500">
                <Smartphone className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-white">Use TubeVault on Mobile</h3>
                <p className="text-xs text-zinc-400">Scan QR or open the link on your phone</p>
              </div>
            </div>

            {/* QR Code Container */}
            <div className="flex flex-col items-center justify-center p-4 bg-zinc-950 rounded-2xl border border-zinc-800/80 space-y-3">
              <div className="p-3 bg-white rounded-xl shadow-md">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(mobileUrl)}`}
                  alt="Scan to open on phone"
                  className="w-40 h-40 object-contain"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </div>
              <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                <QrCode className="w-4 h-4 text-red-400" />
                <span>Scan with your Phone's Camera</span>
              </div>
            </div>

            {/* Direct Mobile URL with Copy Button */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-300 flex items-center justify-between">
                <span>Phone Browser Link:</span>
                <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-normal">
                  <Globe className="w-3.5 h-3.5" /> Any Network (Mobile Data / Wi-Fi)
                </span>
              </label>

              <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-xl p-2">
                <input
                  type="text"
                  readOnly
                  value={mobileUrl}
                  className="w-full bg-transparent text-sm text-zinc-200 font-mono focus:outline-none px-2 select-all"
                />
                <button
                  onClick={handleCopyUrl}
                  className="flex items-center gap-1 px-3 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-all active:scale-95 whitespace-nowrap"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied!' : 'Copy'}</span>
                </button>
              </div>
            </div>

            {/* Step-by-step instructions */}
            <div className="p-3 rounded-xl bg-zinc-900/50 border border-zinc-800/60 text-xs text-zinc-400 space-y-1.5 leading-relaxed">
              <p className="font-semibold text-zinc-300">How it works:</p>
              <p>1. Works on <strong>any network</strong> (Vi, Jio, Airtel 4G/5G, or Wi-Fi).</p>
              <p>2. Scan the QR code or open <strong className="text-white">{mobileUrl}</strong> in Safari or Chrome.</p>
              <p>3. Downloaded videos and audio will save directly into your phone files / gallery!</p>
            </div>
          </div>
        </div>
      )}

      {/* Backend Server Connection Modal */}
      <ServerConnectionModal
        isOpen={showServerModal}
        onClose={() => setShowServerModal(false)}
      />
    </>
  );
};
