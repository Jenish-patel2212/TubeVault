import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  ArrowLeft, 
  Check, 
  Copy, 
  ExternalLink, 
  QrCode, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Download, 
  Sparkles, 
  Zap, 
  Crown, 
  Smartphone, 
  RefreshCw, 
  Tag, 
  Receipt,
  CreditCard,
  Layers,
  ChevronRight
} from 'lucide-react';
import { 
  getPaymentConfig, 
  createCheckoutOrder, 
  validateCoupon, 
  submitManualUTR, 
  getOrderDetails, 
  getInvoiceHtmlUrl,
  getRazorpayConfig,
  createRazorpayOrder,
  verifyRazorpayPayment
} from '../utils/api';
import { PaymentConfig, OrderItem, PaymentItem } from '../types/api';
import { safeGetLocal, safeSetLocal } from '../utils/storage';

interface CheckoutPageProps {
  initialPlanId?: string;
  initialBillingCycle?: 'monthly' | 'yearly';
  onBackToPricing: () => void;
  onNavigateToDownloader: () => void;
  onNotify?: (title: string, message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

interface PlanInfo {
  id: string;
  name: string;
  badge?: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  fixedPrice?: number;
  isSpecialPeriod?: boolean;
  features: string[];
}

const PLAN_CATALOG: Record<string, PlanInfo> = {
  starter: {
    id: 'starter',
    name: 'Starter Pass',
    description: 'Full 1080p HD downloads, 192kbps audio, and accelerated speeds for everyday use.',
    monthlyPrice: 99,
    yearlyPrice: 69,
    features: [
      'Up to 1080p Full HD Resolution',
      '192 kbps Enhanced MP3 Audio',
      'Accelerated Speed (25 MB/s)',
      'Single Video URL Processing',
      'Mobile & Desktop Access'
    ]
  },
  pro: {
    id: 'pro',
    name: 'Pro Pass',
    badge: 'MOST POPULAR',
    description: 'Uncapped turbo speed, 4K 60FPS video, studio audio, and batch queue conversion.',
    monthlyPrice: 150,
    yearlyPrice: 99,
    features: [
      '4K & 2K Ultra HD (60 FPS & HDR)',
      '320 kbps Studio Quality Audio',
      '⚡ Uncapped Turbo Speed (100+ MB/s)',
      'Batch & Playlist Processing',
      '5 Simultaneous Concurrent Downloads',
      '100% Ad-Free Clean Interface'
    ]
  },
  '1.5years': {
    id: '1.5years',
    name: '1.5 Years VIP Pass',
    badge: 'MEGA VALUE • 18 MONTHS',
    description: '18 full months of uncapped downloads, 4K 60FPS video, and VIP bandwidth for just ₹499.',
    monthlyPrice: 0,
    yearlyPrice: 0,
    fixedPrice: 499,
    isSpecialPeriod: true,
    features: [
      '18 Months (1.5 Years) Unlimited Access',
      'Only ~₹27 / Month (82% Savings)',
      '4K & 2K Ultra HD (60 FPS & HDR)',
      '320 kbps Studio Quality Audio',
      '⚡ Dedicated VIP Bandwidth Servers',
      'Unlimited Concurrent Queue Downloads'
    ]
  },
  lifetime: {
    id: 'lifetime',
    name: 'Lifetime VIP Pass',
    badge: 'ULTIMATE LIFETIME',
    description: 'Lifetime unrestricted access to TubeVault premium engine forever.',
    monthlyPrice: 0,
    yearlyPrice: 0,
    fixedPrice: 999,
    isSpecialPeriod: true,
    features: [
      'Lifetime Unlimited Access (Forever)',
      '4K & 8K Ultra HD Support',
      '320 kbps Studio Audio',
      'Priority Queue & Cloud Storage Export',
      'Direct VIP WhatsApp & Email Support'
    ]
  }
};

export const CheckoutPage: React.FC<CheckoutPageProps> = ({
  initialPlanId = 'pro',
  initialBillingCycle = 'yearly',
  onBackToPricing,
  onNavigateToDownloader,
  onNotify
}) => {
  const [selectedPlanId, setSelectedPlanId] = useState<string>(initialPlanId);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>(initialBillingCycle);

  // Customer Inputs
  const [customerName, setCustomerName] = useState(() => safeGetLocal('tubevault_customer_name', ''));
  const [customerEmail, setCustomerEmail] = useState(() => safeGetLocal('tubevault_customer_email', ''));
  const [customerMobile, setCustomerMobile] = useState(() => safeGetLocal('tubevault_customer_mobile', ''));

  // Coupon
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discount_amount: number;
    final_amount: number;
    message: string;
  } | null>(null);
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);

  // Payment Method Mode: 'gateway' (Automatic Razorpay) vs 'manual_upi' (FamApp QR)
  const [paymentMode, setPaymentMode] = useState<'gateway' | 'manual_upi'>('gateway');

  // Config State
  const [config, setConfig] = useState<PaymentConfig>({
    upi_id: 'famapp@idbi',
    business_name: 'TubeVault Media',
    has_custom_qr: true,
    qr_image_url: '/famapp_qr.jpg'
  });
  const [razorpayPublicConfig, setRazorpayPublicConfig] = useState<{
    enabled: boolean;
    has_real_keys: boolean;
    key_id: string;
  }>({
    enabled: true,
    has_real_keys: false,
    key_id: 'rzp_test_simulated'
  });

  // Order & Payment State
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [currentOrder, setCurrentOrder] = useState<OrderItem | null>(null);
  const [currentPayment, setCurrentPayment] = useState<PaymentItem | null>(null);
  const [upiUri, setUpiUri] = useState<string>('');

  // UTR Form State (for manual UPI)
  const [utrInput, setUtrInput] = useState('');
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [isSubmittingUTR, setIsSubmittingUTR] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);

  // Razorpay Gateway State
  const [isPayingRazorpay, setIsPayingRazorpay] = useState(false);
  const [showSimulatedModal, setShowSimulatedModal] = useState(false);
  const [simulatedGatewayData, setSimulatedGatewayData] = useState<any>(null);

  const plan = PLAN_CATALOG[selectedPlanId] || PLAN_CATALOG.pro;

  // Compute Prices (Without GST)
  const basePrice = plan.isSpecialPeriod
    ? plan.fixedPrice || 499
    : billingCycle === 'yearly'
    ? plan.yearlyPrice * 12
    : plan.monthlyPrice;

  const payableAmount = appliedCoupon ? appliedCoupon.final_amount : basePrice;

  useEffect(() => {
    loadConfig();
    loadRazorpayGatewayConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const cfg = await getPaymentConfig();
      setConfig(cfg);
    } catch (e) {
      console.warn('Config load warning:', e);
    }
  };

  const loadRazorpayGatewayConfig = async () => {
    try {
      const cfg = await getRazorpayConfig();
      setRazorpayPublicConfig(cfg);
    } catch (e) {
      console.warn('Razorpay config warning:', e);
    }
  };

  // Create or retrieve checkout order
  const handleInitiateOrder = async (): Promise<OrderItem | null> => {
    const cleanName = customerName.trim();
    const cleanEmail = customerEmail.trim().toLowerCase();
    const cleanMobile = customerMobile.trim();

    if (!cleanName || cleanName.length < 2) {
      onNotify?.('Name Required', 'Please enter your full name.', 'warning');
      return null;
    }
    if (!cleanEmail || !cleanEmail.includes('@')) {
      onNotify?.('Email Required', 'Please enter a valid email address.', 'warning');
      return null;
    }
    if (!cleanMobile || cleanMobile.length < 10) {
      onNotify?.('Mobile Required', 'Please enter a valid 10-digit mobile number.', 'warning');
      return null;
    }

    setIsCreatingOrder(true);
    try {
      safeSetLocal('tubevault_customer_name', cleanName);
      safeSetLocal('tubevault_customer_email', cleanEmail);
      safeSetLocal('tubevault_customer_mobile', cleanMobile);

      const res = await createCheckoutOrder({
        customer_name: cleanName,
        customer_email: cleanEmail,
        customer_mobile: cleanMobile,
        plan_id: plan.id,
        billing_cycle: plan.isSpecialPeriod ? 'fixed' : billingCycle,
        coupon_code: appliedCoupon ? appliedCoupon.code : undefined
      });

      setCurrentOrder(res.order);
      setUpiUri(res.payment_details.upi_uri);
      return res.order;
    } catch (err: any) {
      onNotify?.('Order Creation Failed', err.message || 'Could not initiate checkout.', 'error');
      return null;
    } finally {
      setIsCreatingOrder(false);
    }
  };

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponInput.trim()) return;

    setIsValidatingCoupon(true);
    try {
      const res = await validateCoupon(couponInput.trim(), basePrice);
      if (res.valid) {
        setAppliedCoupon(res);
        onNotify?.('Coupon Applied! 🎉', res.message, 'success');
      } else {
        setAppliedCoupon(null);
        onNotify?.('Invalid Coupon', res.message, 'warning');
      }
    } catch (err: any) {
      onNotify?.('Coupon Error', err.message || 'Failed to check coupon.', 'error');
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  const handleCopyUpiId = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      navigator.clipboard.writeText(config.upi_id).catch(() => {});
    }
    setCopiedUpi(true);
    onNotify?.('Copied to Clipboard', `UPI ID: ${config.upi_id}`, 'success');
    setTimeout(() => setCopiedUpi(false), 2500);
  };

  const handleSubmitUTR = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrder) {
      onNotify?.('Order Missing', 'Please create your order before submitting payment.', 'warning');
      return;
    }

    const cleanUtr = utrInput.trim();
    if (cleanUtr.length !== 12) {
      onNotify?.('Invalid UTR', 'UPI Reference Number (UTR) must be exactly 12 digits.', 'error');
      return;
    }

    setIsSubmittingUTR(true);
    try {
      const res = await submitManualUTR({
        order_id: currentOrder.id,
        utr: cleanUtr,
        payment_date: paymentDate,
        amount: currentOrder.final_amount,
        customer_name: customerName,
        customer_email: customerEmail,
        customer_mobile: customerMobile
      });

      setCurrentPayment(res.payment);
      onNotify?.('UTR Submitted', 'Saved as Pending Verification. Admin will verify your payment.', 'success');
    } catch (err: any) {
      onNotify?.('Submission Failed', err.message || 'Unable to submit payment.', 'error');
    } finally {
      setIsSubmittingUTR(false);
    }
  };

  // --- Razorpay Payment Gateway Trigger ---
  const handlePayWithRazorpay = async () => {
    let order = currentOrder;
    if (!order) {
      order = await handleInitiateOrder();
      if (!order) return;
    }

    setIsPayingRazorpay(true);
    try {
      const rzpRes = await createRazorpayOrder(order.id);
      const rzpOrderData = rzpRes.order;

      if (rzpOrderData.is_simulated) {
        // Open Simulated Gateway Modal for instant frictionless testing
        setSimulatedGatewayData({
          order_id: order.id,
          razorpay_order_id: rzpOrderData.razorpay_order_id,
          amount: order.final_amount
        });
        setShowSimulatedModal(true);
      } else {
        // Load official Razorpay Checkout SDK
        const isLoaded = await loadRazorpayScript();
        if (!isLoaded) {
          throw new Error('Failed to load Razorpay payment SDK.');
        }

        const options = {
          key: rzpOrderData.key_id,
          amount: rzpOrderData.amount,
          currency: rzpOrderData.currency,
          name: config.business_name || 'TubeVault Media',
          description: `${plan.name} Subscription`,
          image: '/famapp_qr.jpg',
          order_id: rzpOrderData.razorpay_order_id,
          handler: async (response: any) => {
            await handleVerifyRazorpaySuccess({
              order_id: order!.id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            });
          },
          prefill: {
            name: customerName,
            email: customerEmail,
            contact: customerMobile
          },
          theme: {
            color: '#dc2626'
          }
        };

        const rzp = new (window as any).Razorpay(options);
        rzp.open();
      }
    } catch (err: any) {
      onNotify?.('Gateway Error', err.message || 'Unable to connect to Razorpay.', 'error');
    } finally {
      setIsPayingRazorpay(false);
    }
  };

  const handleVerifyRazorpaySuccess = async (payload: {
    order_id: string;
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }) => {
    try {
      const verifyRes = await verifyRazorpayPayment(payload);
      if (verifyRes.success) {
        setCurrentPayment({
          id: payload.razorpay_payment_id,
          order_id: payload.order_id,
          payment_method: 'gateway',
          payment_gateway: 'razorpay',
          utr: payload.razorpay_payment_id,
          amount: payableAmount,
          status: 'PAID',
          customer_name: customerName,
          customer_email: customerEmail,
          customer_mobile: customerMobile,
          payment_date: new Date().toISOString().slice(0, 10),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

        safeSetLocal('tubevault_user_plan', plan.id);
        setShowSimulatedModal(false);
        onNotify?.('🎉 Payment Verified!', 'Your plan is now active! Uncapped 4K downloads are unlocked.', 'success');
      }
    } catch (err: any) {
      onNotify?.('Verification Failed', err.message || 'Payment signature could not be verified.', 'error');
    }
  };

  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if ((window as any).Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  // Poll for verification approval if in PENDING state (Manual UPI mode)
  useEffect(() => {
    let interval: any;
    if (currentOrder && currentPayment && currentPayment.status === 'PENDING') {
      interval = setInterval(async () => {
        try {
          const res = await getOrderDetails(currentOrder.id);
          if (res.payment && res.payment.status !== 'PENDING') {
            setCurrentPayment(res.payment);
            setCurrentOrder(res.order);
            if (res.payment.status === 'PAID') {
              safeSetLocal('tubevault_user_plan', res.order.plan_id);
              onNotify?.('🎉 Payment Verified!', 'Your plan is now active! Enjoy unlimited high-speed downloads.', 'success');
            } else if (res.payment.status === 'FAILED') {
              onNotify?.('Verification Failed', res.payment.notes || 'Admin rejected payment.', 'error');
            }
          }
        } catch (e) {
          console.warn('Polling error:', e);
        }
      }, 4000);
    }
    return () => clearInterval(interval);
  }, [currentOrder, currentPayment]);

  // QR Code URL: Uses the uploaded FamApp QR image
  const qrDisplayUrl = config.qr_image_url || '/famapp_qr.jpg';

  return (
    <div className="max-w-6xl mx-auto py-4 px-2 sm:px-4 space-y-8 animate-fade-in">
      {/* Top Breadcrumb & Return to Pricing */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBackToPricing}
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Plans</span>
        </button>

        <div className="inline-flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
          <ShieldCheck className="w-4 h-4" />
          <span>256-Bit SSL Encrypted & Secure Checkout</span>
        </div>
      </div>

      {/* Main Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Plan Summary & Coupon (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
            {/* Top Accent Glow */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-red-600 via-rose-500 to-amber-500" />

            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-black tracking-widest text-slate-400 dark:text-slate-500 uppercase">
                Order Summary
              </span>
              {plan.badge && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-red-600/10 text-red-600 dark:text-red-400 border border-red-500/20 uppercase tracking-wide">
                  {plan.badge}
                </span>
              )}
            </div>

            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <Crown className="w-6 h-6 text-amber-500" />
              <span>{plan.name}</span>
            </h2>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
              {plan.description}
            </p>

            {/* Plan Features */}
            <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800/80 space-y-2.5">
              <span className="text-xs font-bold text-slate-900 dark:text-slate-200 block mb-1">
                Included with your pass:
              </span>
              {plan.features.map((feat, idx) => (
                <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-300">
                  <div className="w-4 h-4 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-2.5 h-2.5" />
                  </div>
                  <span>{feat}</span>
                </div>
              ))}
            </div>

            {/* Coupon Field */}
            <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800/80">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                Have a discount coupon?
              </label>
              <form onSubmit={handleApplyCoupon} className="flex gap-2">
                <div className="relative flex-1">
                  <Tag className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                    placeholder="e.g. WELCOME20"
                    disabled={Boolean(appliedCoupon)}
                    className="w-full pl-9 pr-3 py-2 text-xs uppercase tracking-wider font-mono rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-red-500 text-slate-900 dark:text-white"
                  />
                </div>
                {appliedCoupon ? (
                  <button
                    type="button"
                    onClick={() => { setAppliedCoupon(null); setCouponInput(''); }}
                    className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 transition"
                  >
                    Remove
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={isValidatingCoupon || !couponInput.trim()}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-red-600 dark:hover:bg-red-500 dark:hover:text-white transition disabled:opacity-50"
                  >
                    {isValidatingCoupon ? 'Checking...' : 'Apply'}
                  </button>
                )}
              </form>

              {appliedCoupon && (
                <div className="mt-2.5 flex items-center justify-between px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
                  <span>Coupon {appliedCoupon.code} applied!</span>
                  <span>- ₹{appliedCoupon.discount_amount.toFixed(2)}</span>
                </div>
              )}
            </div>

            {/* Price Breakdown (No GST) */}
            <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800/80 space-y-2">
              <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400">
                <span>Base Subscription</span>
                <span className="font-semibold text-slate-900 dark:text-slate-200">₹{basePrice.toFixed(2)}</span>
              </div>
              {appliedCoupon && (
                <div className="flex justify-between text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                  <span>Coupon Discount</span>
                  <span>- ₹{appliedCoupon.discount_amount.toFixed(2)}</span>
                </div>
              )}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-between items-baseline">
                <span className="text-sm font-bold text-slate-900 dark:text-white">Final Payable Amount</span>
                <span className="text-2xl font-black text-red-600 dark:text-red-400 font-display">
                  ₹{payableAmount.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Guarantees / Badges */}
          <div className="bg-slate-100/70 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-4 flex items-center gap-3">
            <ShieldCheck className="w-8 h-8 text-emerald-500 shrink-0" />
            <div className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
              <span className="font-bold text-slate-900 dark:text-slate-200">100% Satisfaction Guarantee</span>: Instant access to uncapped 4K downloads upon verification. 30-day money-back policy.
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Payment Section (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* If payment is PAID (Success State) */}
          {currentPayment && currentPayment.status === 'PAID' ? (
            <div className="bg-white dark:bg-slate-900 border border-emerald-500/30 rounded-3xl p-8 shadow-2xl text-center space-y-6 animate-scale-up">
              <div className="w-20 h-20 mx-auto rounded-full bg-emerald-500/10 border-2 border-emerald-500/30 flex items-center justify-center text-emerald-500">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div>
                <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                  Payment Successful!
                </h3>
                <p className="text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
                  Your plan is now active.
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 max-w-md mx-auto">
                  Thank you! Your premium privileges have been linked to <span className="font-bold text-slate-800 dark:text-slate-200">{currentOrder?.user_email || customerEmail}</span>.
                </p>
              </div>

              <div className="inline-flex flex-wrap justify-center gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 text-xs">
                <div><span className="text-slate-400">Order ID:</span> <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{currentOrder?.id}</span></div>
                <div className="text-slate-300">|</div>
                <div><span className="text-slate-400">Payment Ref:</span> <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{currentPayment.utr}</span></div>
                <div className="text-slate-300">|</div>
                <div><span className="text-slate-400">Amount:</span> <span className="font-bold text-emerald-500">₹{currentPayment.amount.toFixed(2)}</span></div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                <a
                  href={getInvoiceHtmlUrl(currentOrder?.id || '')}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition shadow-md"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Invoice</span>
                </a>

                <button
                  onClick={onNavigateToDownloader}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-xs font-bold transition shadow-lg shadow-red-600/30"
                >
                  <Zap className="w-4 h-4" />
                  <span>Start 4K Turbo Downloads</span>
                </button>
              </div>
            </div>
          ) : currentPayment && currentPayment.status === 'PENDING' ? (
            /* Pending Verification State */
            <div className="bg-white dark:bg-slate-900 border border-amber-500/30 rounded-3xl p-8 shadow-2xl text-center space-y-6">
              <div className="w-20 h-20 mx-auto rounded-full bg-amber-500/10 border-2 border-amber-500/30 flex items-center justify-center text-amber-500">
                <Clock className="w-10 h-10 animate-spin" style={{ animationDuration: '6s' }} />
              </div>

              <div>
                <span className="inline-block px-3 py-1 rounded-full text-xs font-extrabold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 uppercase tracking-wide mb-2">
                  Pending Verification
                </span>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  Verification in Progress
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-2 max-w-md mx-auto leading-relaxed">
                  We have received your 12-digit UPI reference number. Our administrative team is currently matching it with the bank settlement.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-xs space-y-1.5 text-left max-w-md mx-auto">
                <div className="flex justify-between"><span className="text-slate-400">Order ID:</span> <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{currentOrder?.id}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Submitted UTR:</span> <span className="font-mono font-bold text-amber-500">{currentPayment.utr}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Payable Amount:</span> <span className="font-bold text-slate-800 dark:text-slate-200">₹{currentOrder?.final_amount.toFixed(2)}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Verification Status:</span> <span className="font-bold text-amber-500">PENDING APPROVAL</span></div>
              </div>

              <div className="flex items-center justify-center gap-2 text-xs text-slate-400 pt-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Checking confirmation status live... (auto-updates when approved)</span>
              </div>
            </div>
          ) : currentPayment && currentPayment.status === 'FAILED' ? (
            /* Failed State */
            <div className="bg-white dark:bg-slate-900 border border-red-500/30 rounded-3xl p-8 shadow-2xl text-center space-y-6">
              <div className="w-16 h-16 mx-auto rounded-full bg-red-500/10 text-red-500 flex items-center justify-center">
                <AlertCircle className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white">Payment Verification Failed</h3>
              <p className="text-xs text-red-500">{currentPayment.notes || 'The submitted UTR could not be verified against the bank statement.'}</p>
              <button
                onClick={() => setCurrentPayment(null)}
                className="px-6 py-2.5 rounded-xl bg-slate-800 text-white text-xs font-bold"
              >
                Re-submit Correct UTR
              </button>
            </div>
          ) : (
            /* Step-by-Step Checkout Card */
            <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-8">
              {/* Step 1: Customer Contact Info */}
              <div className="space-y-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-full bg-red-600 text-white text-xs font-extrabold flex items-center justify-center">
                    1
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Customer Details
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="e.g. Rahul Sharma"
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Email Address (Pass will be linked here) *
                    </label>
                    <input
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="rahul@example.com"
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:outline-none"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Mobile Number (For UPI Verification) *
                    </label>
                    <input
                      type="tel"
                      value={customerMobile}
                      onChange={(e) => setCustomerMobile(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Step 2: Choose Payment Option (Gateway vs FamApp QR) */}
              <div className="space-y-5 pt-6 border-t border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-full bg-red-600 text-white text-xs font-extrabold flex items-center justify-center">
                    2
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Select Payment Method
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Option A: Payment Gateway */}
                  <button
                    type="button"
                    onClick={() => setPaymentMode('gateway')}
                    className={`p-4 rounded-2xl border text-left transition-all relative ${
                      paymentMode === 'gateway'
                        ? 'bg-red-600/5 dark:bg-red-500/10 border-red-500 shadow-md ring-2 ring-red-500/20'
                        : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="p-2 rounded-xl bg-gradient-to-tr from-red-600 to-rose-600 text-white shadow-sm">
                        <Zap className="w-4 h-4" />
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                        INSTANT ACTIVE
                      </span>
                    </div>
                    <div className="font-bold text-xs text-slate-900 dark:text-white">
                      Payment Gateway (Razorpay)
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                      UPI, Google Pay, PhonePe, Paytm, Cards & NetBanking.
                    </p>
                  </button>

                  {/* Option B: FamApp QR */}
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentMode('manual_upi');
                      if (!currentOrder) handleInitiateOrder();
                    }}
                    className={`p-4 rounded-2xl border text-left transition-all relative ${
                      paymentMode === 'manual_upi'
                        ? 'bg-amber-600/5 dark:bg-amber-500/10 border-amber-500 shadow-md ring-2 ring-amber-500/20'
                        : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="p-2 rounded-xl bg-amber-500 text-black shadow-sm">
                        <QrCode className="w-4 h-4" />
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-500/15 text-amber-600 dark:text-amber-400">
                        FAMAPP QR
                      </span>
                    </div>
                    <div className="font-bold text-xs text-slate-900 dark:text-white">
                      FamApp UPI QR & ID
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                      Scan custom FamApp QR code & enter 12-digit UTR.
                    </p>
                  </button>
                </div>

                {/* --- GATEWAY PAYMENT ACTION VIEW --- */}
                {paymentMode === 'gateway' && (
                  <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 text-white space-y-4 border border-slate-800 shadow-xl animate-fade-in">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-5 h-5 text-red-400" />
                        <span className="font-bold text-sm">Secure Payment Gateway</span>
                      </div>
                      <span className="text-xs px-2.5 py-1 rounded-full bg-slate-800 font-mono text-emerald-400 font-bold">
                        ₹{payableAmount.toFixed(2)}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed">
                      Click below to open the gateway checkout. Pay with Google Pay, PhonePe, Paytm, BHIM, or Cards. Your plan will activate <strong className="text-emerald-400">instantly</strong>.
                    </p>

                    <button
                      onClick={handlePayWithRazorpay}
                      disabled={isPayingRazorpay || isCreatingOrder}
                      className="w-full py-4 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-extrabold text-xs uppercase tracking-wider transition shadow-lg shadow-red-600/30 flex items-center justify-center gap-2"
                    >
                      {isPayingRazorpay ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Connecting to Payment Gateway...</span>
                        </>
                      ) : (
                        <>
                          <Zap className="w-4 h-4" />
                          <span>Pay ₹{payableAmount.toFixed(2)} with Gateway</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* --- MANUAL FAMAPP UPI QR VIEW --- */}
                {paymentMode === 'manual_upi' && (
                  <div className="space-y-6 animate-fade-in">
                    {/* QR Card */}
                    <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 text-center space-y-4">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-[11px] font-bold">
                        <Smartphone className="w-3.5 h-3.5" />
                        <span>Scan with FamApp, GPay, PhonePe, Paytm & any UPI app</span>
                      </div>

                      {/* QR Code Container */}
                      <div className="w-56 h-56 mx-auto bg-white p-2 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden">
                        <img
                          src={qrDisplayUrl}
                          alt="FamApp UPI QR Code"
                          className="w-full h-full object-contain rounded-xl"
                        />
                      </div>

                      {/* UPI ID Display with Copy */}
                      <div className="max-w-xs mx-auto">
                        <div className="text-[11px] uppercase tracking-wider font-bold text-slate-400 mb-1">
                          UPI ID: {config.upi_id}
                        </div>
                        <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                          <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                            {config.upi_id}
                          </span>
                          <button
                            type="button"
                            onClick={handleCopyUpiId}
                            className="ml-2 p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                            title="Copy UPI ID"
                          >
                            {copiedUpi ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      {/* Open in UPI App Deep Link Button */}
                      <div className="pt-2">
                        <a
                          href={upiUri || `upi://pay?pa=${config.upi_id}&pn=${encodeURIComponent(config.business_name)}&am=${payableAmount.toFixed(2)}&cu=INR`}
                          className="inline-flex items-center justify-center gap-2 w-full max-w-xs px-5 py-3 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-xs font-bold transition shadow-lg shadow-red-600/25"
                        >
                          <ExternalLink className="w-4 h-4" />
                          <span>Open UPI App (Pay ₹{payableAmount.toFixed(2)})</span>
                        </a>
                      </div>
                    </div>

                    {/* Step 3: UTR Submission Form */}
                    <form onSubmit={handleSubmitUTR} className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800/80">
                      <div className="flex items-center gap-2.5">
                        <div className="w-6 h-6 rounded-full bg-red-600 text-white text-xs font-extrabold flex items-center justify-center">
                          3
                        </div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">
                          Enter Transaction Reference (UTR)
                        </h3>
                      </div>

                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        After paying via FamApp, find the 12-digit UTR number from your payment receipt and enter it below:
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                            12-Digit UTR / Transaction ID *
                          </label>
                          <input
                            type="text"
                            maxLength={12}
                            value={utrInput}
                            onChange={(e) => setUtrInput(e.target.value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 12))}
                            placeholder="e.g. 425612345678"
                            className="w-full px-3.5 py-2.5 text-xs font-mono font-bold tracking-widest rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:outline-none uppercase"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                            Payment Date *
                          </label>
                          <input
                            type="date"
                            value={paymentDate}
                            onChange={(e) => setPaymentDate(e.target.value)}
                            className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:outline-none"
                            required
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={isSubmittingUTR || utrInput.trim().length !== 12}
                        className="w-full py-3.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs uppercase tracking-wider transition shadow-lg shadow-red-600/30 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSubmittingUTR ? 'Submitting Reference...' : 'Submit Payment for Verification'}
                      </button>
                    </form>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Interactive Gateway Simulator Modal (Allows instant testing if live keys are not yet added) */}
      {showSimulatedModal && simulatedGatewayData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6 text-white relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-red-600/20 text-red-500 rounded-xl">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm">Razorpay Payment Gateway</h4>
                  <span className="text-[10px] text-emerald-400 font-bold uppercase">Automated Checkout</span>
                </div>
              </div>
              <button
                onClick={() => setShowSimulatedModal(false)}
                className="text-slate-400 hover:text-white text-xs"
              >
                Cancel
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-center space-y-2">
              <span className="text-xs text-slate-400">Total Payable Amount</span>
              <div className="text-3xl font-black text-white font-display">
                ₹{simulatedGatewayData.amount.toFixed(2)}
              </div>
              <div className="text-[11px] text-slate-500">Order: {simulatedGatewayData.order_id}</div>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                Choose UPI App to Authorize:
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700 flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-emerald-400" />
                  <span>Google Pay</span>
                </div>
                <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700 flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-purple-400" />
                  <span>PhonePe</span>
                </div>
                <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700 flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-blue-400" />
                  <span>Paytm UPI</span>
                </div>
                <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-amber-400" />
                  <span>Cards / NetBanking</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                handleVerifyRazorpaySuccess({
                  order_id: simulatedGatewayData.order_id,
                  razorpay_order_id: simulatedGatewayData.razorpay_order_id,
                  razorpay_payment_id: `pay_rzp_${Math.random().toString(36).substring(2, 10)}`,
                  razorpay_signature: 'simulated_valid_signature'
                });
              }}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/25 transition hover:brightness-110 flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" />
              <span>Simulate Successful Payment (Instant Active)</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
