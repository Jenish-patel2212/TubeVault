import React, { useState, useEffect } from 'react';
import { Lock, ShieldCheck, KeyRound, Loader2, Send, CheckCircle2, XCircle, Smartphone, AlertCircle, ArrowRight, Server } from 'lucide-react';
import { requestDeviceAccess, checkDeviceAccessStatus, verifyMasterPin } from '../utils/api';
import { getOrCreateDeviceId, setStoredMasterPin, setDeviceApprovedLocally } from '../utils/storage';
import { ServerConnectionModal } from '../components/ServerConnectionModal';

interface AccessGatePageProps {
  onUnlock: () => void;
  onNotify: (title: string, message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

export const AccessGatePage: React.FC<AccessGatePageProps> = ({ onUnlock, onNotify }) => {
  const [visitorName, setVisitorName] = useState('');
  const [requestStatus, setRequestStatus] = useState<'IDLE' | 'PENDING' | 'APPROVED' | 'REJECTED'>('IDLE');
  const [isLoading, setIsLoading] = useState(false);
  const [isOwnerTab, setIsOwnerTab] = useState(false);
  const [isServerModalOpen, setIsServerModalOpen] = useState(false);
  const [masterPin, setMasterPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [deviceId] = useState(() => getOrCreateDeviceId());

  // Check device status on load and poll if pending
  useEffect(() => {
    let interval: any = null;

    const checkStatus = async () => {
      try {
        const data = await checkDeviceAccessStatus(deviceId);
        if (data?.status === 'APPROVED') {
          setRequestStatus('APPROVED');
          setDeviceApprovedLocally(true);
          onNotify('Access Granted', 'Jenish approved your device access! Welcome to TubeVault.', 'success');
          setTimeout(() => {
            onUnlock();
          }, 1200);
        } else if (data?.status === 'REJECTED') {
          setRequestStatus('REJECTED');
        } else if (data?.status === 'PENDING') {
          setRequestStatus('PENDING');
        }
      } catch (err) {
        console.debug('Status check failed:', err);
      }
    };

    // Initial check
    checkStatus();

    // If pending, poll every 3 seconds
    if (requestStatus === 'PENDING') {
      interval = setInterval(checkStatus, 3000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [deviceId, requestStatus, onUnlock, onNotify]);

  const handleSendRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!visitorName.trim()) {
      onNotify('Name Required', 'Please enter your name so Jenish knows who is asking.', 'warning');
      return;
    }

    setIsLoading(true);
    try {
      await requestDeviceAccess(deviceId, visitorName.trim());
      setRequestStatus('PENDING');
      onNotify('Request Sent!', "Waiting for Jenish to tap 'Approve' on his phone...", 'info');
    } catch (err: any) {
      onNotify('Error', err.message || 'Failed to submit request', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOwnerLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!masterPin.trim()) {
      setPinError('Please enter your Master PIN');
      return;
    }

    setIsLoading(true);
    setPinError('');
    try {
      const res = await verifyMasterPin(masterPin.trim());
      setStoredMasterPin(masterPin.trim());
      setDeviceApprovedLocally(true);
      if (res?.message?.includes('Offline Fallback')) {
        onNotify('Master PIN Accepted (Offline)', 'Website khul gayi! Par video download ke liye upar "Connect Server" button se backend connect karein.', 'warning');
      } else {
        onNotify('Welcome Back, Jenish!', 'Master Owner access unlocked.', 'success');
      }
      onUnlock();
    } catch (err: any) {
      setPinError(err.message || 'Incorrect Master PIN');
      onNotify('Access Denied', err.message || 'Incorrect Master PIN', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden bg-[#07090e] text-slate-100">
      {/* Top Floating Server Button */}
      <div className="absolute top-4 right-4 z-20">
        <button
          type="button"
          onClick={() => setIsServerModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs border border-zinc-700/80 transition-all shadow-md backdrop-blur-md"
          title="Configure Backend Server Connection"
        >
          <Server className="w-3.5 h-3.5 text-emerald-400" />
          <span className="font-semibold">Connect Server</span>
        </button>
      </div>

      {/* Glow Ambient Blobs */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-red-600/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-rose-600/15 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative w-full max-w-md bg-[#0c1017]/90 backdrop-blur-2xl border border-zinc-800/80 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black/80 space-y-6">
        
        {/* Header Branding */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-3.5 rounded-2xl bg-gradient-to-br from-red-500/20 to-rose-600/20 border border-red-500/30 text-red-500 shadow-lg shadow-red-950/40 mb-1">
            <Lock className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center justify-center gap-2">
            TubeVault <span className="text-red-500 text-xs px-2 py-0.5 rounded-full bg-red-500/15 border border-red-500/30 font-bold uppercase tracking-wider">Private</span>
          </h1>
          <p className="text-xs text-zinc-400">
            Owned & Managed by <strong className="text-white">JENISH PATEL</strong>
          </p>
        </div>

        {/* Tab Toggle: Visitor Request vs Owner PIN */}
        <div className="flex rounded-xl bg-zinc-900/80 p-1 border border-zinc-800 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setIsOwnerTab(false)}
            className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              !isOwnerTab ? 'bg-red-600 text-white shadow-md' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Visitor (Ask Access)</span>
          </button>
          <button
            type="button"
            onClick={() => setIsOwnerTab(true)}
            className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              isOwnerTab ? 'bg-red-600 text-white shadow-md' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Owner (Jenish Login)</span>
          </button>
        </div>

        {!isOwnerTab ? (
          /* Visitor Access Flow */
          <div className="space-y-4">
            {requestStatus === 'APPROVED' ? (
              <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-2 animate-in fade-in">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                <h3 className="text-base font-bold text-white">Access Granted!</h3>
                <p className="text-xs text-emerald-300">Jenish has approved your device. Opening TubeVault...</p>
              </div>
            ) : requestStatus === 'PENDING' ? (
              <div className="p-6 rounded-2xl bg-zinc-900/80 border border-zinc-800 text-center space-y-3">
                <div className="relative w-12 h-12 mx-auto flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full border-2 border-red-500 animate-ping opacity-30" />
                  <div className="w-10 h-10 rounded-full bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-400">
                    <Loader2 className="w-5 h-5 animate-spin" />
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Waiting for Jenish to Approve...</h3>
                  <p className="text-xs text-zinc-400 mt-1">
                    Your request was sent. As soon as Jenish taps <strong>"Approve"</strong> on his phone, this page will open automatically!
                  </p>
                </div>
                <div className="pt-2">
                  <span className="inline-flex items-center gap-1 text-[11px] text-zinc-500">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Live Status Check Active
                  </span>
                </div>
              </div>
            ) : requestStatus === 'REJECTED' ? (
              <div className="p-5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-center space-y-3">
                <XCircle className="w-10 h-10 text-rose-400 mx-auto" />
                <h3 className="text-sm font-bold text-white">Request Declined</h3>
                <p className="text-xs text-zinc-400">Access was not approved by the owner.</p>
                <button
                  onClick={() => setRequestStatus('IDLE')}
                  className="text-xs text-red-400 hover:text-red-300 underline font-medium"
                >
                  Try Asking Again
                </button>
              </div>
            ) : (
              <form onSubmit={handleSendRequest} className="space-y-4">
                <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 text-xs text-zinc-300 space-y-1">
                  <p className="font-semibold text-white flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-red-500" /> Permission Required
                  </p>
                  <p className="text-zinc-400 leading-relaxed">
                    This media utility is private. Enter your name below to ask Jenish for permission to use it.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-300">Your Name:</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rahul, Friend, Co-worker"
                    value={visitorName}
                    onChange={(e) => setVisitorName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700/80 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-500/50"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-sm shadow-lg shadow-red-950/50 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span>Request Access from Jenish</span>
                      <Send className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        ) : (
          /* Owner Master PIN Login */
          <form onSubmit={handleOwnerLogin} className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 text-xs text-zinc-300 space-y-1">
              <p className="font-semibold text-white flex items-center gap-1.5">
                <KeyRound className="w-4 h-4 text-amber-500" /> Jenish Patel Master Login
              </p>
              <p className="text-zinc-400 leading-relaxed">
                Enter your secret 4-digit Master PIN to unlock full access and manage device permissions.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">Master PIN:</label>
              <input
                type="password"
                maxLength={8}
                autoFocus
                placeholder="Enter Master PIN (e.g. 2022)"
                value={masterPin}
                onChange={(e) => {
                  setMasterPin(e.target.value);
                  setPinError('');
                }}
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700/80 text-center font-mono tracking-widest text-lg text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-red-500/50"
              />
              {pinError && (
                <p className="text-xs text-rose-400 flex items-center gap-1 mt-1">
                  <AlertCircle className="w-3.5 h-3.5" /> {pinError}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-sm shadow-lg shadow-red-950/50 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>Unlock TubeVault</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
            {isOwnerTab && (
              <p className="text-[11px] text-zinc-500 text-center leading-relaxed">
                Netlify Note: Agar aapne website Netlify par upload ki hai, to videos download karne ke liye upar <strong className="text-emerald-400">Connect Server</strong> button se backend connect karein.
              </p>
            )}
          </form>
        )}

        <div className="pt-4 border-t border-zinc-800/80 text-center">
          <p className="text-[11px] text-zinc-500">
            TubeVault Security Engine • Powered by JENISH PATEL
          </p>
        </div>
      </div>

      <ServerConnectionModal
        isOpen={isServerModalOpen}
        onClose={() => setIsServerModalOpen(false)}
      />
    </div>
  );
};
