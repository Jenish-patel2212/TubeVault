import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { ErrorBoundary } from './components/ErrorBoundary'
import { initSecurityGuard } from './utils/securityGuard'
import './index.css'

// Initialize Anti-Theft & Inspection Shield
initSecurityGuard();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);

// Register High-Speed Cache Service Worker
if (typeof window !== 'undefined' && 'serviceWorker' in navigator && window.location.protocol === 'https:') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.debug('ServiceWorker registration skipped:', err);
    });
  });
}

// Prevent pinch-to-zoom and multi-touch gestures on mobile browsers
if (typeof document !== 'undefined') {
  document.addEventListener('gesturestart', (e: Event) => {
    e.preventDefault();
  });
}

