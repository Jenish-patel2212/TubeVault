import { HistoryItem } from '../types/api';

const STORAGE_KEY = 'tubevault_download_history';

export const getDownloadHistory = (): HistoryItem[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to read download history from storage:', e);
    return [];
  }
};

export const saveHistoryItem = (item: Omit<HistoryItem, 'id' | 'date'>): HistoryItem => {
  const history = getDownloadHistory();
  const newItem: HistoryItem = {
    ...item,
    id: 'hist_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
    date: new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
  };

  // Limit history to 50 items max
  const updated = [newItem, ...history].slice(0, 50);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to save history item:', e);
  }
  return newItem;
};

export const clearDownloadHistory = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error('Failed to clear download history:', e);
  }
};

export const deleteHistoryItem = (id: string): void => {
  try {
    const history = getDownloadHistory();
    const updated = history.filter((item) => item.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to delete history item:', e);
  }
};

// --- Safe Browser Storage with fallbacks ---

export const safeGetLocal = (key: string, defaultVal: string = ''): string => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return localStorage.getItem(key) || defaultVal;
    }
  } catch (e) {
    console.warn(`Unable to read localStorage key "${key}":`, e);
  }
  return defaultVal;
};

export const safeSetLocal = (key: string, value: string): void => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(key, value);
    }
  } catch (e) {
    console.warn(`Unable to write localStorage key "${key}":`, e);
  }
};

export const safeRemoveLocal = (key: string): void => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem(key);
    }
  } catch (e) {
    console.warn(`Unable to remove localStorage key "${key}":`, e);
  }
};

export const safeGetSession = (key: string, defaultVal: string = ''): string => {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      return sessionStorage.getItem(key) || defaultVal;
    }
  } catch (e) {
    console.warn(`Unable to read sessionStorage key "${key}":`, e);
  }
  return defaultVal;
};

export const safeSetSession = (key: string, value: string): void => {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      sessionStorage.setItem(key, value);
    }
  } catch (e) {
    console.warn(`Unable to write sessionStorage key "${key}":`, e);
  }
};

export const safeRemoveSession = (key: string): void => {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      sessionStorage.removeItem(key);
    }
  } catch (e) {
    console.warn(`Unable to remove sessionStorage key "${key}":`, e);
  }
};

// --- License Key & Certificate Storage ---

const LICENSE_KEY_STORAGE = 'tubevault_active_license_key';
const LICENSE_INFO_STORAGE = 'tubevault_active_license_info';

export const getActiveLicenseKey = (): string => {
  return safeGetLocal(LICENSE_KEY_STORAGE, '');
};

export const setActiveLicenseKey = (key: string): void => {
  safeSetLocal(LICENSE_KEY_STORAGE, key.trim().toUpperCase());
};

export const clearActiveLicenseKey = (): void => {
  safeRemoveLocal(LICENSE_KEY_STORAGE);
  safeRemoveLocal(LICENSE_INFO_STORAGE);
};

export const getActiveLicenseInfo = (): any => {
  try {
    const raw = safeGetLocal(LICENSE_INFO_STORAGE, '');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const setActiveLicenseInfo = (info: any): void => {
  try {
    safeSetLocal(LICENSE_INFO_STORAGE, JSON.stringify(info));
  } catch (e) {
    console.warn('Failed to save license info:', e);
  }
};

/**
 * Triggers a direct browser file download for text strings (e.g. License Certificates)
 */
export const downloadTextFile = (filename: string, textContent: string): void => {
  try {
    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  } catch (e) {
    console.error('Failed to trigger text file download:', e);
  }
};

// --- Device Authorization & Owner Security ---

const DEVICE_ID_STORAGE = 'tubevault_device_id';
const OWNER_PIN_STORAGE = 'tubevault_owner_master_pin';
const DEVICE_APPROVED_STORAGE = 'tubevault_device_approved';

export const getOrCreateDeviceId = (): string => {
  let id = safeGetLocal(DEVICE_ID_STORAGE, '');
  if (!id) {
    id = 'dev_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 8);
    safeSetLocal(DEVICE_ID_STORAGE, id);
  }
  return id;
};

export const getStoredMasterPin = (): string => {
  return safeGetLocal(OWNER_PIN_STORAGE, '');
};

export const setStoredMasterPin = (pin: string): void => {
  safeSetLocal(OWNER_PIN_STORAGE, pin.trim());
};

export const clearStoredMasterPin = (): void => {
  safeRemoveLocal(OWNER_PIN_STORAGE);
};

export const isDeviceApprovedLocally = (): boolean => {
  return safeGetLocal(DEVICE_APPROVED_STORAGE, '') === 'true';
};

export const setDeviceApprovedLocally = (approved: boolean): void => {
  safeSetLocal(DEVICE_APPROVED_STORAGE, approved ? 'true' : 'false');
};
