import React from 'react';
import { Scale, AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react';

export const TermsPage: React.FC = () => {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div className="text-center mb-8">
        <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-500 flex items-center justify-center mx-auto mb-3">
          <Scale className="w-6 h-6" />
        </div>
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
          Terms of Use & Compliance
        </h1>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Please read carefully before using TubeVault.
        </p>
      </div>

      <div className="glass-card rounded-3xl p-6 sm:p-8 space-y-6 border border-gray-200/80 dark:border-gray-800/80 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
        {/* Important Warning Banner */}
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-200 text-xs flex items-start space-x-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Authorized Use Policy</p>
            <p className="mt-0.5 opacity-90">
              Download only content you own or have permission to download. Respect copyright laws and YouTube's Terms of Service.
            </p>
          </div>
        </div>

        <section>
          <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2 flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-indigo-500" />
            <span>1. Acceptable Permitted Use</span>
          </h3>
          <p>
            TubeVault is provided for personal archival and fair-use research purposes. You agree to use the utility only for videos you own, Creative Commons content, or media for which you hold explicit authorization from the copyright holder.
          </p>
        </section>

        <section>
          <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2 flex items-center space-x-2">
            <ShieldAlert className="w-4 h-4 text-red-500" />
            <span>2. Strict Technical & Ethical Restrictions</span>
          </h3>
          <p className="mb-2">TubeVault strictly enforces compliance safeguards. The service does NOT and will NOT support:</p>
          <ul className="list-disc pl-5 space-y-1 text-xs text-gray-500 dark:text-gray-400">
            <li>DRM (Digital Rights Management) circumvention</li>
            <li>Paywalled or members-only video extraction</li>
            <li>Private video retrieval or age-verification bypass</li>
            <li>Authentication or session cookie theft</li>
            <li>System command injection or arbitrary local file access</li>
          </ul>
        </section>

        <section>
          <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2">
            3. Disclaimer of Warranty
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            This software is provided "as is" without warranty of any kind. The developers are not liable for copyright infringement or misuse conducted by users of this utility.
          </p>
        </section>
      </div>
    </div>
  );
};
