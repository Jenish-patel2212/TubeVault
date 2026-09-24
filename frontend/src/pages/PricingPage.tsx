import React, { useState } from 'react';
import { 
  Check, 
  Sparkles, 
  Zap, 
  Crown, 
  ShieldCheck, 
  CreditCard, 
  Flame, 
  Lock, 
  ChevronDown, 
  ChevronUp, 
  Star, 
  HelpCircle,
  X,
  CheckCircle2,
  ArrowRight,
  Radio,
  FileCheck,
  Mail
} from 'lucide-react';
import { buySubscription } from '../utils/api';
import { safeGetLocal, safeSetLocal } from '../utils/storage';

interface PricingPageProps {
  onNotify?: (title: string, message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
  onNavigateToCheckout?: (planId: string, billingCycle: 'monthly' | 'yearly') => void;
}

interface PlanTier {
  id: string;
  name: string;
  badge?: string;
  isPopular?: boolean;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  isSpecialPeriod?: boolean;
  fixedPrice?: number;
  periodLabel?: string;
  features: string[];
  ctaText: string;
  ctaStyle: 'outline' | 'gradient' | 'chrome';
}

export const PricingPage: React.FC<PricingPageProps> = ({ onNotify, onNavigateToCheckout }) => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('yearly');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [selectedPlan, setSelectedPlan] = useState<PlanTier | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'paypal' | 'upi' | 'crypto'>('upi');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [customerEmail, setCustomerEmail] = useState(() => {
    return safeGetLocal('tubevault_customer_email');
  });
  
  // Track currently active plan in LocalStorage
  const [currentPlan, setCurrentPlan] = useState<string>(() => {
    return safeGetLocal('tubevault_user_plan', 'free');
  });

  const plans: PlanTier[] = [
    {
      id: 'starter',
      name: 'Starter Pass',
      description: 'Full 1080p HD downloads, 192kbps audio, and accelerated speeds for everyday use.',
      monthlyPrice: 99,
      yearlyPrice: 69, // ₹828/year (Save 30%)
      features: [
        'Up to 1080p Full HD Resolution',
        '192 kbps Enhanced MP3 Audio',
        'Accelerated Download Speed (25 MB/s)',
        'Single Video URL Processing',
        'Browser Local History',
        'Mobile & Desktop Access',
        'Priority Email Support'
      ],
      ctaText: currentPlan === 'starter' ? 'Active Plan' : 'Get Starter (₹99)',
      ctaStyle: 'outline'
    },
    {
      id: 'pro',
      name: 'Pro Pass',
      badge: 'MOST POPULAR',
      isPopular: true,
      description: 'Uncapped turbo speed, 4K 60FPS video, studio audio, and batch queue conversion.',
      monthlyPrice: 150,
      yearlyPrice: 99, // ₹1,188/year
      features: [
        '4K & 2K Ultra HD (60 FPS & HDR)',
        '320 kbps Studio Quality Audio (MP3/M4A)',
        '⚡ Uncapped Turbo Speed (100+ MB/s)',
        'Batch & Playlist Processing (Up to 25 items)',
        'Up to 5 Simultaneous Concurrent Downloads',
        '100% Ad-Free Clean Interface',
        'Priority Server Processing Queue',
        'Direct Cloud Storage Forwarding (Drive/Dropbox)'
      ],
      ctaText: currentPlan === 'pro' ? 'Active Plan' : 'Upgrade to Pro Pass',
      ctaStyle: 'gradient'
    },
    {
      id: '1.5years',
      name: '1.5 Years VIP Pass',
      badge: 'MEGA VALUE • 18 MONTHS',
      description: '18 full months of uncapped downloads, 4K 60FPS video, and VIP bandwidth for just ₹499.',
      monthlyPrice: 0,
      yearlyPrice: 0,
      isSpecialPeriod: true,
      fixedPrice: 499,
      periodLabel: 'for 1.5 Years (18 Months)',
      features: [
        '18 Months (1.5 Years) Unlimited Access',
        'Only ~₹27 / Month (Massive 82% Savings)',
        '4K & 2K Ultra HD (60 FPS & HDR)',
        '320 kbps Studio Quality Audio (MP3/M4A)',
        '⚡ Dedicated VIP Bandwidth Servers',
        'Unlimited Concurrent Queue Downloads',
        'Full Channel & Playlist Archiving Engine',
        'Direct 24/7 VIP WhatsApp & Email Support'
      ],
      ctaText: currentPlan === '1.5years' ? 'Active 1.5 Yr Plan' : 'Get 1.5 Years for ₹499',
      ctaStyle: 'chrome'
    }
  ];

  const handleSelectPlan = (plan: PlanTier) => {
    if (plan.id === currentPlan) {
      if (onNotify) onNotify('Current Plan', `You are already on the ${plan.name}.`, 'info');
      return;
    }
    if (onNavigateToCheckout) {
      onNavigateToCheckout(plan.id, billingCycle);
    } else {
      setSelectedPlan(plan);
      setIsCheckoutOpen(true);
    }
  };

  const handleCompleteCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan) return;
    const cleanEmail = customerEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      onNotify?.('Email Required', 'Please enter a valid email address to activate your subscription.', 'warning');
      return;
    }

    setIsProcessingPayment(true);
    try {
      const finalPrice = selectedPlan.isSpecialPeriod
        ? selectedPlan.fixedPrice || 499
        : billingCycle === 'yearly'
        ? selectedPlan.yearlyPrice * 12
        : selectedPlan.monthlyPrice;

      await buySubscription(
        cleanEmail,
        selectedPlan.id,
        billingCycle,
        paymentMethod,
        finalPrice
      );

      safeSetLocal('tubevault_customer_email', cleanEmail);
      safeSetLocal('tubevault_user_plan', selectedPlan.id);
      setCurrentPlan(selectedPlan.id);
      setIsCheckoutOpen(false);

      if (onNotify) {
        onNotify(
          '🎉 Premium Plan Activated!',
          `Successfully activated ${selectedPlan.name} for ${cleanEmail}! Unlocked on all your devices.`,
          'success'
        );
      }
    } catch (err: any) {
      onNotify?.('Activation Failed', err.message || 'Payment processing error.', 'error');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const faqs = [
    {
      q: 'Can I cancel or change my plan anytime?',
      a: 'Yes, absolutely. You can cancel, upgrade, or downgrade your plan at any time with a single click. There are no lock-in contracts or cancellation penalties.'
    },
    {
      q: 'How does Turbo Download speed work?',
      a: 'TubeVault Pro and VIP members route their download requests through dedicated multi-gigabit server nodes with custom multithreaded chunks, delivering up to 10x faster downloads than standard lines.'
    },
    {
      q: 'How does the 1.5 Years (18 Months) VIP pass work?',
      a: 'The 1.5 Years VIP Pass gives you 18 continuous months of unlimited 4K downloads, studio audio, and priority servers for a single one-time payment of ₹499 (approx. ₹27/month). There are no recurring auto-debit renewals or surprise charges.'
    },
    {
      q: 'Which payment methods do you accept?',
      a: 'We accept all major Credit/Debit cards (Visa, Mastercard, American Express), PayPal, UPI / Google Pay, Apple Pay, and select Cryptocurrencies (BTC, ETH, USDT).'
    },
    {
      q: 'Is there a money-back guarantee?',
      a: 'Yes! We offer an unconditional 30-day money-back guarantee. If you are not 100% satisfied with your download speeds or quality, contact us for an instant full refund.'
    }
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-16 py-4 animate-fade-in">
      {/* Header & Tagline */}
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-600/10 dark:bg-red-500/15 border border-red-500/30 text-red-600 dark:text-red-400 text-xs font-bold tracking-wide uppercase shadow-sm">
          <Crown className="w-3.5 h-3.5 text-amber-500" />
          <span>Flexible Plans & Transparent Pricing</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-900 dark:text-white font-display">
          Unlock the Full Power of <span className="gradient-text">TubeVault</span>
        </h1>

        <p className="text-slate-600 dark:text-slate-300 text-sm sm:text-base leading-relaxed">
          Upgrade to enjoy uncapped turbo speeds, 4K 60FPS video quality, 320kbps studio audio, and playlist conversions with zero waiting queues.
        </p>

        {/* Current Active Plan Badge */}
        {currentPlan !== 'free' && (
          <div className="pt-2">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              You currently have <span className="uppercase underline font-extrabold">{currentPlan}</span> status activated on this device!
            </span>
          </div>
        )}

        {/* Billing Switcher (Monthly vs Yearly) */}
        <div className="pt-6 flex justify-center items-center">
          <div className="inline-flex items-center p-1.5 rounded-2xl bg-slate-200/70 dark:bg-slate-900/80 border border-slate-300/80 dark:border-slate-800 shadow-inner">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-5 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${
                billingCycle === 'monthly'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Monthly Billing
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`relative flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${
                billingCycle === 'yearly'
                  ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-md shadow-red-600/30'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>Annual Billing</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-400 text-slate-950 shadow-sm animate-pulse">
                Save 30%
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Plan Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
        {plans.map((plan) => {
          const isCurrent = currentPlan === plan.id;
          const displayPrice = plan.isSpecialPeriod
            ? `₹${plan.fixedPrice}`
            : plan.monthlyPrice === 0
            ? '₹0'
            : billingCycle === 'yearly'
            ? `₹${plan.yearlyPrice}`
            : `₹${plan.monthlyPrice}`;

          return (
            <div
              key={plan.id}
              className={`relative rounded-3xl p-7 flex flex-col justify-between transition-all duration-300 ${
                plan.isPopular
                  ? 'bg-gradient-to-b from-white via-white to-red-50/50 dark:from-[#0d121c] dark:via-[#0c1017] dark:to-[#170a0d] border-2 border-red-500 shadow-2xl shadow-red-600/20 md:-translate-y-2'
                  : 'bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200 dark:border-slate-800 shadow-lg hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              {/* Popular / Best Value Badge */}
              {plan.badge && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1.5 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-md shadow-red-600/40">
                    <Sparkles className="w-3 h-3 text-amber-300" />
                    {plan.badge}
                  </span>
                </div>
              )}

              <div>
                {/* Plan Header */}
                <div className="mb-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-black text-slate-900 dark:text-white font-display">
                      {plan.name}
                    </h3>
                    {plan.isPopular && <Flame className="w-5 h-5 text-red-500" />}
                    {plan.isSpecialPeriod && <Crown className="w-5 h-5 text-amber-500" />}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 min-h-[36px]">
                    {plan.description}
                  </p>
                </div>

                {/* Pricing Display */}
                <div className="py-4 my-2 border-y border-slate-100 dark:border-slate-800/80">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-4xl sm:text-5xl font-black tracking-tight text-slate-900 dark:text-white">
                      {displayPrice}
                    </span>
                    {!plan.isSpecialPeriod && plan.monthlyPrice > 0 && (
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                        / month
                      </span>
                    )}
                    {plan.isSpecialPeriod && (
                      <span className="text-xs font-semibold text-amber-500">
                        for 1.5 Years (18 Months)
                      </span>
                    )}
                  </div>
                  {plan.isSpecialPeriod && (
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold mt-1">
                      Only ~₹27/month • One-time payment for 18 months
                    </p>
                  )}
                  {!plan.isSpecialPeriod && plan.monthlyPrice > 0 && billingCycle === 'yearly' && (
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold mt-1">
                      Billed annually (₹{(plan.yearlyPrice * 12).toLocaleString('en-IN')}/yr) • Cancel anytime
                    </p>
                  )}
                  {plan.id === 'free' && (
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium mt-1">
                      Free forever • No credit card needed
                    </p>
                  )}
                </div>

                {/* Features List */}
                <div className="space-y-3 pt-4 mb-6">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    What's included:
                  </span>
                  <ul className="space-y-2.5">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-300">
                        <div className="w-4 h-4 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                        <span className="leading-snug">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-4">
                <button
                  onClick={() => handleSelectPlan(plan)}
                  disabled={isCurrent}
                  className={`w-full py-3.5 px-4 rounded-2xl text-xs font-extrabold uppercase tracking-wider flex items-center justify-center gap-2 transition-all duration-200 ${
                    isCurrent
                      ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-default'
                      : plan.ctaStyle === 'gradient'
                      ? 'bg-gradient-to-r from-red-600 via-rose-600 to-red-600 hover:from-red-500 hover:to-rose-500 text-white shadow-lg shadow-red-600/30 hover:scale-[1.02] active:scale-[0.98]'
                      : plan.ctaStyle === 'chrome'
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-950 hover:bg-slate-800 dark:hover:bg-slate-100 shadow-md hover:scale-[1.02] active:scale-[0.98]'
                      : 'border-2 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-red-500 hover:text-red-500 dark:hover:border-red-400 dark:hover:text-red-400'
                  }`}
                >
                  {isCurrent ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{plan.ctaText}</span>
                    </>
                  ) : (
                    <>
                      <span>{plan.ctaText}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Feature Comparison Matrix */}
      <div className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 shadow-xl">
        <div className="text-center max-w-xl mx-auto mb-8">
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-display">
            Detailed Tier Comparison
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Compare every technical feature and capability side-by-side.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800">
                <th className="py-3 px-4 font-bold text-slate-500 uppercase tracking-wider">Features</th>
                <th className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-center">Starter (₹99)</th>
                <th className="py-3 px-4 font-bold text-red-600 dark:text-red-400 uppercase tracking-wider text-center bg-red-50/50 dark:bg-red-950/20 rounded-t-xl">Pro Pass</th>
                <th className="py-3 px-4 font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider text-center">1.5 Years VIP (₹499)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
              <tr>
                <td className="py-3.5 px-4 font-semibold">Maximum Video Quality</td>
                <td className="py-3.5 px-4 text-center">1080p Full HD</td>
                <td className="py-3.5 px-4 text-center font-bold text-red-600 dark:text-red-400 bg-red-50/30 dark:bg-red-950/10">4K 60FPS & HDR</td>
                <td className="py-3.5 px-4 text-center font-bold text-amber-600 dark:text-amber-400">8K Ultra HD</td>
              </tr>
              <tr>
                <td className="py-3.5 px-4 font-semibold">Audio Extraction Bitrate</td>
                <td className="py-3.5 px-4 text-center">128 kbps</td>
                <td className="py-3.5 px-4 text-center font-bold text-red-600 dark:text-red-400 bg-red-50/30 dark:bg-red-950/10">320 kbps Studio MP3</td>
                <td className="py-3.5 px-4 text-center font-bold text-amber-600 dark:text-amber-400">320 kbps + Lossless FLAC</td>
              </tr>
              <tr>
                <td className="py-3.5 px-4 font-semibold">Download Transfer Speed</td>
                <td className="py-3.5 px-4 text-center text-slate-400">Standard (5 MB/s)</td>
                <td className="py-3.5 px-4 text-center font-bold text-red-600 dark:text-red-400 bg-red-50/30 dark:bg-red-950/10">⚡ 100+ MB/s Turbo</td>
                <td className="py-3.5 px-4 text-center font-bold text-amber-600 dark:text-amber-400">⚡ Uncapped Dedicated Node</td>
              </tr>
              <tr>
                <td className="py-3.5 px-4 font-semibold">Batch & Playlist Downloads</td>
                <td className="py-3.5 px-4 text-center text-slate-400">—</td>
                <td className="py-3.5 px-4 text-center font-bold text-red-600 dark:text-red-400 bg-red-50/30 dark:bg-red-950/10">Up to 25 at once</td>
                <td className="py-3.5 px-4 text-center font-bold text-amber-600 dark:text-amber-400">Unlimited Batching</td>
              </tr>
              <tr>
                <td className="py-3.5 px-4 font-semibold">Simultaneous Downloads</td>
                <td className="py-3.5 px-4 text-center">1 file at a time</td>
                <td className="py-3.5 px-4 text-center font-bold text-red-600 dark:text-red-400 bg-red-50/30 dark:bg-red-950/10">5 concurrent</td>
                <td className="py-3.5 px-4 text-center font-bold text-amber-600 dark:text-amber-400">Unlimited concurrent</td>
              </tr>
              <tr>
                <td className="py-3.5 px-4 font-semibold">Ad-Free Experience</td>
                <td className="py-3.5 px-4 text-center">Basic</td>
                <td className="py-3.5 px-4 text-center font-bold text-emerald-600 dark:text-emerald-400 bg-red-50/30 dark:bg-red-950/10">100% Ad-Free</td>
                <td className="py-3.5 px-4 text-center font-bold text-emerald-600 dark:text-emerald-400">100% Ad-Free</td>
              </tr>
              <tr>
                <td className="py-3.5 px-4 font-semibold">Support Level</td>
                <td className="py-3.5 px-4 text-center text-slate-400">Community Docs</td>
                <td className="py-3.5 px-4 text-center bg-red-50/30 dark:bg-red-950/10">Priority 24/7 Email</td>
                <td className="py-3.5 px-4 text-center font-bold text-amber-600 dark:text-amber-400">Direct VIP Discord & Phone</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Trust & Guarantee Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="flex items-center gap-4 p-5 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">30-Day Money Back</h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">100% refund guarantee if not completely satisfied.</p>
          </div>
        </div>

        <div className="flex items-center gap-4 p-5 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">256-Bit SSL Encryption</h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Bank-grade end-to-end encrypted checkout.</p>
          </div>
        </div>

        <div className="flex items-center gap-4 p-5 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800">
          <div className="w-12 h-12 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center shrink-0">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Instant Activation</h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">All Pro benefits unlock immediately on checkout.</p>
          </div>
        </div>
      </div>

      {/* Frequently Asked Questions */}
      <div className="space-y-6">
        <div className="text-center max-w-xl mx-auto">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-red-600 dark:text-red-400">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Got Questions?</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white mt-1 font-display">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="max-w-3xl mx-auto space-y-3">
          {faqs.map((faq, index) => {
            const isOpen = openFaqIndex === index;
            return (
              <div
                key={index}
                className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 overflow-hidden transition-colors"
              >
                <button
                  onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                  className="w-full px-6 py-4 text-left flex items-center justify-between text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                >
                  <span>{faq.q}</span>
                  {isOpen ? <ChevronUp className="w-4 h-4 shrink-0 text-red-500" /> : <ChevronDown className="w-4 h-4 shrink-0 text-slate-400" />}
                </button>
                {isOpen && (
                  <div className="px-6 pb-4 text-xs text-slate-600 dark:text-slate-400 leading-relaxed border-t border-slate-100 dark:border-slate-800/60 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Interactive Checkout Modal */}
      {isCheckoutOpen && selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-[#0c1017] border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-2xl space-y-6">
            <button
              onClick={() => setIsCheckoutOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header */}
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-600/10 text-red-600 dark:text-red-400 border border-red-500/20 mb-2">
                <Crown className="w-3.5 h-3.5 text-amber-500" />
                <span>Instant Checkout</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-display">
                Upgrade to {selectedPlan.name}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Selected: {selectedPlan.isSpecialPeriod ? '1.5 Years VIP Pass (18 Months for ₹499)' : billingCycle === 'yearly' ? 'Annual Plan (30% Off)' : 'Monthly Plan'}
              </p>
            </div>

            {/* Order Summary Box */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-white">{selectedPlan.name}</span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {selectedPlan.isSpecialPeriod ? '18 Months unlimited VIP access' : 'All features unlocked instantly'}
                </p>
              </div>
              <div className="text-right">
                <span className="text-xl font-black text-red-600 dark:text-red-400">
                  {selectedPlan.isSpecialPeriod
                    ? `₹${selectedPlan.fixedPrice}`
                    : billingCycle === 'yearly'
                    ? `₹${(selectedPlan.yearlyPrice * 12).toLocaleString('en-IN')}/yr`
                    : `₹${selectedPlan.monthlyPrice}/mo`}
                </span>
                <p className="text-[10px] text-slate-400">
                  {selectedPlan.isSpecialPeriod ? '18 Months access • GST included' : 'GST included'}
                </p>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Choose Payment Method:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'upi', label: 'UPI / GPay / Paytm', icon: Zap },
                  { id: 'card', label: 'Cards (RuPay/Visa)', icon: CreditCard },
                  { id: 'paypal', label: 'NetBanking', icon: FileCheck },
                  { id: 'crypto', label: 'Crypto', icon: Lock },
                ].map((method) => {
                  const Icon = method.icon;
                  return (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() => setPaymentMethod(method.id as any)}
                      className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 text-xs font-bold transition-all ${
                        paymentMethod === method.id
                          ? 'border-red-600 bg-red-600/10 text-red-600 dark:text-red-400 shadow-sm'
                          : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{method.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Simulated Checkout Form */}
            <form onSubmit={handleCompleteCheckout} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Customer Email Address (Required for Instant Activation)
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-red-500 focus:outline-none"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Your premium pass will be tied to this email. You can restore it anytime on your phone or laptop.
                </p>
              </div>

              {paymentMethod === 'card' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                      Card Number
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="•••• •••• •••• 4242"
                      defaultValue="4242 •••• •••• 4242"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-red-500 focus:outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="MM/YY"
                      defaultValue="12/28"
                      className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-red-500 focus:outline-none"
                    />
                    <input
                      type="text"
                      placeholder="CVC"
                      defaultValue="888"
                      className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-red-500 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {paymentMethod === 'upi' && (
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Virtual Payment Address (UPI ID)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="user@okhdfcbank or phone@upi"
                    defaultValue="tubevault@upi"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-red-500 focus:outline-none"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={isProcessingPayment}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-red-600 via-rose-600 to-red-600 hover:from-red-500 hover:to-rose-500 text-white font-extrabold uppercase tracking-wider text-xs shadow-lg shadow-red-600/30 flex items-center justify-center gap-2 transition-all"
              >
                {isProcessingPayment ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Processing Secure Upgrade...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>Confirm & Activate {selectedPlan.name}</span>
                  </>
                )}
              </button>

              <p className="text-[10px] text-center text-slate-400">
                🔒 256-bit encrypted test checkout • 30-day money-back guarantee
              </p>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
