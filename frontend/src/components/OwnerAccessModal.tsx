import React, { useState, useEffect } from 'react';
import { Shield, X, Check, Trash2, KeyRound, Loader2, RefreshCw, Smartphone, UserCheck, AlertCircle, Clock } from 'lucide-react';
import { getAccessRequests, approveDeviceRequest, rejectDeviceRequest, revokeDeviceRequest, changeMasterPin, AccessRequestItem } from '../utils/api';
import { getStoredMasterPin, setStoredMasterPin } from '../utils/storage';

interface OwnerAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNotify: (title: string, message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

export const OwnerAccessModal: React.FC<OwnerAccessModalProps> = ({ isOpen, onClose, onNotify }) => {
  const [requests, setRequests] = useState<AccessRequestItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeActionId, setActiveActionId] = useState<string | null>(null);
  const [showPinChange, setShowPinChange] = useState(false);
  const [newPin, setNewPin] = useState('');
  const masterPin = getStoredMasterPin() || '2022';

  const fetchRequests = async () => {
    setIsLoading(true);
    try {
      const data = await getAccessRequests(masterPin);
      setRequests(data);
    } catch (err: any) {
      console.error('Failed to fetch requests:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchRequests();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleApprove = async (deviceId: string, visitorName: string) => {
    setActiveActionId(deviceId);
    try {
      await approveDeviceRequest(deviceId, masterPin);
      onNotify('Access Approved', `Allowed ${visitorName} to use TubeVault.`, 'success');
      await fetchRequests();
    } catch (err: any) {
      onNotify('Error', err.message || 'Approval failed', 'error');
    } finally {
      setActiveActionId(null);
    }
  };

  const handleReject = async (deviceId: string, visitorName: string) => {
    setActiveActionId(deviceId);
    try {
      await rejectDeviceRequest(deviceId, masterPin);
      onNotify('Access Denied', `Declined request from ${visitorName}.`, 'info');
      await fetchRequests();
    } catch (err: any) {
      onNotify('Error', err.message || 'Action failed', 'error');
    } finally {
      setActiveActionId(null);
    }
  };

  const handleRevoke = async (deviceId: string, visitorName: string) => {
    setActiveActionId(deviceId);
    try {
      await revokeDeviceRequest(deviceId, masterPin);
      onNotify('Access Revoked', `Revoked access for ${visitorName}.`, 'warning');
      await fetchRequests();
    } catch (err: any) {
      onNotify('Error', err.message || 'Revoke failed', 'error');
    } finally {
      setActiveActionId(null);
    }
  };

  const handleChangePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPin.trim().length < 4) {
      onNotify('Invalid PIN', 'PIN must be at least 4 digits.', 'warning');
      return;
    }
    try {
      await changeMasterPin(masterPin, newPin.trim());
      setStoredMasterPin(newPin.trim());
      setNewPin('');
      setShowPinChange(false);
      onNotify('Master PIN Updated', `Your new PIN is now: ${newPin.trim()}`, 'success');
    } catch (err: any) {
      onNotify('Error', err.message || 'Failed to update PIN', 'error');
    }
  };

  const pendingRequests = requests.filter((r) => r.status === 'PENDING');
  const approvedRequests = requests.filter((r) => r.status === 'APPROVED');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl max-h-[90vh] flex flex-col bg-[#0c1017] border border-zinc-800 rounded-3xl p-6 shadow-2xl text-white overflow-hidden">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-zinc-400 hover:text-white bg-zinc-800/50 hover:bg-zinc-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 pb-4 border-b border-zinc-800/80">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-red-500/20 to-rose-600/20 border border-red-500/30 flex items-center justify-center text-red-500">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-black text-white">Owner Access Control</h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-red-600/20 border border-red-500/30 text-red-400">
                Jenish Patel
              </span>
            </div>
            <p className="text-xs text-zinc-400">Approve or deny visitor devices from your phone</p>
          </div>
        </div>

        {/* Refresh & Quick Controls */}
        <div className="py-3 flex items-center justify-between text-xs border-b border-zinc-800/40">
          <button
            onClick={fetchRequests}
            disabled={isLoading}
            className="flex items-center gap-1.5 text-zinc-400 hover:text-white transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-red-400' : ''}`} />
            <span>Refresh Requests</span>
          </button>

          <button
            onClick={() => setShowPinChange(!showPinChange)}
            className="flex items-center gap-1 text-amber-400 hover:text-amber-300 transition-colors font-medium"
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Change Master PIN</span>
          </button>
        </div>

        {/* Change PIN Form */}
        {showPinChange && (
          <form onSubmit={handleChangePin} className="p-3 my-2 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-2">
            <label className="text-xs font-semibold text-zinc-300">Set New 4-Digit Master PIN:</label>
            <div className="flex gap-2">
              <input
                type="password"
                placeholder="New PIN (e.g. 7777)"
                value={newPin}
                onChange={(e) => setNewPin(e.target.value)}
                className="flex-1 px-3 py-1.5 rounded-xl bg-zinc-950 border border-zinc-700 text-sm text-white font-mono"
              />
              <button
                type="submit"
                className="px-4 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-all"
              >
                Save
              </button>
            </div>
          </form>
        )}

        {/* Requests Scrollable List */}
        <div className="flex-1 overflow-y-auto py-3 space-y-5 pr-1">
          
          {/* 1. Pending Approvals */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs font-bold text-zinc-300">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-400" /> Pending Requests
              </span>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[10px]">
                {pendingRequests.length} waiting
              </span>
            </div>

            {pendingRequests.length === 0 ? (
              <div className="p-4 rounded-2xl bg-zinc-900/40 border border-zinc-800/60 text-center text-xs text-zinc-500">
                No pending requests right now.
              </div>
            ) : (
              pendingRequests.map((req) => (
                <div
                  key={req.device_id}
                  className="p-3.5 rounded-2xl bg-zinc-900/90 border border-zinc-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-white">{req.visitor_name}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-semibold">
                        Waiting for Approval
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 truncate max-w-xs">{req.device_info || 'Mobile / PC Device'}</p>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      onClick={() => handleApprove(req.device_id, req.visitor_name)}
                      disabled={activeActionId === req.device_id}
                      className="flex-1 sm:flex-none px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all flex items-center justify-center gap-1 shadow-md shadow-emerald-950/40"
                    >
                      {activeActionId === req.device_id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Approve</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => handleReject(req.device_id, req.visitor_name)}
                      disabled={activeActionId === req.device_id}
                      className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition-colors"
                    >
                      Deny
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* 2. Currently Approved Devices */}
          <div className="space-y-2.5 pt-2 border-t border-zinc-800/60">
            <div className="flex items-center justify-between text-xs font-bold text-zinc-300">
              <span className="flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-emerald-400" /> Approved Devices
              </span>
              <span className="text-[10px] text-zinc-500 font-normal">
                {approvedRequests.length} active
              </span>
            </div>

            {approvedRequests.length === 0 ? (
              <div className="p-4 rounded-2xl bg-zinc-900/40 border border-zinc-800/60 text-center text-xs text-zinc-500">
                No external devices approved yet.
              </div>
            ) : (
              approvedRequests.map((req) => (
                <div
                  key={req.device_id}
                  className="p-3 rounded-2xl bg-zinc-900/60 border border-zinc-800/70 flex items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white">{req.visitor_name}</span>
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    </div>
                    <span className="text-[10px] text-zinc-500">{new Date(req.updated_at).toLocaleDateString()}</span>
                  </div>

                  <button
                    onClick={() => handleRevoke(req.device_id, req.visitor_name)}
                    disabled={activeActionId === req.device_id}
                    className="px-2.5 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 text-[11px] font-medium transition-colors flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Revoke</span>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer info */}
        <div className="pt-3 border-t border-zinc-800/80 text-center text-[11px] text-zinc-500">
          Only devices approved by you can access and download from TubeVault.
        </div>
      </div>
    </div>
  );
};
