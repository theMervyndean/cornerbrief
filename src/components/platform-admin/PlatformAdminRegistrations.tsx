import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  AlertCircle,
  Building2,
  Check,
  CheckCircle2,
  Clock,
  Eye,
  FileCheck,
  FileText,
  Loader2,
  MapPin,
  RefreshCw,
  Shield,
  ShieldAlert,
  UserCheck,
  Users,
  X,
  XCircle,
} from 'lucide-react';
import { Facility, FacilityStatus } from '../../types';

interface PlatformAdminRegistrationsProps {
  token: string;
  onRefreshParent: () => void;
}

const EASE_OUT_EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1];

export const PlatformAdminRegistrations: React.FC<PlatformAdminRegistrationsProps> = ({
  token,
  onRefreshParent,
}) => {
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Pending' | 'Active' | 'Rejected'>('Pending');
  const [reviewFacility, setReviewFacility] = useState<any | null>(null);

  // Review Action Form State
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [reviewNotes, setReviewNotes] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchRegistrations = async () => {
    setIsLoading(true);
    setActionMessage(null);
    try {
      const res = await fetch('/api/platform-admin/facility-registrations', {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      });
      if (res.ok) {
        const data = await res.json();
        setRegistrations(data.registrations || []);
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    fetchRegistrations();
  }, [token]);

  const filteredRegistrations = registrations.filter((reg) => {
    if (statusFilter === 'ALL') return true;
    return (reg.status || 'Active') === statusFilter;
  });

  const handleOpenReview = (facility: any) => {
    setReviewFacility(facility);
    setActionType(null);
    setRejectionReason('');
    setReviewNotes(facility.reviewNotes || '');
    setActionMessage(null);
  };

  const handleExecuteReview = async (action: 'approve' | 'reject') => {
    if (!reviewFacility) return;

    if (action === 'reject') {
      const cleanReason = rejectionReason.trim();
      if (cleanReason.length < 5) {
        setActionMessage({
          type: 'error',
          text: 'A rejection reason of at least 5 characters is mandatory to reject a hospital application.',
        });
        return;
      }
    }

    setIsSubmittingReview(true);
    setActionMessage(null);

    try {
      const res = await fetch(`/api/platform-admin/facilities/${reviewFacility.id}/review`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          action,
          rejectionReason: action === 'reject' ? rejectionReason.trim() : undefined,
          reviewNotes: reviewNotes.trim(),
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || `Review action failed (HTTP ${res.status}).`);
      }

      setActionMessage({
        type: 'success',
        text: data?.message || `Facility ${action === 'approve' ? 'approved' : 'rejected'} successfully.`,
      });

      // Update local state
      setRegistrations((prev) =>
        prev.map((r) => (r.id === reviewFacility.id ? { ...r, ...data.facility } : r))
      );
      setReviewFacility(data.facility);
      setActionType(null);

      // Refresh parent overview metrics
      onRefreshParent();
    } catch (err: any) {
      setActionMessage({
        type: 'error',
        text: err?.message || 'Failed to submit review decision.',
      });
    } finally {
      setIsSubmittingReview(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title & Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <FileCheck className="w-5 h-5 text-amber-400" />
            <span>Facility Registration Review Queue</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Review submitted healthcare organization onboarding requests and grant hospital workspace access
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Status Tabs */}
          <div className="bg-[#07131F] p-1 rounded-xl border border-slate-700 flex text-xs font-semibold">
            <button
              type="button"
              onClick={() => setStatusFilter('Pending')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                statusFilter === 'Pending'
                  ? 'bg-amber-500 text-[#07131F] font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Pending ({registrations.filter((r) => r.status === 'Pending').length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('Active')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                statusFilter === 'Active'
                  ? 'bg-emerald-500 text-white font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Approved ({registrations.filter((r) => (r.status || 'Active') === 'Active').length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('Rejected')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                statusFilter === 'Rejected'
                  ? 'bg-rose-500 text-white font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Rejected ({registrations.filter((r) => r.status === 'Rejected').length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                statusFilter === 'ALL'
                  ? 'bg-slate-700 text-white font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              All ({registrations.length})
            </button>
          </div>

          <button
            type="button"
            onClick={fetchRegistrations}
            disabled={isLoading}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs transition-colors cursor-pointer"
            aria-label="Refresh list"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Applications List */}
      <div className="bg-[#0B1F33] border border-slate-700/60 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-[#07131F] border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                <th className="px-5 py-3.5">Hospital Application</th>
                <th className="px-4 py-3.5">Generated Code</th>
                <th className="px-4 py-3.5">Type & State</th>
                <th className="px-4 py-3.5">Primary Administrator</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5">Submitted</th>
                <th className="px-4 py-3.5 text-right">Review Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {filteredRegistrations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-slate-400">
                    <div className="space-y-1">
                      <p className="font-semibold text-slate-300">No applications match this filter.</p>
                      <p className="text-[11px]">
                        {statusFilter === 'Pending'
                          ? 'There are currently no hospital registration applications awaiting platform review.'
                          : 'Try changing the status filter tab above.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRegistrations.map((reg) => (
                  <tr
                    key={reg.id}
                    className="hover:bg-slate-800/40 transition-colors group cursor-pointer"
                    onClick={() => handleOpenReview(reg)}
                  >
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-white group-hover:text-[#3B82F6] transition-colors">
                        {reg.name}
                      </div>
                      <div className="text-[11px] text-slate-400">{reg.address || reg.location}</div>
                    </td>

                    <td className="px-4 py-3.5 font-mono font-bold text-slate-200">
                      <span className="bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                        {reg.facilityCode}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 text-slate-300">
                      <div>{reg.facilityType || 'Hospital'}</div>
                      <div className="text-[11px] text-slate-400">{reg.state || 'Lagos State'}</div>
                    </td>

                    <td className="px-4 py-3.5 text-slate-300">
                      <div className="font-medium text-white">{reg.adminName || 'Dr. Administrator'}</div>
                      <div className="text-[11px] text-slate-400 font-mono truncate max-w-xs">
                        {reg.adminEmail || reg.contactEmail}
                      </div>
                    </td>

                    <td className="px-4 py-3.5">
                      {reg.status === 'Pending' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                          <Clock className="w-3 h-3" />
                          Pending Review
                        </span>
                      ) : reg.status === 'Rejected' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                          <XCircle className="w-3 h-3" />
                          Rejected
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                          <CheckCircle2 className="w-3 h-3" />
                          Active
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3.5 text-slate-400 font-mono text-[11px]">
                      {reg.createdAt ? new Date(reg.createdAt).toLocaleDateString() : 'Recent'}
                    </td>

                    <td className="px-4 py-3.5 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenReview(reg);
                        }}
                        className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                          reg.status === 'Pending'
                            ? 'bg-amber-500 hover:bg-amber-400 text-[#07131F]'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                        }`}
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>{reg.status === 'Pending' ? 'Review & Approve' : 'Inspect'}</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Review & Decision Modal */}
      <AnimatePresence>
        {reviewFacility && (
          <div className="fixed inset-0 z-50 bg-[#07131F]/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.2, ease: EASE_OUT_EXPO }}
              className="bg-[#0B1F33] border border-slate-700 rounded-2xl max-w-2xl w-full max-h-[92vh] overflow-y-auto shadow-2xl p-6 text-slate-100 space-y-6"
            >
              {/* Header */}
              <div className="flex items-start justify-between pb-4 border-b border-slate-800">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs font-bold bg-[#1769E0]/20 text-[#3B82F6] px-2.5 py-0.5 rounded border border-[#1769E0]/30">
                      {reviewFacility.facilityCode}
                    </span>
                    <span className="text-xs text-slate-400">
                      Submitted {reviewFacility.createdAt ? new Date(reviewFacility.createdAt).toLocaleString() : 'N/A'}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-white">{reviewFacility.name}</h3>
                  <p className="text-xs text-slate-400">{reviewFacility.facilityType} · {reviewFacility.state}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setReviewFacility(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {actionMessage && (
                <div
                  className={`p-3.5 rounded-xl text-xs flex items-start gap-2.5 ${
                    actionMessage.type === 'success'
                      ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                      : 'bg-rose-500/15 border border-rose-500/30 text-rose-300'
                  }`}
                >
                  {actionMessage.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                  )}
                  <span>{actionMessage.text}</span>
                </div>
              )}

              {/* Application Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="bg-[#07131F] p-4 rounded-xl border border-slate-800 space-y-2">
                  <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block">
                    Location & Contacts
                  </span>
                  <div>
                    <span className="text-slate-400">Address:</span>{' '}
                    <span className="text-slate-200">{reviewFacility.address || reviewFacility.location}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">City / State:</span>{' '}
                    <span className="text-slate-200">{reviewFacility.city}, {reviewFacility.state}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Email:</span>{' '}
                    <span className="text-slate-200 font-mono">{reviewFacility.contactEmail}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Phone:</span>{' '}
                    <span className="text-slate-200 font-mono">{reviewFacility.contactPhone || '+234 800 000 0000'}</span>
                  </div>
                </div>

                <div className="bg-[#07131F] p-4 rounded-xl border border-slate-800 space-y-2">
                  <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block">
                    Primary Facility Admin
                  </span>
                  <div>
                    <span className="text-slate-400">Name:</span>{' '}
                    <span className="text-white font-semibold">{reviewFacility.adminName || 'Dr. Administrator'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Title:</span>{' '}
                    <span className="text-slate-200">{reviewFacility.adminRoleTitle || 'Chief Medical Director'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Email:</span>{' '}
                    <span className="text-slate-200 font-mono">{reviewFacility.adminEmail || reviewFacility.contactEmail}</span>
                  </div>
                </div>
              </div>

              {/* Clinical Units */}
              <div className="space-y-2">
                <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block">
                  Requested Clinical Units ({reviewFacility.departments?.length || 0})
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {(reviewFacility.departments || []).map((dept: string) => (
                    <span
                      key={dept}
                      className="px-2.5 py-1 rounded-lg text-xs bg-slate-800 text-slate-200 border border-slate-700"
                    >
                      {dept}
                    </span>
                  ))}
                </div>
              </div>

              {/* Administrative Review Section */}
              <div className="bg-[#07131F] p-4 rounded-xl border border-slate-800 space-y-4">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300 block">
                  Administrative Decision & Review Notes
                </span>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Internal Verification Notes (Audit Log Record)
                  </label>
                  <textarea
                    rows={2}
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    placeholder="Enter compliance or verification details (e.g., CAC verified, MDCN licence confirmed)..."
                    className="w-full bg-[#0B1F33] text-white border border-slate-700 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-[#3B82F6]"
                  />
                </div>

                {/* If rejecting, show required rejection reason input */}
                {actionType === 'reject' && (
                  <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl space-y-2">
                    <label className="block text-xs font-bold text-rose-300">
                      Mandatory Rejection Reason (at least 5 characters) *
                    </label>
                    <input
                      type="text"
                      required
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="e.g., Incomplete medical licence documentation provided."
                      className="w-full bg-[#07131F] text-white border border-rose-500/50 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-rose-400"
                    />
                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setActionType(null)}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={isSubmittingReview || rejectionReason.trim().length < 5}
                        onClick={() => handleExecuteReview('reject')}
                        className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-lg disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                      >
                        {isSubmittingReview ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5" />
                        )}
                        <span>Confirm Rejection</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                {actionType !== 'reject' && (
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                    <div className="text-[11px] text-slate-400">
                      Current Status:{' '}
                      <span className="font-semibold text-white">{reviewFacility.status || 'Active'}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={isSubmittingReview}
                        onClick={() => setActionType('reject')}
                        className="px-3.5 py-2 bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/40 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                      >
                        Reject Application
                      </button>

                      <button
                        type="button"
                        disabled={isSubmittingReview}
                        onClick={() => handleExecuteReview('approve')}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-2 shadow-lg shadow-emerald-600/20 cursor-pointer disabled:opacity-50"
                      >
                        {isSubmittingReview ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Approving Workspace...</span>
                          </>
                        ) : (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Approve & Activate Hospital Workspace</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Close Button */}
              <div className="pt-4 border-t border-slate-800 flex justify-end">
                <button
                  type="button"
                  onClick={() => setReviewFacility(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold"
                >
                  Close Inspection
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
