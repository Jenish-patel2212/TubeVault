import React from 'react';
import { ShieldCheck, Server, Cpu, Lock, FileCode, CheckCircle2 } from 'lucide-react';

export const AboutPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Title Header */}
      <div className="text-center">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-3">
          About <span className="gradient-text">TubeVault</span>
        </h1>
        <p className="text-gray-600 dark:text-gray-300 text-sm sm:text-base max-w-2xl mx-auto">
          TubeVault is designed as a secure, high-performance SaaS media format analyzer and downloader utility built using FastAPI, React, and Python.
        </p>
      </div>

      {/* Tech Stack Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-card rounded-3xl p-6 border border-gray-200/80 dark:border-gray-800/80">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center mb-4">
            <Server className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-2">Backend Architecture</h3>
          <ul className="space-y-2 text-xs text-gray-600 dark:text-gray-300">
            <li className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span><strong>FastAPI Async Engine:</strong> High throughput async non-blocking endpoints</span>
            </li>
            <li className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span><strong>Pure Python API:</strong> Programmatic `yt_dlp` without shell commands</span>
            </li>
            <li className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span><strong>Background Job Queue:</strong> Real-time transfer speed & ETA calculation</span>
            </li>
          </ul>
        </div>

        <div className="glass-card rounded-3xl p-6 border border-gray-200/80 dark:border-gray-800/80">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center mb-4">
            <Cpu className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-2">Frontend Experience</h3>
          <ul className="space-y-2 text-xs text-gray-600 dark:text-gray-300">
            <li className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span><strong>React + TypeScript:</strong> Type-safe interactive user interface</span>
            </li>
            <li className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span><strong>Tailwind CSS Glassmorphism:</strong> Dark & Light mode dynamic design</span>
            </li>
            <li className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span><strong>Local History:</strong> Private LocalStorage history management</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Security Principles */}
      <div className="glass-card rounded-3xl p-6 sm:p-8 border border-gray-200/80 dark:border-gray-800/80">
        <h3 className="font-bold text-xl text-gray-900 dark:text-white mb-4 flex items-center space-x-2">
          <Lock className="w-5 h-5 text-indigo-500" />
          <span>Security & Protection Features</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-2xl bg-gray-100/60 dark:bg-gray-800/40">
            <h4 className="font-bold text-gray-900 dark:text-white mb-1">Zero Shell Execution</h4>
            <p className="text-gray-500 dark:text-gray-400">
              Eliminates OS command injection vectors by invoking Python library bindings directly.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-gray-100/60 dark:bg-gray-800/40">
            <h4 className="font-bold text-gray-900 dark:text-white mb-1">SSRF & Host Blocking</h4>
            <p className="text-gray-500 dark:text-gray-400">
              Validates hostnames and blocks internal IP ranges (127.0.0.1, 10.x, 169.254.x).
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-gray-100/60 dark:bg-gray-800/40">
            <h4 className="font-bold text-gray-900 dark:text-white mb-1">Automated TTL Cleanup</h4>
            <p className="text-gray-500 dark:text-gray-400">
              Temporary media files are strictly isolated in UUID folders and purged automatically.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
