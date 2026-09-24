import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { ToastNotification, ToastMessage } from './components/ToastNotification';
import { HomePage } from './pages/HomePage';
import { InstagramPage } from './pages/InstagramPage';
import { HistoryPage } from './pages/HistoryPage';
import { AboutPage } from './pages/AboutPage';
import { PrivacyPage } from './pages/PrivacyPage';
import { TermsPage } from './pages/TermsPage';
import { PricingPage } from './pages/PricingPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { AccountModal } from './components/AccountModal';
import { AccessGatePage } from './pages/AccessGatePage';
import { OwnerAccessModal } from './components/OwnerAccessModal';
import { safeGetLocal, safeSetLocal, getStoredMasterPin, isDeviceApprovedLocally } from './utils/storage';

export const App: React.FC = () => {
  const [isAuthorized, setIsAuthorized] = useState<boolean>(() => {
    return Boolean(getStoredMasterPin()) || isDeviceApprovedLocally();
  });
  const [isOwnerModalOpen, setIsOwnerModalOpen] = useState(false);

  const [activeTab, setActiveTab] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const search = window.location.search.toLowerCase();
      const path = window.location.pathname.toLowerCase();
      if (search.includes('admin') || path.startsWith('/admin')) {
        return 'admin';
      }
      if (search.includes('checkout') || path.startsWith('/checkout')) {
        return 'checkout';
      }
    }
    return 'home';
  });
  const [checkoutPlanId, setCheckoutPlanId] = useState<string>('pro');
  const [checkoutBillingCycle, setCheckoutBillingCycle] = useState<'monthly' | 'yearly'>('yearly');
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [initialUrlForHome, setInitialUrlForHome] = useState<string | undefined>(undefined);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (title: string, message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, title, message, type }]);
    setTimeout(() => {
      removeToast(id);
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const clearAllToasts = () => {
    setToasts([]);
  };

  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = safeGetLocal('tubevault_theme');
    if (saved) return saved === 'dark';
    return typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)').matches : true;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      safeSetLocal('tubevault_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      safeSetLocal('tubevault_theme', 'light');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    setIsDarkMode((prev) => !prev);
  };

  // Secret admin access: Ctrl + Shift + A
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        setActiveTab((prev) => (prev === 'admin' ? 'home' : 'admin'));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleReAnalyzeFromHistory = (url: string) => {
    setInitialUrlForHome(url);
    setActiveTab('home');
    addToast('Media Loaded', 'Analyzing selected link from history...', 'info');
  };

  const handleNavigateToCheckout = (planId: string, cycle: 'monthly' | 'yearly') => {
    setCheckoutPlanId(planId);
    setCheckoutBillingCycle(cycle);
    setActiveTab('checkout');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-[#07090e]">
        <AccessGatePage
          onUnlock={() => setIsAuthorized(true)}
          onNotify={addToast}
        />
        <ToastNotification toasts={toasts} onDismiss={removeToast} onClearAll={clearAllToasts} />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc] dark:bg-[#0b0d13] text-slate-900 dark:text-slate-100 selection:bg-red-600 selection:text-white transition-colors duration-200">

      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isDarkMode={isDarkMode}
        toggleDarkMode={toggleDarkMode}
        onOpenAccountModal={() => setIsAccountModalOpen(true)}
        onOpenOwnerModal={() => setIsOwnerModalOpen(true)}
      />

      <main className="flex-1 max-w-4xl lg:max-w-5xl w-full mx-auto px-3 sm:px-6 pt-4 pb-24 md:py-8 relative z-10">
        {activeTab === 'home' && (
          <HomePage
            initialUrl={initialUrlForHome}
            onNotify={addToast}
            onNavigateToPricing={() => setActiveTab('pricing')}
          />
        )}
        {activeTab === 'instagram' && (
          <InstagramPage 
            onNotify={addToast} 
            onNavigateToPricing={() => setActiveTab('pricing')} 
          />
        )}
        {activeTab === 'pricing' && (
          <PricingPage
            onNotify={addToast}
            onNavigateToCheckout={handleNavigateToCheckout}
          />
        )}
        {activeTab === 'checkout' && (
          <CheckoutPage
            initialPlanId={checkoutPlanId}
            initialBillingCycle={checkoutBillingCycle}
            onBackToPricing={() => setActiveTab('pricing')}
            onNavigateToDownloader={() => setActiveTab('home')}
            onNotify={addToast}
          />
        )}
        {activeTab === 'history' && <HistoryPage onReAnalyze={handleReAnalyzeFromHistory} onNotify={addToast} />}
        {activeTab === 'admin' && (
          <AdminDashboardPage
            onBackToCustomerSite={() => setActiveTab('home')}
            onNotify={addToast}
          />
        )}
        {activeTab === 'about' && <AboutPage />}
        {activeTab === 'privacy' && <PrivacyPage />}
        {activeTab === 'terms' && <TermsPage />}
        {!['home', 'instagram', 'pricing', 'checkout', 'history', 'admin', 'about', 'privacy', 'terms'].includes(activeTab) && (
          <HomePage
            initialUrl={initialUrlForHome}
            onNotify={addToast}
            onNavigateToPricing={() => setActiveTab('pricing')}
          />
        )}
      </main>

      <Footer setActiveTab={setActiveTab} />
      <AccountModal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
        onNavigateToPricing={() => setActiveTab('pricing')}
        onNotify={addToast}
      />
      <OwnerAccessModal
        isOpen={isOwnerModalOpen}
        onClose={() => setIsOwnerModalOpen(false)}
        onNotify={addToast}
      />
      <ToastNotification toasts={toasts} onDismiss={removeToast} onClearAll={clearAllToasts} />
    </div>
  );
};

export default App;
