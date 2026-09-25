import axios from 'axios';
import { MediaMetadata, DownloadJobStatus, MediaType, SearchResultItem, SearchResponse, PaymentConfig, InvoiceData } from '../types/api';

export const getApiBaseUrl = (): string => {
  if (typeof window !== 'undefined') {
    // 1. User-saved custom URL in localStorage
    const saved = localStorage.getItem('tubevault_backend_url');
    if (saved && saved.trim()) {
      const clean = saved.trim().replace(/\/+$/, '');
      return clean.endsWith('/api') ? clean : `${clean}/api`;
    }
    // 2. Global window config from /config.js (ideal for Netlify static deployments)
    const runtimeConfig = (window as any).TUBEVAULT_BACKEND_URL;
    if (runtimeConfig && typeof runtimeConfig === 'string' && runtimeConfig.trim()) {
      const clean = runtimeConfig.trim().replace(/\/+$/, '');
      return clean.endsWith('/api') ? clean : `${clean}/api`;
    }
    const envUrl = import.meta.env.VITE_API_BASE_URL;
    if (envUrl && typeof envUrl === 'string' && envUrl.trim()) {
      let clean = envUrl.trim().replace(/\/+$/, '');
      if (!clean.startsWith('http://') && !clean.startsWith('https://') && !clean.startsWith('/')) {
        clean = `https://${clean}`;
      }
      return clean.endsWith('/api') ? clean : `${clean}/api`;
    }
  }
  return '/api';
};

export const setCustomApiBaseUrl = (url: string) => {
  if (typeof window !== 'undefined') {
    if (!url || !url.trim()) {
      localStorage.removeItem('tubevault_backend_url');
    } else {
      const clean = url.trim().replace(/\/+$/, '');
      localStorage.setItem('tubevault_backend_url', clean);
    }
  }
};

export const testBackendHealth = async (customUrl?: string): Promise<{ ok: boolean; message: string }> => {
  const targetBase = customUrl 
    ? (customUrl.trim().replace(/\/+$/, '') + (customUrl.trim().endsWith('/api') ? '' : '/api'))
    : getApiBaseUrl();
  try {
    const res = await axios.get(`${targetBase}/health`, { timeout: 20000 });
    if (res.status === 200 && res.data?.status === 'ok') {
      return { ok: true, message: 'Backend connected successfully! (Status: OK)' };
    }
    return { ok: true, message: 'Server reached, status code: ' + res.status };
  } catch (err: any) {
    return { ok: false, message: err?.message || 'Failed to reach server' };
  }
};

const client = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 45000, // 45 seconds for metadata analysis
});

client.interceptors.request.use((config: any) => {
  config.baseURL = getApiBaseUrl();
  return config;
});

export const extractErrorMessage = (error: any, fallback: string): string => {
  if (error?.code === 'ECONNABORTED') {
    return 'Server request timed out. Please try again.';
  }
  if (!error?.response && error?.request) {
    if (typeof window !== 'undefined' && (window.location.hostname.includes('netlify.app') || window.location.hostname.includes('vercel.app'))) {
      return 'Backend server offline hai ya connect nahi hai. Kripya upar "Server" button par click karke backend URL connect karein.';
    }
    return 'Server offline hai ya laptop band hai. Server se connect nahi ho pa raha hai.';
  }
  if (error?.response?.status === 404) {
    return 'Backend Server connect nahi hai (404 Error). Upar "Server" button par click karke backend URL connect karein.';
  }
  const detail = error?.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail) && detail.length > 0) {
    return detail.map((d: any) => d?.msg || String(d)).join(', ');
  }
  if (error?.response?.data?.message) {
    return String(error.response.data.message);
  }
  if (error?.message && !error.message.includes('object')) {
    return error.message;
  }
  return fallback;
};

export const searchYouTube = async (query: string): Promise<SearchResultItem[]> => {
  try {
    const response = await client.post<SearchResponse>('/search', { query, limit: 12 });
    return response?.data?.results || [];
  } catch (error: any) {
    throw new Error(extractErrorMessage(error, 'Failed to search YouTube. Server may be offline.'));
  }
};

export const analyzeUrl = async (url: string): Promise<MediaMetadata> => {
  try {
    const response = await client.post<MediaMetadata>('/analyze', { url });
    if (!response?.data) {
      throw new Error('No response data received from server.');
    }
    return {
      ...response.data,
      title: response.data.title || 'Untitled Video',
      video_formats: response.data.video_formats || [],
      audio_formats: response.data.audio_formats || [],
    };
  } catch (error: any) {
    throw new Error(extractErrorMessage(error, 'Unable to connect to TubeVault API. Server may be offline.'));
  }
};

export const analyzeInstagramUrl = async (url: string): Promise<MediaMetadata> => {
  try {
    const response = await client.post<MediaMetadata>('/instagram/analyze', { url });
    if (!response?.data) {
      throw new Error('No response data received from server.');
    }
    return {
      ...response.data,
      title: response.data.title || 'Instagram Media',
      video_formats: response.data.video_formats || [],
      audio_formats: response.data.audio_formats || [],
    };
  } catch (error: any) {
    throw new Error(extractErrorMessage(error, 'Unable to analyze Instagram media. Verify server is running and link is public.'));
  }
};

export const startDownload = async (url: string, formatId: string, mediaType: MediaType): Promise<string> => {
  try {
    const response = await client.post<{ job_id: string; message: string }>('/download', {
      url,
      format_id: formatId,
      media_type: mediaType,
    });
    return response.data.job_id;
  } catch (error: any) {
    if (error.response?.data?.detail) {
      throw new Error(error.response.data.detail);
    }
    throw new Error('Failed to start download job.');
  }
};

export const getJobStatus = async (jobId: string): Promise<DownloadJobStatus> => {
  try {
    const response = await client.get<DownloadJobStatus>(`/download/${jobId}`);
    return response.data;
  } catch (error: any) {
    if (error.response?.data?.detail) {
      throw new Error(error.response.data.detail);
    }
    throw new Error('Failed to retrieve download progress.');
  }
};

export const cancelJob = async (jobId: string): Promise<void> => {
  try {
    await client.delete(`/download/${jobId}`);
  } catch (error) {
    console.warn('Job cancellation warning:', error);
  }
};

export const getFileDownloadUrl = (jobId: string): string => {
  return `${getApiBaseUrl()}/download/${jobId}/file`;
};

// --- Customer Subscription APIs ---

export const buySubscription = async (
  email: string,
  planId: string,
  billingCycle: 'monthly' | 'yearly',
  paymentMethod: string,
  amount: number
) => {
  try {
    const response = await client.post('/subscription/buy', {
      email,
      plan_id: planId,
      billing_cycle: billingCycle,
      payment_method: paymentMethod,
      amount
    });
    return response.data;
  } catch (error: any) {
    if (error.response?.data?.detail) {
      throw new Error(error.response.data.detail);
    }
    throw new Error('Failed to activate subscription. Please try again.');
  }
};

export const getSubscriptionStatus = async (email: string) => {
  try {
    const response = await client.get(`/subscription/status?email=${encodeURIComponent(email)}`);
    return response.data;
  } catch (error: any) {
    if (error.response?.data?.detail) {
      throw new Error(error.response.data.detail);
    }
    throw new Error('Unable to check subscription status.');
  }
};

export const verifyCustomerEmail = async (email: string) => {
  try {
    const response = await client.post('/subscription/verify-email', { email });
    return response.data;
  } catch (error: any) {
    if (error.response?.data?.detail) {
      throw new Error(error.response.data.detail);
    }
    throw new Error('Invalid email or server error.');
  }
};

// --- Admin APIs ---

export const adminAuth = async (passcode: string) => {
  try {
    const response = await client.post('/admin/auth', { passcode });
    return response.data;
  } catch (error: any) {
    if (error.response?.data?.detail) {
      throw new Error(error.response.data.detail);
    }
    throw new Error('Admin passcode incorrect.');
  }
};

export const adminGetMetrics = async (token: string) => {
  try {
    const response = await client.get('/admin/metrics', {
      headers: { 'x-admin-token': token }
    });
    return response.data;
  } catch (error: any) {
    if (error.response?.data?.detail) {
      throw new Error(error.response.data.detail);
    }
    throw new Error('Failed to load admin metrics.');
  }
};

export const adminGetSubscribers = async (
  token: string,
  query: string = '',
  status: string = 'all',
  limit: number = 100,
  offset: number = 0
) => {
  try {
    const response = await client.get('/admin/subscribers', {
      headers: { 'x-admin-token': token },
      params: { query, status, limit, offset }
    });
    return response.data;
  } catch (error: any) {
    if (error.response?.data?.detail) {
      throw new Error(error.response.data.detail);
    }
    throw new Error('Failed to load subscribers.');
  }
};

export const adminActivateByEmail = async (
  token: string,
  email: string,
  planId: string,
  durationDays: number = 30,
  notes: string = ''
) => {
  try {
    const response = await client.post(
      '/admin/activate-by-email',
      {
        email,
        plan_id: planId,
        duration_days: durationDays,
        notes
      },
      {
        headers: { 'x-admin-token': token }
      }
    );
    return response.data;
  } catch (error: any) {
    if (error.response?.data?.detail) {
      throw new Error(error.response.data.detail);
    }
    throw new Error('Failed to activate plan for customer.');
  }
};

export const adminRevoke = async (token: string, email: string, reason: string = '') => {
  try {
    const response = await client.post(
      '/admin/revoke',
      { email, reason },
      { headers: { 'x-admin-token': token } }
    );
    return response.data;
  } catch (error: any) {
    if (error.response?.data?.detail) {
      throw new Error(error.response.data.detail);
    }
    throw new Error('Failed to revoke subscription.');
  }
};

export const adminExtend = async (token: string, email: string, extraDays: number = 30) => {
  try {
    const response = await client.post(
      '/admin/extend',
      { email, extra_days: extraDays },
      { headers: { 'x-admin-token': token } }
    );
    return response.data;
  } catch (error: any) {
    if (error.response?.data?.detail) {
      throw new Error(error.response.data.detail);
    }
    throw new Error('Failed to extend subscription.');
  }
};

// --- Payment System & UPI Checkout APIs ---

export const getPaymentConfig = async (): Promise<PaymentConfig> => {
  try {
    const response = await client.get<{ success: boolean; config: PaymentConfig }>('/payments/config');
    return response.data.config;
  } catch (error: any) {
    console.warn('Failed to load payment config, fallback default');
    return {
      upi_id: 'famapp@idbi',
      business_name: 'TubeVault Media',
      has_custom_qr: false,
      qr_image_url: ''
    };
  }
};

export const validateCoupon = async (code: string, orderAmount: number) => {
  try {
    const response = await client.post('/payments/coupon/validate', {
      code,
      order_amount: orderAmount
    });
    return response.data;
  } catch (error: any) {
    if (error.response?.data?.detail) {
      throw new Error(error.response.data.detail);
    }
    throw new Error('Failed to validate coupon.');
  }
};

export const createCheckoutOrder = async (payload: {
  customer_name: string;
  customer_email: string;
  customer_mobile: string;
  plan_id: string;
  billing_cycle?: string;
  coupon_code?: string;
}) => {
  try {
    const response = await client.post('/payments/order/create', payload);
    return response.data.data;
  } catch (error: any) {
    if (error.response?.data?.detail) {
      throw new Error(error.response.data.detail);
    }
    throw new Error('Failed to create checkout order.');
  }
};

export const submitManualUTR = async (payload: {
  order_id: string;
  utr: string;
  payment_date?: string;
  amount?: number;
  customer_name?: string;
  customer_email?: string;
  customer_mobile?: string;
}) => {
  try {
    const response = await client.post('/payments/manual/submit-utr', payload);
    return response.data;
  } catch (error: any) {
    if (error.response?.data?.detail) {
      throw new Error(error.response.data.detail);
    }
    throw new Error('Failed to submit UTR for verification.');
  }
};

export const getOrderDetails = async (orderId: string) => {
  try {
    const response = await client.get(`/payments/order/${orderId}`);
    return response.data;
  } catch (error: any) {
    if (error.response?.data?.detail) {
      throw new Error(error.response.data.detail);
    }
    throw new Error('Order not found.');
  }
};

export const getCustomerPaymentHistory = async (email: string) => {
  try {
    const response = await client.get(`/payments/customer/history?email=${encodeURIComponent(email)}`);
    return response.data.data;
  } catch (error: any) {
    if (error.response?.data?.detail) {
      throw new Error(error.response.data.detail);
    }
    throw new Error('Failed to retrieve customer payment history.');
  }
};

export const getInvoiceData = async (orderId: string): Promise<InvoiceData> => {
  try {
    const response = await client.get(`/payments/invoice/${orderId}`);
    return response.data.invoice;
  } catch (error: any) {
    if (error.response?.data?.detail) {
      throw new Error(error.response.data.detail);
    }
    throw new Error('Failed to fetch invoice.');
  }
};

export const getInvoiceHtmlUrl = (orderId: string): string => {
  return `${getApiBaseUrl()}/payments/invoice/${orderId}/html`;
};

// --- Admin Payment APIs ---

export const adminGetOrders = async (
  token: string,
  status: string = 'all',
  search: string = '',
  limit: number = 50,
  offset: number = 0
) => {
  try {
    const response = await client.get('/payments/admin/orders', {
      headers: { 'x-admin-token': token },
      params: { status, search, limit, offset }
    });
    return response.data;
  } catch (error: any) {
    if (error.response?.data?.detail) {
      throw new Error(error.response.data.detail);
    }
    throw new Error('Failed to load orders.');
  }
};

export const adminVerifyPayment = async (
  token: string,
  paymentId: string,
  action: 'approve' | 'reject',
  notes: string = ''
) => {
  try {
    const response = await client.post(
      '/payments/admin/verify',
      { payment_id: paymentId, action, notes },
      { headers: { 'x-admin-token': token } }
    );
    return response.data;
  } catch (error: any) {
    if (error.response?.data?.detail) {
      throw new Error(error.response.data.detail);
    }
    throw new Error('Payment verification action failed.');
  }
};

export const adminRefundPayment = async (token: string, paymentId: string, reason: string = '') => {
  try {
    const response = await client.post(
      '/payments/admin/refund',
      { payment_id: paymentId, reason },
      { headers: { 'x-admin-token': token } }
    );
    return response.data;
  } catch (error: any) {
    if (error.response?.data?.detail) {
      throw new Error(error.response.data.detail);
    }
    throw new Error('Refund failed.');
  }
};

export const adminGetPaymentConfig = async (token: string) => {
  try {
    const response = await client.get('/payments/admin/config', {
      headers: { 'x-admin-token': token }
    });
    return response.data;
  } catch (error: any) {
    if (error.response?.data?.detail) {
      throw new Error(error.response.data.detail);
    }
    throw new Error('Failed to load admin payment settings.');
  }
};

export const adminUpdatePaymentConfig = async (
  token: string,
  upiId: string,
  businessName: string,
  merchantCategory?: string
) => {
  try {
    const response = await client.post(
      '/payments/admin/config',
      { upi_id: upiId, business_name: businessName, merchant_category: merchantCategory },
      { headers: { 'x-admin-token': token } }
    );
    return response.data;
  } catch (error: any) {
    if (error.response?.data?.detail) {
      throw new Error(error.response.data.detail);
    }
    throw new Error('Failed to update UPI settings.');
  }
};

export const adminUploadQRCode = async (token: string, file: File) => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    const response = await client.post('/payments/admin/upload-qr', formData, {
      headers: {
        'x-admin-token': token,
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  } catch (error: any) {
    if (error.response?.data?.detail) {
      throw new Error(error.response.data.detail);
    }
    throw new Error('Failed to upload QR code.');
  }
};

// --- Razorpay Payment Gateway APIs ---

export const getRazorpayConfig = async () => {
  try {
    const response = await client.get('/payments/razorpay/config');
    return response.data.config;
  } catch (e) {
    return { enabled: true, has_real_keys: false, key_id: 'rzp_test_simulated', gateway_name: 'Razorpay' };
  }
};

export const createRazorpayOrder = async (orderId: string) => {
  try {
    const response = await client.post('/payments/razorpay/create-order', { order_id: orderId });
    return response.data;
  } catch (error: any) {
    if (error.response?.data?.detail) {
      throw new Error(error.response.data.detail);
    }
    throw new Error('Failed to create Razorpay payment order.');
  }
};

export const verifyRazorpayPayment = async (payload: {
  order_id: string;
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}) => {
  try {
    const response = await client.post('/payments/razorpay/verify', payload);
    return response.data;
  } catch (error: any) {
    if (error.response?.data?.detail) {
      throw new Error(error.response.data.detail);
    }
    throw new Error('Razorpay payment verification failed.');
  }
};

export const adminGetRazorpayConfig = async (token: string) => {
  try {
    const response = await client.get('/payments/admin/razorpay-config', {
      headers: { 'x-admin-token': token }
    });
    return response.data.config;
  } catch (error: any) {
    if (error.response?.data?.detail) {
      throw new Error(error.response.data.detail);
    }
    throw new Error('Failed to load Razorpay admin configuration.');
  }
};

export const adminUpdateRazorpayConfig = async (
  token: string,
  payload: { key_id: string; key_secret: string; webhook_secret?: string; enabled?: boolean }
) => {
  try {
    const response = await client.post('/payments/admin/razorpay-config', payload, {
      headers: { 'x-admin-token': token }
    });
    return response.data;
  } catch (error: any) {
    if (error.response?.data?.detail) {
      throw new Error(error.response.data.detail);
    }
    throw new Error('Failed to update Razorpay configuration.');
  }
};

// --- Video Download Licensing & Certificate APIs ---

export const verifyLicenseKey = async (licenseKey: string) => {
  try {
    const response = await client.post('/license/verify', { license_key: licenseKey });
    return response.data;
  } catch (error: any) {
    if (error.response?.data?.detail) {
      throw new Error(error.response.data.detail);
    }
    throw new Error('Failed to verify license key.');
  }
};

export const generateLicenseCertificate = async (payload: {
  license_key: string;
  media_title: string;
  media_url: string;
  format_label?: string;
}) => {
  try {
    const response = await client.post('/license/certificate', payload);
    return response.data.data;
  } catch (error: any) {
    if (error.response?.data?.detail) {
      throw new Error(error.response.data.detail);
    }
    throw new Error('Failed to generate license certificate.');
  }
};

export const getCertificateDownloadUrl = (
  licenseKey: string,
  title: string,
  url: string,
  formatLabel: string = 'Video MP4'
): string => {
  const encKey = encodeURIComponent(licenseKey);
  const encTitle = encodeURIComponent(title);
  const encUrl = encodeURIComponent(url);
  const encFormat = encodeURIComponent(formatLabel);
  return `${getApiBaseUrl()}/license/certificate/file?license_key=${encKey}&title=${encTitle}&url=${encUrl}&format_label=${encFormat}`;
};

export const adminGetLicenses = async (
  token: string,
  search: string = '',
  status: string = 'all',
  limit: number = 50,
  offset: number = 0
) => {
  try {
    const response = await client.get('/license/admin/list', {
      params: { search, status, limit, offset },
      headers: { 'x-admin-token': token }
    });
    return response.data;
  } catch (error: any) {
    if (error.response?.data?.detail) {
      throw new Error(error.response.data.detail);
    }
    throw new Error('Failed to load license records.');
  }
};

export const adminCreateLicense = async (
  token: string,
  payload: {
    user_email: string;
    customer_name: string;
    plan_id: string;
    duration_days?: number;
    custom_key?: string;
    notes?: string;
  }
) => {
  try {
    const response = await client.post('/license/admin/create', payload, {
      headers: { 'x-admin-token': token }
    });
    return response.data;
  } catch (error: any) {
    if (error.response?.data?.detail) {
      throw new Error(error.response.data.detail);
    }
    throw new Error('Failed to create license.');
  }
};

export const adminRevokeLicense = async (
  token: string,
  licenseKey: string,
  reason: string = 'Revoked by admin'
) => {
  try {
    const response = await client.post('/license/admin/revoke', { license_key: licenseKey, reason }, {
      headers: { 'x-admin-token': token }
    });
    return response.data;
  } catch (error: any) {
    if (error.response?.data?.detail) {
      throw new Error(error.response.data.detail);
    }
    throw new Error('Failed to revoke license.');
  }
};

// --- Device Access & Owner Approval API ---

export interface AccessRequestItem {
  device_id: string;
  visitor_name: string;
  device_info: string;
  ip_address: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'REVOKED';
  created_at: string;
  updated_at: string;
}

export const requestDeviceAccess = async (deviceId: string, visitorName: string) => {
  try {
    const response = await client.post('/access/request', {
      device_id: deviceId,
      visitor_name: visitorName,
      device_info: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    });
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.detail || 'Failed to submit access request.');
  }
};

export const checkDeviceAccessStatus = async (deviceId: string) => {
  try {
    const response = await client.get(`/access/status/${encodeURIComponent(deviceId)}`);
    return response.data?.data;
  } catch (error: any) {
    return { device_id: deviceId, status: 'UNKNOWN' };
  }
};

export const verifyMasterPin = async (pin: string) => {
  const clean = pin.trim();
  try {
    const response = await client.post('/access/verify-master', { pin: clean });
    return response.data;
  } catch (error: any) {
    // If backend is offline, returned 404, or network error (common when frontend is on Netlify without backend)
    const isNetworkOrUnreachable = !error.response || error.response?.status === 404 || error.response?.status === 502;
    if (isNetworkOrUnreachable) {
      if (clean === '2022') {
        return { success: true, message: 'Owner authorized (Offline Fallback)' };
      }
      throw new Error('Backend server connect nahi hai (Server Offline). Netlify par Python backend nahi chalta. Upar "Connect Server" button se apna backend connect karein.');
    }
    throw new Error(error.response?.data?.detail || 'Incorrect Master PIN');
  }
};

export const getAccessRequests = async (masterPin: string): Promise<any[]> => {
  try {
    const response = await client.get('/access/admin/list', {
      headers: { 'x-master-pin': masterPin },
    });
    return response.data?.requests || [];
  } catch (error: any) {
    throw new Error(error.response?.data?.detail || 'Failed to fetch access requests.');
  }
};

export const approveDeviceRequest = async (deviceId: string, masterPin: string) => {
  try {
    const response = await client.post('/access/admin/approve', { device_id: deviceId, pin: masterPin });
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.detail || 'Failed to approve device.');
  }
};

export const rejectDeviceRequest = async (deviceId: string, masterPin: string) => {
  try {
    const response = await client.post('/access/admin/reject', { device_id: deviceId, pin: masterPin });
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.detail || 'Failed to reject device.');
  }
};

export const revokeDeviceRequest = async (deviceId: string, masterPin: string) => {
  try {
    const response = await client.post('/access/admin/revoke', { device_id: deviceId, pin: masterPin });
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.detail || 'Failed to revoke device.');
  }
};

export const changeMasterPin = async (currentPin: string, newPin: string) => {
  try {
    const response = await client.post('/access/admin/change-pin', { current_pin: currentPin, new_pin: newPin });
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.detail || 'Failed to change Master PIN.');
  }
};
