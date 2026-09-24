import React, { useState, useEffect } from 'react';
import { 
  X, 
  Crown, 
  Mail, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Sparkles, 
  Calendar, 
  ShieldCheck, 
  ArrowRight,
  LogOut,
  Zap,
  Download,
  Clock,
  CreditCard,
  KeyRound,
  Copy
} from 'lucide-react';
import { getSubscriptionStatus, getCustomerPaymentHistory, getInvoiceHtmlUrl, verifyLicenseKey } from '../utils/api';
import { CustomerSubscription } from '../types/api';
import { safeGetLocal, safeSetLocal, safeRemoveLocal, getActiveLicenseKey, setActiveLicenseKey, clearActiveLicenseKey, setActiveLicenseInfo } from '../utils/storage';

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToPricing: () => void;
  onNotify?: (title: string, message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

export const AccountModal: React.FC<AccountModalProps> = ({
  isOpen,
  onClose,
  onNavigateToPricing,
  onNotify
}) => {
  const [emailInput, setEmailInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [subscription, setSubscription] = useState<CustomerSubscription | null>(null);
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
  const [activeKey, setActiveKey] = useState(() => getActiveLicenseKey());
  const [copiedKey, setCopiedKey] = useState(false);
  const [keyInput, setKeyInput] = useState('');
  const [activatingKey, setActivatingKey] = useState(false);

  const checkEmail = async (emailToCheck: string, showNotification = true) => {
    const clean = emailToCheck.trim().toLowerCase();
    if (!clean || !clean.includes('@')) {
      if (showNotification) {
        onNotify?.('Invalid Email', 'Please enter a valid email address.', 'warning');
      }
      return;
    }

    setLoading(true);
    try {
      const [subData, histData] = await Promise.all([
        getSubscriptionStatus(clean),
        getCustomerPaymentHistory(clean).catch(() => ({ orders: [] }))
      ]);

      setSubscription(subData);
      setPaymentHistory(histData?.orders || []);

      if (subData.is_active) {
        safeSetLocal('tubevault_customer_email', clean);
        safeSetLocal('tubevault_user_plan', subData.plan_id);
        if (showNotification) {
          onNotify?.(
            'Plan Active!',
            `Welcome back! Your ${subData.plan_name} is active with ${subData.days_remaining} days remaining.`,
            'success'
          );
        }
      } else {
        if (showNotification) {
          onNotify?.(
            'No Active Plan',
            'No active premium subscription found for this email.',
            'info'
          );
        }
      }
    } catch (err: any) {
      if (showNotification) {
        onNotify?.('Lookup Failed', err.message || 'Unable to check status.', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    const savedEmail = safeGetLocal('tubevault_customer_email');
    if (savedEmail) {
      setEmailInput(savedEmail);
      checkEmail(savedEmail, false);
    }
    setActiveKey(getActiveLicenseKey());
  }, [isOpen]);

  const handleCopyKey = () => {
    if (!activeKey) return;
    if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      navigator.clipboard.writeText(activeKey).catch(() => {});
    }
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
    onNotify?.('Key Copied', 'License key copied to clipboard!', 'info');
  };

  const handleActivateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyInput.trim()) return;
    setActivatingKey(true);
    try {
      const res = await verifyLicenseKey(keyInput.trim());
      if (res.valid && res.license) {
        setActiveLicenseKey(res.license.license_key);
        setActiveLicenseInfo(res.license);
        setActiveKey(res.license.license_key);
        setKeyInput('');
        onNotify?.('License Activated', `License verified for ${res.license.customer_name}!`, 'success');
      } else {
        onNotify?.('Activation Failed', res.reason || 'Invalid license key.', 'error');
      }
    } catch (err: any) {
      onNotify?.('Activation Failed', err.message || 'Verification error.', 'error');
    } finally {
      setActivatingKey(false);
    }
  };

  const handleLogout = () => {
    safeRemoveLocal('tubevault_customer_email');
    safeRemoveLocal('tubevault_user_plan');
    clearActiveLicenseKey();
    setActiveKey('');
    setSubscription(null);
    setPaymentHistory([]);
    setEmailInput('');
    onNotify?.('Signed Out', 'Your email and license key have been disconnected from this device.', 'info');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
        {/* Glow Effect */}
        <div className="absolute -top-24 -right-24 w-60 h-60 bg-red-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-60 h-60 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-neutral-400 hover:text-white rounded-full hover:bg-neutral-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-gradient-to-tr from-red-600 to-amber-500 rounded-2xl shadow-lg shadow-red-600/30">
            <Crown className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white tracking-tight">Customer Portal</h3>
            <p className="text-xs text-neutral-400">My Plan, Payment History & Official Invoices</p>
          </div>
        </div>

        {/* If Active Subscription */}
        {subscription && subscription.is_active ? (
          <div className="space-y-5">
            <div className="p-5 bg-gradient-to-b from-neutral-800/90 to-neutral-900 border border-amber-500/40 rounded-2xl relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <span className="px-3 py-1 bg-amber-500/20 border border-amber-500/40 text-amber-400 text-xs font-bold rounded-full flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  ACTIVE SUBSCRIBER
                </span>
                <span className="text-xs text-amber-300 font-semibold">
                  {subscription.days_remaining} days remaining
                </span>
              </div>

              <h4 className="text-2xl font-black text-white mt-1 mb-1">
                {subscription.plan_name}
              </h4>
              <p className="text-xs text-neutral-300 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-neutral-400" />
                {subscription.email}
              </p>

              {subscription.expires_at && (
                <div className="mt-3 pt-3 border-t border-neutral-700/50 flex items-center justify-between text-xs text-neutral-400">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    Plan Expiry Date
                  </span>
                  <span className="text-white font-medium">
                    {new Date(subscription.expires_at).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </span>
                </div>
              )}
            </div>

            {/* Active License Key Card */}
            <div className="p-4 bg-neutral-950/80 border border-neutral-800 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                  Your Download License Key
                </span>
                {activeKey && (
                  <button
                    onClick={handleCopyKey}
                    className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg text-xs font-semibold flex items-center gap-1 transition"
                  >
                    <Copy className="w-3 h-3" />
                    <span>{copiedKey ? 'Copied!' : 'Copy Key'}</span>
                  </button>
                )}
              </div>
              <div className="px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-xl font-mono text-xs sm:text-sm font-bold text-amber-400 select-all">
                {activeKey || 'TVLT-PRO-UNLOCKED'}
              </div>
              <p className="text-[10px] text-neutral-500">
                Use this key on any laptop, tablet, or phone to unlock video & audio downloads instantly.
              </p>
            </div>

            {/* Payment History Section */}
            {paymentHistory.length > 0 && (
              <div className="space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-neutral-400">
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Payment History</span>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {paymentHistory.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-neutral-950 border border-neutral-800 rounded-xl flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-semibold text-white flex items-center gap-2">
                          <span>{item.order_id}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            item.payment_status === 'PAID'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-amber-500/20 text-amber-400'
                          }`}>
                            {item.payment_status || item.order_status}
                          </span>
                        </div>
                        <div className="text-[11px] text-neutral-400 mt-0.5">
                          ₹{item.final_amount} • {item.payment_date || item.created_at?.slice(0, 10)}
                        </div>
                      </div>

                      <a
                        href={getInvoiceHtmlUrl(item.order_id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg text-[11px] font-semibold flex items-center gap-1 transition shadow-sm"
                        title="Download Invoice"
                      >
                        <Download className="w-3 h-3" />
                        <span>Invoice</span>
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Features list */}
            <div className="p-4 bg-neutral-950/60 border border-neutral-800/80 rounded-2xl space-y-2">
              <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider block mb-1">
                Active Features
              </span>
              {subscription.features.map((feat, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-neutral-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{feat}</span>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => {
                  onClose();
                  onNavigateToPricing();
                }}
                className="flex-1 py-3 bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-semibold rounded-xl transition flex items-center justify-center gap-1.5"
              >
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                Change / Extend Plan
              </button>
              <button
                onClick={handleLogout}
                className="p-3 bg-neutral-800 hover:bg-red-950/40 text-neutral-400 hover:text-red-400 border border-neutral-700 hover:border-red-900 rounded-xl transition"
                title="Disconnect email"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          /* Form to input email */
          <div className="space-y-4">
            <p className="text-xs text-neutral-400 leading-relaxed">
              Purchased a pass or submitted a payment? Enter your email address to check plan validity, view payment status, or download your invoices.
            </p>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-neutral-300">
                Customer Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="your.email@example.com"
                  className="w-full pl-10 pr-4 py-3 bg-neutral-950 border border-neutral-800 rounded-xl text-white placeholder:text-neutral-600 text-sm focus:outline-none focus:border-red-500 transition"
                  onKeyDown={(e) => e.key === 'Enter' && checkEmail(emailInput)}
                />
              </div>
            </div>

            {subscription && !subscription.is_active && (
              <div className="p-3 bg-red-950/40 border border-red-900/60 rounded-xl flex items-start gap-2.5 text-xs text-red-300">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
                <div>
                  No active premium plan found for <strong>{emailInput}</strong>. If you recently paid via UPI, verification may be pending.
                </div>
              </div>
            )}

            {paymentHistory.length > 0 && (
              <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-xl space-y-2">
                <div className="text-[11px] font-bold text-neutral-400 uppercase">Recent Payments for this Email:</div>
                {paymentHistory.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs py-1 border-b border-neutral-900 last:border-none">
                    <span className="font-mono text-white">{item.order_id}</span>
                    <span className="text-amber-400 font-bold">{item.payment_status || item.order_status}</span>
                    <a
                      href={getInvoiceHtmlUrl(item.order_id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-neutral-400 hover:text-white flex items-center gap-1"
                    >
                      <Download className="w-3 h-3" />
                      Invoice
                    </a>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => checkEmail(emailInput)}
              disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-red-600 to-rose-500 hover:from-red-500 hover:to-rose-400 text-white font-bold text-sm rounded-xl transition shadow-lg shadow-red-600/30 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Checking Status...
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  Check Plan & Payment Status
                </>
              )}
            </button>

            {/* Direct License Key Activation */}
            <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-400">
                  <KeyRound className="w-4 h-4" />
                  <span>Have a License Key?</span>
                </div>
                {activeKey && (
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    Active Key Stored
                  </span>
                )}
              </div>
              <form onSubmit={handleActivateKey} className="flex gap-2">
                <input
                  type="text"
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value)}
                  placeholder="TVLT-PRO-XXXX-XXXX"
                  className="flex-1 px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-xl text-white font-mono text-xs focus:border-amber-500 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={activatingKey}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs rounded-xl transition disabled:opacity-50"
                >
                  {activatingKey ? 'Checking...' : 'Activate'}
                </button>
              </form>
              {activeKey && (
                <div className="flex items-center justify-between text-[11px] text-neutral-400 pt-1">
                  <span className="font-mono text-amber-400">{activeKey}</span>
                  <button
                    type="button"
                    onClick={handleCopyKey}
                    className="text-xs text-neutral-300 hover:text-white underline"
                  >
                    {copiedKey ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-neutral-800/80 text-center">
              <p className="text-xs text-neutral-500 mb-2">Need to purchase a new pass?</p>
              <button
                onClick={() => {
                  onClose();
                  onNavigateToPricing();
                }}
                className="text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center justify-center gap-1 mx-auto transition"
              >
                View Plans & VIP Checkout
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
