import React, { useState } from 'react';
import { 
  KeyRound, 
  ShieldCheck, 
  AlertCircle, 
  Sparkles, 
  ArrowRight, 
  X, 
  CheckCircle2, 
  Crown,
  Zap,
  Lock
} from 'lucide-react';
import { verifyLicenseKey } from '../utils/api';
import { setActiveLicenseKey, setActiveLicenseInfo } from '../utils/storage';
import { LicenseData } from '../types/api';

interface LicenseGateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUnlocked: (license: LicenseData) => void;
  onNavigateToPricing: () => void;
  onNotify?: (title: string, message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
  targetMediaTitle?: string;
}

export const LicenseGateModal: React.FC<LicenseGateModalProps> = ({
  isOpen,
  onClose,
  onUnlocked,
  onNavigateToPricing,
  onNotify,
  targetMediaTitle
}) => {
  const [keyInput, setKeyInput] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanKey = keyInput.trim();
    if (!cleanKey) {
      setErrorMsg('Please enter your License Key or registered subscriber email.');
      return;
    }

    setIsValidating(true);
    setErrorMsg('');

    try {
      const res = await verifyLicenseKey(cleanKey);
      if (res.valid && res.license) {
        setActiveLicenseKey(res.license.license_key);
        setActiveLicenseInfo(res.license);
        onNotify?.('License Activated', `Welcome, ${res.license.customer_name}! Your download has unlocked.`, 'success');
        onUnlocked(res.license);
        onClose();
      } else {
        setErrorMsg(res.reason || 'Invalid license key. Please check spelling or buy a pass.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Verification failed. Please check network connection.');
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden space-y-6">
        {/* Glow backdrop */}
        <div className="absolute -top-24 -right-24 w-56 h-56 bg-red-600/15 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-start gap-4">
          <div className="p-3 bg-red-600/10 text-red-500 border border-red-500/20 rounded-2xl shadow-inner shrink-0">
            <KeyRound className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-black text-white tracking-tight">
                License Key Required
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-red-600/20 text-red-400 border border-red-500/30">
                Protected
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
              Video & audio downloads are protected. Please enter your active **License Key** or registered customer email to start downloading.
            </p>
          </div>
        </div>

        {targetMediaTitle && (
          <div className="p-3 rounded-xl bg-neutral-950/80 border border-neutral-800/80 text-xs text-neutral-300 flex items-center gap-2 overflow-hidden">
            <Lock className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="truncate">Media: <strong className="text-white">{targetMediaTitle}</strong></span>
          </div>
        )}

        {/* Verification Form */}
        <form onSubmit={handleVerify} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-neutral-300 uppercase tracking-wider block">
              Enter License Key or Subscriber Email
            </label>
            <input
              type="text"
              autoFocus
              value={keyInput}
              onChange={(e) => {
                setKeyInput(e.target.value);
                setErrorMsg('');
              }}
              placeholder="e.g. TVLT-PRO-A1B2-C3D4 or your@email.com"
              className="w-full px-4 py-3 bg-neutral-950 border border-neutral-800 rounded-xl text-white text-xs sm:text-sm font-mono focus:border-red-500 focus:outline-none transition placeholder:text-neutral-600"
            />
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-950/40 border border-red-800/50 text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isValidating}
            className="w-full py-3.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition shadow-lg shadow-red-600/30 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isValidating ? (
              <span>Verifying License...</span>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>Verify & Download Video</span>
              </>
            )}
          </button>
        </form>

        {/* Call to Action: Buy Plan */}
        <div className="pt-4 border-t border-neutral-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div>
            <span className="text-neutral-400 block">Don't have a license key yet?</span>
            <span className="text-[11px] text-amber-400 font-semibold flex items-center gap-1">
              <Crown className="w-3.5 h-3.5" />
              Passes start from just ₹99 (One-time, No recurring debits)
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              onClose();
              onNavigateToPricing();
            }}
            className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs uppercase tracking-wider rounded-xl transition shadow-lg shadow-amber-500/20 flex items-center gap-1.5 whitespace-nowrap"
          >
            <span>Get License Pass</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
