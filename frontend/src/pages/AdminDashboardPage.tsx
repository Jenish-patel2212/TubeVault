import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  Users, 
  IndianRupee, 
  Crown, 
  Search, 
  PlusCircle, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  Trash2, 
  Calendar, 
  Sparkles, 
  Zap, 
  ArrowLeft, 
  Mail, 
  Check, 
  X, 
  Activity,
  Layers,
  ChevronRight,
  TrendingUp,
  Clock,
  CreditCard,
  QrCode,
  Upload,
  Download,
  Eye,
  CheckCircle,
  XCircle,
  RotateCcw,
  Smartphone,
  Phone,
  FileText,
  KeyRound,
  Copy
} from 'lucide-react';
import { 
  adminAuth, 
  adminGetMetrics, 
  adminGetSubscribers, 
  adminActivateByEmail, 
  adminRevoke, 
  adminExtend,
  adminGetOrders,
  adminVerifyPayment,
  adminRefundPayment,
  adminGetPaymentConfig,
  adminUpdatePaymentConfig,
  adminUploadQRCode,
  adminGetRazorpayConfig,
  adminUpdateRazorpayConfig,
  adminGetLicenses,
  adminCreateLicense,
  adminRevokeLicense,
  getInvoiceHtmlUrl
} from '../utils/api';
import { AdminMetrics, SubscriberItem, AdminOrderRow, PaymentMetrics, PaymentConfig, AdminLicenseRow } from '../types/api';
import { safeGetSession, safeSetSession, safeRemoveSession } from '../utils/storage';

interface AdminDashboardPageProps {
  onBackToCustomerSite: () => void;
  onNotify?: (title: string, message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

export const AdminDashboardPage: React.FC<AdminDashboardPageProps> = ({
  onBackToCustomerSite,
  onNotify
}) => {
  const [token, setToken] = useState<string | null>(() => {
    return safeGetSession('tubevault_admin_token') || null;
  });
  const [passcode, setPasscode] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Tab Navigation
  const [activeTab, setActiveTab] = useState<'payments' | 'subscribers' | 'licenses'>('payments');

  // Payments & Orders State
  const [orders, setOrders] = useState<AdminOrderRow[]>([]);
  const [paymentMetrics, setPaymentMetrics] = useState<PaymentMetrics | null>(null);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [paymentSearch, setPaymentSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<AdminOrderRow | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // UPI Config State
  const [paymentConfig, setPaymentConfig] = useState<PaymentConfig | null>(null);
  const [upiIdInput, setUpiIdInput] = useState('');
  const [businessNameInput, setBusinessNameInput] = useState('');
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [isUploadingQR, setIsUploadingQR] = useState(false);

  // Razorpay Gateway Config State
  const [rzpKeyId, setRzpKeyId] = useState('');
  const [rzpKeySecret, setRzpKeySecret] = useState('');
  const [rzpWebhookSecret, setRzpWebhookSecret] = useState('');
  const [rzpEnabled, setRzpEnabled] = useState(true);
  const [isSavingRzp, setIsSavingRzp] = useState(false);

  // Licenses State
  const [licenses, setLicenses] = useState<AdminLicenseRow[]>([]);
  const [licensesTotal, setLicensesTotal] = useState(0);
  const [loadingLicenses, setLoadingLicenses] = useState(false);
  const [licenseSearch, setLicenseSearch] = useState('');
  const [licenseStatusFilter, setLicenseStatusFilter] = useState('all');
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);

  // Admin Generate License Form
  const [licEmail, setLicEmail] = useState('');
  const [licName, setLicName] = useState('');
  const [licPlan, setLicPlan] = useState('pro');
  const [licDuration, setLicDuration] = useState(365);
  const [licCustomKey, setLicCustomKey] = useState('');
  const [isGeneratingLicense, setIsGeneratingLicense] = useState(false);

  // Subscribers State
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [subscribers, setSubscribers] = useState<SubscriberItem[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Manual Activation Form
  const [manualEmail, setManualEmail] = useState('');
  const [manualPlan, setManualPlan] = useState('pro');
  const [manualDuration, setManualDuration] = useState(30);
  const [manualNotes, setManualNotes] = useState('Direct Admin Activation');
  const [isActivating, setIsActivating] = useState(false);

  useEffect(() => {
    if (token) {
      if (activeTab === 'payments') {
        loadOrdersData();
        loadPaymentConfig();
      } else if (activeTab === 'subscribers') {
        loadDashboardData();
      } else if (activeTab === 'licenses') {
        loadLicensesData();
      }
    }
  }, [token, activeTab, paymentFilter, licenseStatusFilter]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passcode.trim()) return;

    setAuthLoading(true);
    try {
      const data = await adminAuth(passcode.trim());
      if (data.token) {
        setToken(data.token);
        safeSetSession('tubevault_admin_token', data.token);
        onNotify?.('Admin Verified', 'Welcome to TubeVault Central Command.', 'success');
      }
    } catch (err: any) {
      onNotify?.('Access Denied', err.message || 'Incorrect passcode.', 'error');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    setToken(null);
    safeRemoveSession('tubevault_admin_token');
    onNotify?.('Logged Out', 'Admin session terminated safely.', 'info');
  };

  const loadOrdersData = async () => {
    if (!token) return;
    setLoadingOrders(true);
    try {
      const res = await adminGetOrders(token, paymentFilter, paymentSearch);
      setOrders(res.data.orders || []);
      setPaymentMetrics(res.metrics || null);
    } catch (err: any) {
      if (err.message?.includes('credentials')) handleLogout();
      onNotify?.('Orders Sync Error', err.message || 'Failed to refresh orders.', 'error');
    } finally {
      setLoadingOrders(false);
    }
  };

  const loadPaymentConfig = async () => {
    if (!token) return;
    try {
      const [res, rzp] = await Promise.all([
        adminGetPaymentConfig(token),
        adminGetRazorpayConfig(token).catch(() => null)
      ]);
      setPaymentConfig(res.upi_config);
      setUpiIdInput(res.upi_config.upi_id || '');
      setBusinessNameInput(res.upi_config.business_name || '');
      if (rzp) {
        setRzpKeyId(rzp.key_id || '');
        setRzpKeySecret(rzp.key_secret || '');
        setRzpWebhookSecret(rzp.webhook_secret || '');
        setRzpEnabled(rzp.enabled !== false);
      }
    } catch (err: any) {
      console.warn('Config load warning:', err);
    }
  };

  const handleSaveRzpConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setIsSavingRzp(true);
    try {
      await adminUpdateRazorpayConfig(token, {
        key_id: rzpKeyId.trim(),
        key_secret: rzpKeySecret.trim(),
        webhook_secret: rzpWebhookSecret.trim(),
        enabled: rzpEnabled
      });
      onNotify?.('Razorpay Updated', 'Razorpay Gateway credentials saved successfully!', 'success');
      loadPaymentConfig();
    } catch (err: any) {
      onNotify?.('Update Failed', err.message || 'Could not save Razorpay settings.', 'error');
    } finally {
      setIsSavingRzp(false);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setIsSavingConfig(true);
    try {
      await adminUpdatePaymentConfig(token, upiIdInput.trim(), businessNameInput.trim());
      onNotify?.('Configuration Updated', 'UPI ID and Business Name updated successfully.', 'success');
      loadPaymentConfig();
    } catch (err: any) {
      onNotify?.('Update Failed', err.message || 'Could not update configuration.', 'error');
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleUploadQR = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!token || !e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setIsUploadingQR(true);
    try {
      await adminUploadQRCode(token, file);
      onNotify?.('QR Uploaded', 'FamApp QR code updated successfully.', 'success');
      loadPaymentConfig();
    } catch (err: any) {
      onNotify?.('Upload Failed', err.message || 'Failed to upload QR image.', 'error');
    } finally {
      setIsUploadingQR(false);
    }
  };

  const handleVerifyAction = async (paymentId: string, action: 'approve' | 'reject') => {
    if (!token) return;
    const reason = action === 'reject' ? prompt('Reason for rejection (e.g. UTR mismatch):') : '';
    if (action === 'reject' && reason === null) return;

    setActionLoadingId(paymentId);
    try {
      await adminVerifyPayment(token, paymentId, action, reason || '');
      onNotify?.(
        action === 'approve' ? 'Payment Approved' : 'Payment Rejected',
        action === 'approve' ? 'Customer plan is now ACTIVE and order confirmed!' : 'Payment marked as failed.',
        action === 'approve' ? 'success' : 'info'
      );
      loadOrdersData();
      if (selectedOrder && selectedOrder.payment_id === paymentId) {
        setSelectedOrder(null);
      }
    } catch (err: any) {
      onNotify?.('Action Failed', err.message || 'Verification failed.', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRefund = async (paymentId: string) => {
    if (!token) return;
    const reason = prompt('Reason for issuing refund:');
    if (reason === null) return;

    setActionLoadingId(paymentId);
    try {
      await adminRefundPayment(token, paymentId, reason || 'Customer requested refund');
      onNotify?.('Refund Processed', 'Payment marked as REFUNDED and customer plan revoked.', 'info');
      loadOrdersData();
    } catch (err: any) {
      onNotify?.('Refund Failed', err.message || 'Could not process refund.', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const loadDashboardData = async () => {
    if (!token) return;
    setLoadingData(true);
    try {
      const [met, subsData] = await Promise.all([
        adminGetMetrics(token),
        adminGetSubscribers(token, searchQuery, statusFilter, 100, 0)
      ]);
      setMetrics(met);
      setSubscribers(subsData.subscribers || []);
    } catch (err: any) {
      if (err.message?.includes('credentials')) handleLogout();
      onNotify?.('Data Sync Error', err.message || 'Failed to refresh records.', 'error');
    } finally {
      setLoadingData(false);
    }
  };

  const handleManualActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    const cleanEmail = manualEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      onNotify?.('Invalid Email', 'Please provide a valid customer email address.', 'warning');
      return;
    }

    setIsActivating(true);
    try {
      const res = await adminActivateByEmail(
        token,
        cleanEmail,
        manualPlan,
        Number(manualDuration),
        manualNotes
      );
      onNotify?.('Customer Activated', `Successfully granted ${res.subscription.plan_name} to ${cleanEmail}!`, 'success');
      setManualEmail('');
      loadDashboardData();
    } catch (err: any) {
      onNotify?.('Activation Failed', err.message || 'Could not activate plan.', 'error');
    } finally {
      setIsActivating(false);
    }
  };

  const handleRevoke = async (email: string) => {
    if (!token || !confirm(`Revoke premium subscription for ${email}?`)) return;
    try {
      await adminRevoke(token, email, 'Cancelled via Admin Panel');
      onNotify?.('Access Revoked', `Customer ${email} has been reverted to free status.`, 'info');
      loadDashboardData();
    } catch (err: any) {
      onNotify?.('Revoke Failed', err.message || 'Could not revoke access.', 'error');
    }
  };

  const handleExtend = async (email: string) => {
    if (!token) return;
    try {
      await adminExtend(token, email, 30);
      onNotify?.('Extended Validity', `Added +30 days to ${email}.`, 'success');
      loadDashboardData();
    } catch (err: any) {
      onNotify?.('Extension Failed', err.message || 'Could not extend plan.', 'error');
    }
  };

  const loadLicensesData = async () => {
    if (!token) return;
    setLoadingLicenses(true);
    try {
      const res = await adminGetLicenses(token, licenseSearch, licenseStatusFilter);
      setLicenses(res.licenses || []);
      setLicensesTotal(res.total || 0);
    } catch (err: any) {
      onNotify?.('Licenses Sync Error', err.message || 'Failed to fetch licenses.', 'error');
    } finally {
      setLoadingLicenses(false);
    }
  };

  const handleCreateLicenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    const cleanEmail = licEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      onNotify?.('Invalid Email', 'Please provide a valid customer email.', 'warning');
      return;
    }

    setIsGeneratingLicense(true);
    try {
      const res = await adminCreateLicense(token, {
        user_email: cleanEmail,
        customer_name: licName.trim() || cleanEmail.split('@')[0],
        plan_id: licPlan,
        duration_days: Number(licDuration),
        custom_key: licCustomKey.trim() || undefined
      });
      onNotify?.('License Created', `License key '${res.license.license_key}' generated successfully!`, 'success');
      setLicEmail('');
      setLicName('');
      setLicCustomKey('');
      loadLicensesData();
    } catch (err: any) {
      onNotify?.('Creation Failed', err.message || 'Could not create license.', 'error');
    } finally {
      setIsGeneratingLicense(false);
    }
  };

  const handleRevokeLicenseAction = async (key: string) => {
    if (!token || !confirm(`Revoke license key ${key}? Customer will no longer be able to download.`)) return;
    try {
      await adminRevokeLicense(token, key, 'Revoked by admin from dashboard');
      onNotify?.('License Revoked', `Key ${key} has been revoked.`, 'info');
      loadLicensesData();
    } catch (err: any) {
      onNotify?.('Revocation Failed', err.message || 'Could not revoke license.', 'error');
    }
  };

  const handleCopyKeyText = (key: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      navigator.clipboard.writeText(key).catch(() => {});
    }
    setCopiedKeyId(key);
    setTimeout(() => setCopiedKeyId(null), 2000);
    onNotify?.('Key Copied', 'License key copied to clipboard!', 'info');
  };

  // --- Auth Login Screen ---
  if (!token) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute -top-20 -right-20 w-48 h-48 bg-red-600/20 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col items-center text-center mb-8">
            <div className="p-4 bg-red-600/10 border border-red-500/20 rounded-2xl mb-3 text-red-500 shadow-inner">
              <Lock className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight">Admin Passcode</h2>
            <p className="text-xs text-neutral-400 mt-1">TubeVault Payment & Subscriber Command Center</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              autoFocus
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              placeholder="Enter master admin passcode..."
              className="w-full px-4 py-3 bg-neutral-950 border border-neutral-800 rounded-xl text-white text-sm focus:outline-none focus:border-red-500 transition placeholder:text-neutral-600"
            />
            <button
              type="submit"
              disabled={authLoading}
              className="w-full py-3.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition shadow-lg shadow-red-600/30 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {authLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  Unlock Admin Dashboard
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-neutral-800/80">
            <button
              onClick={onBackToCustomerSite}
              className="text-xs font-semibold text-neutral-400 hover:text-white flex items-center justify-center gap-1.5 mx-auto transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Return to Customer Website
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- Logged In Admin Dashboard View ---
  return (
    <div className="max-w-7xl mx-auto space-y-8 py-4 px-2 sm:px-4 animate-fade-in">
      {/* Top Bar Navigation */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 bg-neutral-900/90 border border-neutral-800 rounded-3xl backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-tr from-red-600 to-amber-500 rounded-2xl shadow-lg shadow-red-600/20">
            <Crown className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                TubeVault Central Command
              </h1>
              <span className="px-2.5 py-0.5 bg-red-600/20 text-red-400 border border-red-500/30 text-[10px] font-black uppercase rounded-full">
                Admin
              </span>
            </div>
            <p className="text-xs text-neutral-400">
              Payments verification, FamApp QR settings, and customer accounts
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => {
              if (activeTab === 'payments') loadOrdersData();
              else if (activeTab === 'subscribers') loadDashboardData();
              else loadLicensesData();
            }}
            className="p-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-xl border border-neutral-700 transition"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loadingOrders || loadingData || loadingLicenses ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={onBackToCustomerSite}
            className="flex-1 sm:flex-initial px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold rounded-xl border border-neutral-700 transition flex items-center justify-center gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" />
            Customer Site
          </button>
          <button
            onClick={handleLogout}
            className="px-4 py-2.5 bg-red-950/60 hover:bg-red-900/80 text-red-300 text-xs font-semibold rounded-xl border border-red-800/80 transition"
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* Primary Section Switcher Tabs */}
      <div className="flex gap-2 p-1.5 bg-neutral-900/80 border border-neutral-800 rounded-2xl w-fit">
        <button
          onClick={() => setActiveTab('payments')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'payments'
              ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-md shadow-red-600/25'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Payments & UPI Orders</span>
          {paymentMetrics && paymentMetrics.pending_verifications > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-amber-400 text-black text-[10px] font-black animate-pulse">
              {paymentMetrics.pending_verifications}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('subscribers')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'subscribers'
              ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-md shadow-red-600/25'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Subscribers & Manual Pass Grant</span>
        </button>

        <button
          onClick={() => setActiveTab('licenses')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'licenses'
              ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-md shadow-red-600/25'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          <KeyRound className="w-4 h-4" />
          <span>License Keys & Certificates</span>
          {licensesTotal > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-neutral-800 text-neutral-300 text-[10px] font-bold">
              {licensesTotal}
            </span>
          )}
        </button>
      </div>

      {/* ================= PAYMENT TAB CONTENT ================= */}
      {activeTab === 'payments' && (
        <div className="space-y-8 animate-fade-in">
          {/* KPI Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Revenue */}
            <div className="p-5 bg-neutral-900/80 border border-neutral-800/90 rounded-2xl relative overflow-hidden">
              <div className="flex items-center justify-between text-neutral-400 mb-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold uppercase tracking-wider">Total Revenue</span>
                  <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-black">
                    ₹ INR
                  </span>
                </div>
                <div className="p-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <IndianRupee className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-white flex items-center gap-1">
                <span className="text-emerald-400">₹</span>
                <span>{paymentMetrics ? paymentMetrics.total_revenue.toLocaleString('en-IN') : '0'}</span>
              </div>
              <p className="text-[11px] text-emerald-400 font-medium mt-1 flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5" />
                Verified Settled Revenue (INR)
              </p>
            </div>

            {/* Pending Verifications */}
            <div className="p-5 bg-neutral-900/80 border border-neutral-800/90 rounded-2xl relative overflow-hidden">
              <div className="flex items-center justify-between text-neutral-400 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Pending Verifications</span>
                <Clock className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-amber-400">
                {paymentMetrics ? paymentMetrics.pending_verifications : '0'}
              </div>
              <p className="text-[11px] text-amber-400 font-medium mt-1">
                Awaiting your UTR approval
              </p>
            </div>

            {/* Confirmed Orders */}
            <div className="p-5 bg-neutral-900/80 border border-neutral-800/90 rounded-2xl relative overflow-hidden">
              <div className="flex items-center justify-between text-neutral-400 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Confirmed Payments</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-white">
                {paymentMetrics ? paymentMetrics.confirmed_payments : '0'}
              </div>
              <p className="text-[11px] text-neutral-400 mt-1">
                Active paid passes
              </p>
            </div>

            {/* Total Orders Initiated */}
            <div className="p-5 bg-neutral-900/80 border border-neutral-800/90 rounded-2xl relative overflow-hidden">
              <div className="flex items-center justify-between text-neutral-400 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Total Checkouts</span>
                <CreditCard className="w-4 h-4 text-purple-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-white">
                {paymentMetrics ? paymentMetrics.total_orders : '0'}
              </div>
              <p className="text-[11px] text-neutral-400 mt-1">
                {paymentMetrics ? paymentMetrics.refunded_count : 0} refunded
              </p>
            </div>
          </div>

          {/* FamApp QR & UPI Configuration Card */}
          <div className="p-6 bg-gradient-to-b from-neutral-900/90 to-neutral-950 border border-neutral-800 rounded-3xl shadow-xl space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-red-600/10 text-red-500 border border-red-500/20 rounded-xl">
                <QrCode className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">FamApp UPI QR Settings (Manual Verification)</h3>
                <p className="text-xs text-neutral-400">
                  Configure your FamApp UPI ID, Payee business name, and upload your FamApp QR code image.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Form: UPI ID & Business Name (7 cols) */}
              <form onSubmit={handleSaveConfig} className="lg:col-span-7 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-neutral-300 uppercase tracking-wider">
                      FamApp UPI ID *
                    </label>
                    <input
                      type="text"
                      required
                      value={upiIdInput}
                      onChange={(e) => setUpiIdInput(e.target.value)}
                      placeholder="e.g. yourname@famapp or yourname@idbi"
                      className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-white text-xs font-mono focus:border-red-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-neutral-300 uppercase tracking-wider">
                      Business / Payee Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={businessNameInput}
                      onChange={(e) => setBusinessNameInput(e.target.value)}
                      placeholder="e.g. TubeVault Media"
                      className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-white text-xs focus:border-red-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isSavingConfig}
                    className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{isSavingConfig ? 'Saving Settings...' : 'Save UPI Config'}</span>
                  </button>
                </div>
              </form>

              {/* Upload QR Image Box (5 cols) */}
              <div className="lg:col-span-5 p-4 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center gap-4">
                <div className="w-24 h-24 rounded-xl bg-white p-1.5 shrink-0 border border-neutral-700 flex items-center justify-center overflow-hidden">
                  {paymentConfig?.has_custom_qr && paymentConfig?.qr_image_url ? (
                    <img
                      src={paymentConfig.qr_image_url}
                      alt="Uploaded FamApp QR"
                      className="w-full h-full object-contain rounded-lg"
                    />
                  ) : (
                    <QrCode className="w-12 h-12 text-neutral-400" />
                  )}
                </div>

                <div className="space-y-2 flex-1">
                  <span className="text-xs font-bold text-white block">
                    {paymentConfig?.has_custom_qr ? 'Custom FamApp QR Active' : 'Default Dynamic QR Active'}
                  </span>
                  <p className="text-[11px] text-neutral-400">
                    Upload your official FamApp scanner image (PNG/JPG).
                  </p>
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 text-xs font-semibold cursor-pointer transition">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{isUploadingQR ? 'Uploading...' : 'Upload FamApp QR'}</span>
                    <input
                      type="file"
                      accept="image/png, image/jpeg, image/webp"
                      onChange={handleUploadQR}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Razorpay Gateway Configuration Card */}
          <div className="p-6 bg-gradient-to-b from-neutral-900/90 to-neutral-950 border border-neutral-800 rounded-3xl shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-600/10 text-blue-400 border border-blue-500/20 rounded-xl">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-black text-white">Razorpay Automatic Payment Gateway</h3>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                      rzpKeyId ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                    }`}>
                      {rzpKeyId ? 'API Keys Configured' : 'Simulated Test Mode'}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-400">
                    Enable automated instant customer activations using Razorpay UPI, Cards, and Netbanking.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <span className="text-xs font-semibold text-neutral-300">Gateway Status:</span>
                  <button
                    type="button"
                    onClick={() => setRzpEnabled(!rzpEnabled)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      rzpEnabled ? 'bg-emerald-600' : 'bg-neutral-800'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        rzpEnabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </label>
              </div>
            </div>

            <form onSubmit={handleSaveRzpConfig} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-neutral-300 uppercase tracking-wider">
                    Razorpay Key ID
                  </label>
                  <input
                    type="text"
                    value={rzpKeyId}
                    onChange={(e) => setRzpKeyId(e.target.value)}
                    placeholder="rzp_live_... or rzp_test_..."
                    className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-white text-xs font-mono focus:border-blue-500 focus:outline-none"
                  />
                  <p className="text-[10px] text-neutral-500">From Razorpay Dashboard → Settings → API Keys</p>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-neutral-300 uppercase tracking-wider">
                    Razorpay Key Secret
                  </label>
                  <input
                    type="password"
                    value={rzpKeySecret}
                    onChange={(e) => setRzpKeySecret(e.target.value)}
                    placeholder="Enter Secret Key"
                    className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-white text-xs font-mono focus:border-blue-500 focus:outline-none"
                  />
                  <p className="text-[10px] text-neutral-500">Used for cryptographic signature verification</p>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-neutral-300 uppercase tracking-wider">
                    Webhook Secret (Optional)
                  </label>
                  <input
                    type="password"
                    value={rzpWebhookSecret}
                    onChange={(e) => setRzpWebhookSecret(e.target.value)}
                    placeholder="Optional Webhook Secret"
                    className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-white text-xs font-mono focus:border-blue-500 focus:outline-none"
                  />
                  <p className="text-[10px] text-neutral-500">For asynchronous gateway events</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-[11px] text-neutral-400">
                  Tip: If keys are left blank, customers can test the checkout flow via simulated gateway orders!
                </span>
                <button
                  type="submit"
                  disabled={isSavingRzp}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{isSavingRzp ? 'Saving...' : 'Save Razorpay Credentials'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Payments Dashboard Table */}
          <div className="p-6 bg-neutral-900/90 border border-neutral-800 rounded-3xl space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-black text-white">Payments & Orders Directory</h3>
                <p className="text-xs text-neutral-400">
                  Inspect UTRs, verify customer manual transfers, approve subscriptions, or issue refunds
                </p>
              </div>

              {/* Filters & Search */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                  <input
                    type="text"
                    value={paymentSearch}
                    onChange={(e) => setPaymentSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && loadOrdersData()}
                    placeholder="Search Order ID, Email, UTR..."
                    className="w-full pl-9 pr-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-white text-xs focus:outline-none focus:border-red-500 transition"
                  />
                </div>

                <select
                  value={paymentFilter}
                  onChange={(e) => setPaymentFilter(e.target.value)}
                  className="px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-white text-xs focus:outline-none focus:border-red-500 transition"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending Only</option>
                  <option value="paid">Paid Only</option>
                  <option value="failed">Failed</option>
                  <option value="refunded">Refunded</option>
                </select>
              </div>
            </div>

            {/* Table with Required Columns: Order ID, Customer, Plan, Amount, Payment Method, UTR, Payment ID, Status, Date, Actions */}
            <div className="overflow-x-auto rounded-2xl border border-neutral-800">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-neutral-950/80 text-[11px] font-bold text-neutral-400 uppercase tracking-wider border-b border-neutral-800">
                    <th className="p-3.5">Order ID</th>
                    <th className="p-3.5">Customer</th>
                    <th className="p-3.5">Plan</th>
                    <th className="p-3.5">Amount</th>
                    <th className="p-3.5">Payment Method</th>
                    <th className="p-3.5">UTR</th>
                    <th className="p-3.5">Payment ID</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5">Date</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/60 text-xs">
                  {orders.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-8 text-center text-neutral-500">
                        No orders or payments found.
                      </td>
                    </tr>
                  ) : (
                    orders.map((order) => {
                      const status = (order.payment_status || order.order_status || 'PENDING').toUpperCase();
                      const isPending = status === 'PENDING';
                      const isPaid = status === 'PAID' || status === 'CONFIRMED';
                      const isRefunded = status === 'REFUNDED';

                      return (
                        <tr key={order.order_id} className="hover:bg-neutral-800/40 transition">
                          {/* Order ID */}
                          <td className="p-3.5 font-mono font-bold text-white whitespace-nowrap">
                            {order.order_id}
                          </td>

                          {/* Customer */}
                          <td className="p-3.5">
                            <div className="font-semibold text-white">{order.customer_name || 'N/A'}</div>
                            <div className="text-[11px] text-neutral-400">{order.user_email}</div>
                            {order.customer_mobile && (
                              <div className="text-[10px] text-neutral-500 font-mono">{order.customer_mobile}</div>
                            )}
                          </td>

                          {/* Plan */}
                          <td className="p-3.5">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-red-600/20 text-red-300 border border-red-500/20">
                              {order.plan_id}
                            </span>
                          </td>

                          {/* Amount */}
                          <td className="p-3.5 font-bold text-white whitespace-nowrap">
                            ₹{order.final_amount.toFixed(2)}
                            {order.discount_amount > 0 && (
                              <span className="text-[10px] block text-emerald-400 font-normal">
                                Saved ₹{order.discount_amount.toFixed(0)}
                              </span>
                            )}
                          </td>

                          {/* Payment Method */}
                          <td className="p-3.5 uppercase font-medium text-neutral-300 whitespace-nowrap">
                            {order.payment_method || 'UPI QR'}
                          </td>

                          {/* UTR */}
                          <td className="p-3.5 font-mono font-bold text-amber-400 whitespace-nowrap">
                            {order.utr ? (
                              <span className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                                {order.utr}
                              </span>
                            ) : (
                              <span className="text-neutral-500 italic">Not submitted</span>
                            )}
                          </td>

                          {/* Payment ID */}
                          <td className="p-3.5 font-mono text-[11px] text-neutral-400 whitespace-nowrap">
                            {order.payment_id || 'N/A'}
                          </td>

                          {/* Status */}
                          <td className="p-3.5 whitespace-nowrap">
                            {isPaid ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold uppercase">
                                <CheckCircle className="w-3 h-3" />
                                Paid
                              </span>
                            ) : isPending ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 text-[10px] font-bold uppercase">
                                <Clock className="w-3 h-3 animate-spin" style={{ animationDuration: '4s' }} />
                                Pending
                              </span>
                            ) : isRefunded ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-500/15 text-purple-400 border border-purple-500/30 text-[10px] font-bold uppercase">
                                <RotateCcw className="w-3 h-3" />
                                Refunded
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-500/15 text-red-400 border border-red-500/30 text-[10px] font-bold uppercase">
                                <XCircle className="w-3 h-3" />
                                {status}
                              </span>
                            )}
                          </td>

                          {/* Date */}
                          <td className="p-3.5 text-neutral-400 whitespace-nowrap">
                            {new Date(order.order_date).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </td>

                          {/* Actions: View, Approve, Reject, Refund, Download Invoice */}
                          <td className="p-3.5 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* View Details */}
                              <button
                                onClick={() => setSelectedOrder(order)}
                                className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition"
                                title="View Order Details"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>

                              {/* Approve Action (Only when pending & payment exists) */}
                              {isPending && order.payment_id && (
                                <button
                                  onClick={() => handleVerifyAction(order.payment_id!, 'approve')}
                                  disabled={actionLoadingId === order.payment_id}
                                  className="px-2.5 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 rounded-lg text-[11px] font-bold transition flex items-center gap-1"
                                  title="Approve UTR & Activate Plan"
                                >
                                  <Check className="w-3 h-3" />
                                  Approve
                                </button>
                              )}

                              {/* Reject Action */}
                              {isPending && order.payment_id && (
                                <button
                                  onClick={() => handleVerifyAction(order.payment_id!, 'reject')}
                                  disabled={actionLoadingId === order.payment_id}
                                  className="px-2 py-1 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 rounded-lg text-[11px] font-bold transition"
                                  title="Reject Payment"
                                >
                                  Reject
                                </button>
                              )}

                              {/* Refund Action */}
                              {isPaid && order.payment_id && (
                                <button
                                  onClick={() => handleRefund(order.payment_id!)}
                                  disabled={actionLoadingId === order.payment_id}
                                  className="px-2 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-red-400 rounded-lg text-[11px] transition"
                                  title="Issue Refund & Revoke Plan"
                                >
                                  Refund
                                </button>
                              )}

                              {/* Download Invoice */}
                              <a
                                href={getInvoiceHtmlUrl(order.order_id)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition"
                                title="Download / Print Invoice"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </a>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Details Modal */}
          {selectedOrder && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
              <div className="w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-2xl space-y-6 relative">
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="absolute top-5 right-5 p-2 text-neutral-400 hover:text-white rounded-full hover:bg-neutral-800 transition"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-3">
                  <div className="p-3 bg-red-600/10 text-red-500 border border-red-500/20 rounded-2xl">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-white">Order Details</h3>
                    <p className="text-xs font-mono text-neutral-400">{selectedOrder.order_id}</p>
                  </div>
                </div>

                <div className="space-y-3 text-xs bg-neutral-950 p-4 rounded-2xl border border-neutral-800/80">
                  <div className="flex justify-between"><span className="text-neutral-400">Customer Name:</span> <span className="font-bold text-white">{selectedOrder.customer_name}</span></div>
                  <div className="flex justify-between"><span className="text-neutral-400">Email Address:</span> <span className="font-bold text-white">{selectedOrder.user_email}</span></div>
                  <div className="flex justify-between"><span className="text-neutral-400">Mobile Phone:</span> <span className="font-mono text-white">{selectedOrder.customer_mobile || 'N/A'}</span></div>
                  <div className="flex justify-between"><span className="text-neutral-400">Plan Tier:</span> <span className="uppercase font-bold text-red-400">{selectedOrder.plan_id}</span></div>
                  <div className="flex justify-between"><span className="text-neutral-400">Amount:</span> <span className="font-bold text-emerald-400">₹{selectedOrder.final_amount.toFixed(2)}</span></div>
                  <div className="flex justify-between"><span className="text-neutral-400">Coupon Used:</span> <span className="font-mono text-amber-400">{selectedOrder.coupon_code || 'None'}</span></div>
                  <div className="flex justify-between"><span className="text-neutral-400">Submitted UTR:</span> <span className="font-mono font-bold text-amber-500">{selectedOrder.utr || 'Not Submitted'}</span></div>
                  <div className="flex justify-between"><span className="text-neutral-400">Payment ID:</span> <span className="font-mono text-white">{selectedOrder.payment_id || 'N/A'}</span></div>
                  <div className="flex justify-between"><span className="text-neutral-400">Status:</span> <span className="font-bold uppercase text-white">{selectedOrder.payment_status || selectedOrder.order_status}</span></div>
                  {selectedOrder.notes && (
                    <div className="pt-2 border-t border-neutral-800 text-neutral-400">
                      <span>Audit Notes: </span><span className="text-neutral-200">{selectedOrder.notes}</span>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2">
                  <a
                    href={getInvoiceHtmlUrl(selectedOrder.order_id)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>View Official Invoice</span>
                  </a>
                  {selectedOrder.payment_id && selectedOrder.payment_status === 'PENDING' && (
                    <button
                      onClick={() => handleVerifyAction(selectedOrder.payment_id!, 'approve')}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition"
                    >
                      Approve & Activate Plan
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================= SUBSCRIBERS TAB CONTENT ================= */}
      {activeTab === 'subscribers' && (
        <div className="space-y-8 animate-fade-in">
          {/* ⚡ Instant Customer Email Activation Tool */}
          <div className="p-6 bg-gradient-to-b from-neutral-900/90 to-neutral-950 border border-neutral-800 rounded-3xl relative overflow-hidden shadow-xl">
            <div className="flex items-center gap-2.5 mb-2">
              <div className="p-2 bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-xl">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">Instant Customer Email Plan Activation</h3>
                <p className="text-xs text-neutral-400">
                  Directly activate or upgrade any customer's plan by email.
                </p>
              </div>
            </div>

            <form onSubmit={handleManualActivate} className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <div className="lg:col-span-2 space-y-1">
                <label className="text-[11px] font-bold text-neutral-300 uppercase tracking-wider">
                  Customer Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                  <input
                    type="email"
                    required
                    value={manualEmail}
                    onChange={(e) => setManualEmail(e.target.value)}
                    placeholder="customer@example.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-white text-xs placeholder:text-neutral-600 focus:outline-none focus:border-amber-500 transition"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-neutral-300 uppercase tracking-wider">
                  Choose Plan Tier
                </label>
                <select
                  value={manualPlan}
                  onChange={(e) => setManualPlan(e.target.value)}
                  className="w-full px-3 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-white text-xs focus:outline-none focus:border-amber-500 transition"
                >
                  <option value="starter">Starter Pass</option>
                  <option value="pro">Pro Pass</option>
                  <option value="vip">1.5 Years VIP Pass</option>
                  <option value="lifetime">Lifetime VIP Pass</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-neutral-300 uppercase tracking-wider">
                  Validity Duration
                </label>
                <select
                  value={manualDuration}
                  onChange={(e) => setManualDuration(Number(e.target.value))}
                  className="w-full px-3 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-white text-xs focus:outline-none focus:border-amber-500 transition"
                >
                  <option value={30}>30 Days (1 Month)</option>
                  <option value={90}>90 Days (3 Months)</option>
                  <option value={365}>365 Days (1 Year)</option>
                  <option value={548}>548 Days (18 Months)</option>
                  <option value={36500}>Lifetime (Uncapped)</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={isActivating}
                  className="w-full py-2.5 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-amber-500/20 transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {isActivating ? 'Activating...' : 'Activate Plan'}
                </button>
              </div>
            </form>
          </div>

          {/* Subscriber Directory Table */}
          <div className="p-6 bg-neutral-900/90 border border-neutral-800 rounded-3xl space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-black text-white">Customer Subscriber Directory</h3>
                <p className="text-xs text-neutral-400">All registered subscribers in the database</p>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && loadDashboardData()}
                    placeholder="Search email..."
                    className="w-full pl-9 pr-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-white text-xs focus:outline-none focus:border-red-500 transition"
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-white text-xs focus:outline-none focus:border-red-500 transition"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active Only</option>
                  <option value="expired">Expired</option>
                  <option value="revoked">Revoked</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-neutral-800">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-neutral-950/80 text-[11px] font-bold text-neutral-400 uppercase tracking-wider border-b border-neutral-800">
                    <th className="p-3.5">Customer Email</th>
                    <th className="p-3.5">Active Plan</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5">Expires On</th>
                    <th className="p-3.5">Payment / Type</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/60 text-xs">
                  {subscribers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-neutral-500">
                        No customers found matching the search criteria.
                      </td>
                    </tr>
                  ) : (
                    subscribers.map((sub) => {
                      const isActive = sub.status === 'active' && !sub.is_expired;
                      return (
                        <tr key={sub.id} className="hover:bg-neutral-800/40 transition">
                          <td className="p-3.5 font-medium text-white flex items-center gap-2">
                            <Mail className="w-3.5 h-3.5 text-neutral-400" />
                            <span>{sub.email}</span>
                          </td>
                          <td className="p-3.5">
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-600/20 text-red-300 border border-red-500/20">
                              {sub.plan_name}
                            </span>
                          </td>
                          <td className="p-3.5">
                            {isActive ? (
                              <span className="text-emerald-400 font-semibold text-[11px]">
                                Active ({sub.days_remaining}d left)
                              </span>
                            ) : (
                              <span className="text-neutral-500 text-[11px] uppercase">{sub.status}</span>
                            )}
                          </td>
                          <td className="p-3.5 text-neutral-300">
                            {sub.expires_at ? new Date(sub.expires_at).toLocaleDateString() : 'N/A'}
                          </td>
                          <td className="p-3.5 text-neutral-400">
                            {sub.is_admin_grant ? 'ADMIN GRANT' : `₹${sub.amount_paid} (${sub.payment_method})`}
                          </td>
                          <td className="p-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleExtend(sub.email)}
                                className="px-2.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-[11px] font-semibold rounded-lg border border-neutral-700 transition"
                              >
                                +30d
                              </button>
                              {isActive && (
                                <button
                                  onClick={() => handleRevoke(sub.email)}
                                  className="px-2.5 py-1.5 bg-red-950/40 hover:bg-red-900/60 text-red-400 text-[11px] font-semibold rounded-lg border border-red-900/50 transition"
                                >
                                  Revoke
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Licenses & Certificates */}
      {activeTab === 'licenses' && (
        <div className="space-y-6">
          {/* Top Banner & Mint License Card */}
          <div className="p-6 bg-gradient-to-br from-neutral-900 via-neutral-900 to-amber-950/20 border border-neutral-800 rounded-3xl space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <KeyRound className="w-5 h-5 text-amber-400" />
                  Issue New Digital License Key
                </h3>
                <p className="text-xs text-neutral-400">
                  Manually generate or mint an official video download license key for a customer
                </p>
              </div>
              <span className="px-3 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full text-xs font-bold">
                {licensesTotal} Total Issued Keys
              </span>
            </div>

            <form onSubmit={handleCreateLicenseSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 pt-2">
              <div className="lg:col-span-2 space-y-1">
                <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                  Customer Email *
                </label>
                <input
                  type="email"
                  required
                  value={licEmail}
                  onChange={(e) => setLicEmail(e.target.value)}
                  placeholder="customer@example.com"
                  className="w-full px-3 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-white text-xs focus:outline-none focus:border-amber-500 transition"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                  Customer Name
                </label>
                <input
                  type="text"
                  value={licName}
                  onChange={(e) => setLicName(e.target.value)}
                  placeholder="Full Name (optional)"
                  className="w-full px-3 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-white text-xs focus:outline-none focus:border-amber-500 transition"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                  Plan Tier
                </label>
                <select
                  value={licPlan}
                  onChange={(e) => setLicPlan(e.target.value)}
                  className="w-full px-3 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-white text-xs focus:outline-none focus:border-amber-500 transition"
                >
                  <option value="basic">Basic (Full HD)</option>
                  <option value="pro">Pro (4K + Audio)</option>
                  <option value="unlimited">Unlimited (Commercial 8K)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                  Validity Duration
                </label>
                <select
                  value={licDuration}
                  onChange={(e) => setLicDuration(Number(e.target.value))}
                  className="w-full px-3 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-white text-xs focus:outline-none focus:border-amber-500 transition"
                >
                  <option value={30}>30 Days (1 Month)</option>
                  <option value={90}>90 Days (3 Months)</option>
                  <option value={365}>365 Days (1 Year)</option>
                  <option value={548}>548 Days (18 Months)</option>
                  <option value={36500}>Lifetime (Uncapped)</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={isGeneratingLicense}
                  className="w-full py-2.5 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-amber-500/20 transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {isGeneratingLicense ? 'Issuing...' : 'Issue License'}
                </button>
              </div>
            </form>

            <div className="pt-1">
              <input
                type="text"
                value={licCustomKey}
                onChange={(e) => setLicCustomKey(e.target.value)}
                placeholder="Optional Custom Key (Leave blank to auto-generate, e.g., TVLT-VIP-2026-ABCD)"
                className="w-full px-3 py-1.5 bg-neutral-950/60 border border-neutral-800/80 rounded-lg text-neutral-300 text-[11px] font-mono focus:outline-none focus:border-amber-500 transition"
              />
            </div>
          </div>

          {/* Licenses Directory Table */}
          <div className="p-6 bg-neutral-900/90 border border-neutral-800 rounded-3xl space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-black text-white">Issued Video Download Licenses</h3>
                <p className="text-xs text-neutral-400">
                  Every video download requires an active verified license key
                </p>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                  <input
                    type="text"
                    value={licenseSearch}
                    onChange={(e) => setLicenseSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && loadLicensesData()}
                    placeholder="Search key or email..."
                    className="w-full pl-9 pr-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-white text-xs focus:outline-none focus:border-amber-500 transition"
                  />
                </div>

                <select
                  value={licenseStatusFilter}
                  onChange={(e) => setLicenseStatusFilter(e.target.value)}
                  className="px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-white text-xs focus:outline-none focus:border-amber-500 transition"
                >
                  <option value="all">All Status</option>
                  <option value="ACTIVE">Active Only</option>
                  <option value="REVOKED">Revoked Only</option>
                </select>

                <button
                  type="button"
                  onClick={loadLicensesData}
                  className="p-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-xl border border-neutral-700 transition"
                  title="Search & Refresh"
                >
                  <RefreshCw className={`w-4 h-4 ${loadingLicenses ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-neutral-800">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-neutral-950/80 text-[11px] font-bold text-neutral-400 uppercase tracking-wider border-b border-neutral-800">
                    <th className="p-3.5">License Key</th>
                    <th className="p-3.5">Customer</th>
                    <th className="p-3.5">Plan Tier</th>
                    <th className="p-3.5">Downloads Used</th>
                    <th className="p-3.5">Expires On</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/60 text-xs">
                  {licenses.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-neutral-500">
                        {loadingLicenses ? 'Loading license records...' : 'No license keys found matching criteria.'}
                      </td>
                    </tr>
                  ) : (
                    licenses.map((lic) => {
                      const isActive = lic.status === 'ACTIVE';
                      const isRevoked = lic.status === 'REVOKED';
                      return (
                        <tr key={lic.license_key} className="hover:bg-neutral-800/40 transition">
                          <td className="p-3.5">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-amber-300 font-semibold text-xs tracking-wider bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                                {lic.license_key}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCopyKeyText(lic.license_key)}
                                className="p-1 hover:bg-neutral-800 rounded text-neutral-400 hover:text-white transition"
                                title="Copy Key"
                              >
                                {copiedKeyId === lic.license_key ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                            {lic.order_id && (
                              <div className="text-[10px] text-neutral-500 font-mono mt-0.5">
                                Order: {lic.order_id}
                              </div>
                            )}
                          </td>
                          <td className="p-3.5">
                            <div className="font-medium text-white">{lic.customer_name || 'Customer'}</div>
                            <div className="text-neutral-400 text-[11px] flex items-center gap-1 mt-0.5">
                              <Mail className="w-3 h-3" />
                              <span>{lic.user_email}</span>
                            </div>
                          </td>
                          <td className="p-3.5">
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-600/20 text-rose-300 border border-rose-500/20">
                              {lic.plan_id}
                            </span>
                          </td>
                          <td className="p-3.5">
                            <span className="font-semibold text-neutral-200">
                              {lic.download_count || 0}
                            </span>
                            <span className="text-neutral-500 text-[11px] ml-1">videos</span>
                          </td>
                          <td className="p-3.5 text-neutral-300 text-[11px]">
                            {lic.expires_at ? new Date(lic.expires_at).toLocaleDateString() : 'Lifetime'}
                          </td>
                          <td className="p-3.5">
                            {isActive ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                ACTIVE
                              </span>
                            ) : isRevoked ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-red-500/10 text-red-400 border border-red-500/20">
                                REVOKED
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-neutral-800 text-neutral-400">
                                {lic.status}
                              </span>
                            )}
                          </td>
                          <td className="p-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleCopyKeyText(lic.license_key)}
                                className="px-2.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-[11px] font-semibold rounded-lg border border-neutral-700 transition flex items-center gap-1"
                              >
                                <Copy className="w-3 h-3" />
                                Copy
                              </button>
                              {isActive && (
                                <button
                                  onClick={() => handleRevokeLicenseAction(lic.license_key)}
                                  className="px-2.5 py-1.5 bg-red-950/40 hover:bg-red-900/60 text-red-400 text-[11px] font-semibold rounded-lg border border-red-900/50 transition"
                                >
                                  Revoke
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
