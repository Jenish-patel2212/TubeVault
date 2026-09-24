import React, { useState, useEffect } from 'react';
import { Server, X, Check, AlertCircle, RefreshCw, Globe, CheckCircle2 } from 'lucide-react';
import { getApiBaseUrl, setCustomApiBaseUrl, testBackendHealth } from '../utils/api';

interface ServerConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ServerConnectionModal: React.FC<ServerConnectionModalProps> = ({ isOpen, onClose }) => {
  const [urlInput, setUrlInput] = useState('');
  const [currentUrl, setCurrentUrl] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const active = getApiBaseUrl();
      setCurrentUrl(active);
      const custom = localStorage.getItem('tubevault_backend_url') || '';
      setUrlInput(custom);
      setTestResult(null);
      setSavedSuccess(false);
      
      // Auto test current connection
      testCurrentConnection(active);
    }
  }, [isOpen]);

  const testCurrentConnection = async (target?: string) => {
    setTesting(true);
    setTestResult(null);
    const result = await testBackendHealth(target);
    setTestResult(result);
    setTesting(false);
  };

  const handleSave = async () => {
    const trimmed = urlInput.trim();
    setCustomApiBaseUrl(trimmed);
    const updated = getApiBaseUrl();
    setCurrentUrl(updated);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);

    // Retest after save
    await testCurrentConnection(updated);
  };

  const handleReset = async () => {
    setCustomApiBaseUrl('');
    setUrlInput('');
    const updated = getApiBaseUrl();
    setCurrentUrl(updated);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
    await testCurrentConnection(updated);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-[#0c1017] border border-zinc-800 rounded-3xl p-6 shadow-2xl space-y-5 text-white">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-zinc-400 hover:text-white bg-zinc-800/50 hover:bg-zinc-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Server className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-extrabold text-white">Backend Server Connection</h3>
            <p className="text-xs text-zinc-400">Configure or verify your TubeVault API server</p>
          </div>
        </div>

        {/* Current Active URL Status Box */}
        <div className="p-4 bg-zinc-950 rounded-2xl border border-zinc-800/80 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Active Endpoint:</span>
            <span className="text-[11px] font-mono text-zinc-300 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800 truncate max-w-[240px]">
              {currentUrl}
            </span>
          </div>

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${testResult?.ok ? 'bg-emerald-500 shadow-sm shadow-emerald-500 animate-pulse' : testResult ? 'bg-red-500' : 'bg-amber-500'}`} />
              <span className="text-xs font-medium text-zinc-200">
                {testing ? 'Testing connection...' : testResult ? (testResult.ok ? 'Online & Connected' : 'Offline / Unreachable') : 'Checking...'}
              </span>
            </div>

            <button
              onClick={() => testCurrentConnection()}
              disabled={testing}
              className="inline-flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 font-semibold transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
              <span>Test Ping</span>
            </button>
          </div>

          {testResult && (
            <div className={`p-2.5 rounded-xl text-xs flex items-start gap-2 ${testResult.ok ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
              {testResult.ok ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />}
              <span className="break-all">{testResult.message}</span>
            </div>
          )}
        </div>

        {/* Custom Server URL Input */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-zinc-300 flex items-center justify-between">
            <span>Custom Backend Server URL:</span>
            <span className="text-[11px] text-zinc-500 font-normal">e.g. Render, Railway or Cloudflare</span>
          </label>

          <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-xl p-2">
            <Globe className="w-4 h-4 text-zinc-500 ml-1 shrink-0" />
            <input
              type="url"
              placeholder="https://tubevault-backend.onrender.com"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              className="w-full bg-transparent text-sm text-zinc-200 placeholder-zinc-600 font-mono focus:outline-none px-2"
            />
          </div>

          <p className="text-[11px] text-zinc-400 leading-relaxed">
            Agar aapne website ko <strong>Netlify</strong> pe dala hai, to Render ya Cloudflare tunnel ka backend URL yahan paste karein.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={handleSave}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all active:scale-95 shadow-lg shadow-emerald-600/20"
          >
            {savedSuccess ? <Check className="w-4 h-4" /> : <Server className="w-4 h-4" />}
            <span>{savedSuccess ? 'Saved & Connected!' : 'Save & Connect'}</span>
          </button>

          <button
            onClick={handleReset}
            className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-medium transition-all"
          >
            Reset
          </button>
        </div>

        {/* Quick Tips */}
        <div className="p-3 rounded-xl bg-zinc-900/40 border border-zinc-800/60 text-xs text-zinc-400 space-y-1 leading-relaxed">
          <p className="font-semibold text-zinc-300">Quick Setup Tips:</p>
          <p>• <strong>Render.com</strong>: Deploy backend using Docker and copy your Render URL.</p>
          <p>• <strong>Cloudflare Tunnel</strong>: Run <code className="text-zinc-200 bg-zinc-800 px-1 py-0.5 rounded">start-online.bat</code> on your PC and paste the trycloudflare link.</p>
        </div>
      </div>
    </div>
  );
};
