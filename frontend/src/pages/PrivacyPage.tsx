import React from 'react';
import { Shield, EyeOff, Trash2, CheckCircle2 } from 'lucide-react';

export const PrivacyPage: React.FC = () => {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div className="text-center mb-8">
        <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center mx-auto mb-3">
          <Shield className="w-6 h-6" />
        </div>
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
          Privacy Policy
        </h1>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Last updated: September 2026
        </p>
      </div>

      <div className="glass-card rounded-3xl p-6 sm:p-8 space-y-6 border border-gray-200/80 dark:border-gray-800/80 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
        <section>
          <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2 flex items-center space-x-2">
            <EyeOff className="w-4 h-4 text-indigo-500" />
            <span>1. Zero Personal Data Tracking</span>
          </h3>
          <p>
            TubeVault does not require account registration, passwords, or personal profile details. We do not track users, build behavioral profiles, or sell data to third parties.
          </p>
        </section>

        <section>
          <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2 flex items-center space-x-2">
            <Trash2 className="w-4 h-4 text-purple-500" />
            <span>2. Transient Storage & Temporary File Cleanup</span>
          </h3>
          <p>
            When a user requests a permitted download, media files are stored temporarily on the server in isolated job directories. Files are automatically destroyed after completion or within 15 minutes via background cleanup workers.
          </p>
        </section>

        <section>
          <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2 flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>3. Local Browser Storage</span>
          </h3>
          <p>
            Your download history is stored solely inside your local web browser's LocalStorage. It remains entirely on your computer and can be cleared instantly using the "Clear History" button.
          </p>
        </section>
      </div>
    </div>
  );
};
