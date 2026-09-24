export type MediaType = 'video' | 'audio';

export interface FormatOption {
  format_id: string;
  extension: string;
  resolution?: string;
  note?: string;
  filesize_approx?: number;
  filesize_formatted?: string;
  has_video: boolean;
  has_audio: boolean;
  media_type: MediaType;
  fps?: number;
}

export interface MediaMetadata {
  title: string;
  url: string;
  thumbnail?: string;
  channel?: string;
  duration?: number;
  duration_formatted?: string;
  view_count?: number;
  video_formats: FormatOption[];
  audio_formats: FormatOption[];
  description_snippet?: string;
}

export interface SearchResultItem {
  id: string;
  title: string;
  url: string;
  thumbnail?: string;
  channel?: string;
  duration?: number;
  duration_formatted?: string;
  view_count?: number;
}

export interface SearchResponse {
  query: string;
  results: SearchResultItem[];
}

export type JobStatus = 'pending' | 'downloading' | 'completed' | 'failed' | 'cancelled';

export interface DownloadJobStatus {
  job_id: string;
  status: JobStatus;
  percent: number;
  downloaded_bytes: number;
  total_bytes: number;
  speed_bytes_per_sec: number;
  speed_formatted: string;
  eta_seconds?: number;
  filename?: string;
  file_size_formatted?: string;
  error?: string;
  created_at: string;
}

export interface HistoryItem {
  id: string;
  title: string;
  url: string;
  thumbnail?: string;
  channel?: string;
  format_label: string;
  media_type: MediaType;
  status: 'Completed' | 'Failed' | 'Cancelled';
  date: string;
  job_id?: string;
  license_key?: string;
}

export interface CustomerSubscription {
  email: string;
  is_active: boolean;
  plan_id: string;
  plan_name: string;
  status: string;
  created_at?: string;
  expires_at?: string;
  days_remaining: number;
  is_admin_grant?: boolean;
  amount_paid?: number;
  features: string[];
}

export interface AdminMetrics {
  total_subscribers: number;
  active_subscribers: number;
  total_revenue: number;
  plan_distribution: Record<string, number>;
  recent_logs: Array<{
    id: number;
    email: string;
    action: string;
    details: string;
    created_at: string;
  }>;
}

export interface SubscriberItem {
  id: number;
  email: string;
  plan_id: string;
  plan_name: string;
  status: string;
  amount_paid: number;
  payment_method: string;
  payment_ref: string;
  is_admin_grant: number;
  notes: string;
  created_at: string;
  expires_at: string;
  is_expired: boolean;
  days_remaining: number;
}

export interface PaymentConfig {
  upi_id: string;
  business_name: string;
  has_custom_qr: boolean;
  qr_image_url: string;
}

export interface OrderItem {
  id: string;
  user_email: string;
  customer_name: string;
  customer_mobile: string;
  plan_id: string;
  billing_cycle: string;
  original_amount: number;
  discount_amount: number;
  final_amount: number;
  currency: string;
  coupon_code: string;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'REFUNDED';
  created_at: string;
  updated_at: string;
}

export interface PaymentItem {
  id: string;
  order_id: string;
  payment_method: string;
  payment_gateway: string;
  gateway_order_id?: string;
  gateway_payment_id?: string;
  utr: string;
  amount: number;
  status: 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED' | 'REFUNDED';
  customer_name: string;
  customer_email: string;
  customer_mobile: string;
  payment_date: string;
  verified_by?: string;
  verified_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface AdminOrderRow {
  order_id: string;
  user_email: string;
  customer_name: string;
  customer_mobile: string;
  plan_id: string;
  billing_cycle: string;
  original_amount: number;
  discount_amount: number;
  final_amount: number;
  currency: string;
  coupon_code: string;
  order_status: string;
  order_date: string;
  payment_id?: string;
  payment_method?: string;
  payment_gateway?: string;
  utr?: string;
  payment_status?: string;
  payment_date?: string;
  verified_by?: string;
  verified_at?: string;
  notes?: string;
}

export interface PaymentMetrics {
  total_orders: number;
  pending_verifications: number;
  confirmed_payments: number;
  total_revenue: number;
  refunded_count: number;
}

export interface InvoiceData {
  business_name: string;
  invoice_number: string;
  order_id: string;
  payment_id: string;
  customer_name: string;
  customer_email: string;
  customer_mobile: string;
  plan_id: string;
  plan_name: string;
  billing_cycle: string;
  original_amount: number;
  discount_amount: number;
  taxable_amount?: number;
  tax_amount?: number;
  final_amount: number;
  currency: string;
  payment_method: string;
  utr: string;
  order_status: string;
  payment_status: string;
  date: string;
  created_at: string;
}

export interface LicenseData {
  license_key: string;
  user_email: string;
  customer_name: string;
  plan_id: string;
  order_id?: string;
  status: 'ACTIVE' | 'EXPIRED' | 'REVOKED';
  created_at: string;
  expires_at: string;
  download_count: number;
  notes?: string;
}

export interface LicenseVerificationResponse {
  success: boolean;
  valid: boolean;
  reason: string;
  license: LicenseData | null;
}

export interface LicenseCertificateData {
  certificate_id: string;
  certificate_text: string;
  filename: string;
  checksum: string;
  timestamp: string;
}

export interface AdminLicenseRow extends LicenseData {}


