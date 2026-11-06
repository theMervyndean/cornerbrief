import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  AlertCircle,
  Bell,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  ExternalLink,
  Eye,
  EyeOff,
  Filter,
  Info,
  Key,
  Loader2,
  Lock,
  Mail,
  MessageSquare,
  Phone,
  RefreshCw,
  RotateCw,
  Search,
  Send,
  Shield,
  ShieldAlert,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { NotificationRecord } from '../../types';

interface PlatformAdminNotificationsProps {
  token: string;
}

export const PlatformAdminNotifications: React.FC<PlatformAdminNotificationsProps> = ({
  token,
}) => {
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [config, setConfig] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [channelFilter, setChannelFilter] = useState('ALL');
  const [eventTypeFilter, setEventTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  // Live Dispatch & Credential Verification State
  const [showTester, setShowTester] = useState(true);
  const [testTab, setTestTab] = useState<'GMAIL' | 'WHATSAPP'>('GMAIL');
  const [gmailAppPassword, setGmailAppPassword] = useState('');
  const [showGmailPassword, setShowGmailPassword] = useState(false);
  const [gmailRecipient, setGmailRecipient] = useState('thecornerstreams@gmail.com');
  const [isTestingGmail, setIsTestingGmail] = useState(false);
  const [gmailTestOutcome, setGmailTestOutcome] = useState<{
    success: boolean;
    message: string;
    messageId?: string;
    error?: string;
  } | null>(null);

  const [whatsappToken, setWhatsappToken] = useState('');
  const [showWhatsappToken, setShowWhatsappToken] = useState(false);
  const [whatsappPhoneId, setWhatsappPhoneId] = useState('');
  const [whatsappRecipient, setWhatsappRecipient] = useState('+2348141880550');
  const [isTestingWhatsapp, setIsTestingWhatsapp] = useState(false);
  const [whatsappTestOutcome, setWhatsappTestOutcome] = useState<{
    success: boolean;
    message: string;
    messageId?: string;
    error?: string;
  } | null>(null);

  const fetchNotificationsAndConfig = async () => {
    setIsLoading(true);
    setActionNotice(null);
    try {
      const [notifRes, cfgRes] = await Promise.all([
        fetch('/api/platform-admin/notifications', {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        }),
        fetch('/api/platform-admin/notifications/config', {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        }),
      ]);

      if (notifRes.ok) {
        const notifData = await notifRes.json();
        setNotifications(notifData.notifications || []);
      }

      if (cfgRes.ok) {
        const cfgData = await cfgRes.json();
        setConfig(cfgData.config || null);
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotificationsAndConfig();
  }, [token]);

  const handleRetry = async (notificationId: string) => {
    setRetryingId(notificationId);
    setActionNotice(null);
    try {
      const res = await fetch(`/api/platform-admin/notifications/${notificationId}/retry`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || `Retry failed (HTTP ${res.status})`);
      }

      setActionNotice({
        type: data?.notification?.status === 'SENT' ? 'success' : 'error',
        text: data?.message || 'Notification retry complete.',
      });

      // Update item in local list
      if (data?.notification) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === notificationId ? data.notification : n))
        );
      }
    } catch (err: any) {
      setActionNotice({
        type: 'error',
        text: err?.message || 'Failed to trigger notification retry.',
      });
    } finally {
      setRetryingId(null);
    }
  };

  const handleTestGmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsTestingGmail(true);
    setGmailTestOutcome(null);
    try {
      const res = await fetch('/api/platform-admin/notifications/test-gmail', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          appPassword: gmailAppPassword,
          recipientEmail: gmailRecipient,
          saveConfig: true,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || `Gmail test dispatch failed (HTTP ${res.status})`);
      }

      setGmailTestOutcome({
        success: data.success,
        message: data.message || (data.success ? 'Gmail test notification sent successfully.' : 'Delivery failed.'),
        messageId: data.messageId,
        error: data.error,
      });

      await fetchNotificationsAndConfig();
    } catch (err: any) {
      setGmailTestOutcome({
        success: false,
        message: err.message || 'Failed to execute Gmail test probe.',
        error: err.message,
      });
    } finally {
      setIsTestingGmail(false);
    }
  };

  const handleTestWhatsapp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsTestingWhatsapp(true);
    setWhatsappTestOutcome(null);
    try {
      const res = await fetch('/api/platform-admin/notifications/test-whatsapp', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          accessToken: whatsappToken,
          phoneNumberId: whatsappPhoneId,
          recipientPhone: whatsappRecipient,
          saveConfig: true,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || `WhatsApp test dispatch failed (HTTP ${res.status})`);
      }

      setWhatsappTestOutcome({
        success: data.success,
        message: data.message || (data.success ? 'WhatsApp test notification sent successfully.' : 'Delivery failed.'),
        messageId: data.messageId,
        error: data.error,
      });

      await fetchNotificationsAndConfig();
    } catch (err: any) {
      setWhatsappTestOutcome({
        success: false,
        message: err.message || 'Failed to execute WhatsApp test probe.',
        error: err.message,
      });
    } finally {
      setIsTestingWhatsapp(false);
    }
  };


  const filteredNotifications = notifications.filter((notif) => {
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      notif.recipient.toLowerCase().includes(q) ||
      (notif.facilityCode || '').toLowerCase().includes(q) ||
      (notif.facilityId || '').toLowerCase().includes(q) ||
      (notif.metadata?.facilityName || '').toLowerCase().includes(q) ||
      (notif.error || '').toLowerCase().includes(q);

    const matchesChannel = channelFilter === 'ALL' || notif.channel === channelFilter;
    const matchesEvent = eventTypeFilter === 'ALL' || notif.eventType === eventTypeFilter;
    const matchesStatus = statusFilter === 'ALL' || notif.status === statusFilter;

    return matchesSearch && matchesChannel && matchesEvent && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SENT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3" />
            Delivered
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30">
            <XCircle className="w-3 h-3" />
            Failed
          </span>
        );
      case 'CONFIG_MISSING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <AlertCircle className="w-3 h-3" />
            Missing Provider Keys
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/15 text-blue-400 border border-blue-500/30">
            <Clock className="w-3 h-3" />
            {status}
          </span>
        );
    }
  };

  const getEventTypeLabel = (eventType: string) => {
    switch (eventType) {
      case 'FACILITY_REGISTERED_ADMIN':
        return 'Admin New Reg Alert';
      case 'FACILITY_REGISTERED_CONFIRMATION':
        return 'Hospital Reg Confirmation';
      case 'FACILITY_APPROVED':
        return 'Hospital Approved Notice';
      case 'FACILITY_REJECTED':
        return 'Hospital Rejected Notice';
      default:
        return eventType;
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Bell className="w-5 h-5 text-emerald-400" />
            <span>WhatsApp & Gmail Notifications Hub</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Real-time delivery status, message logs, and automated retry tracking across hospital onboarding workflows
          </p>
        </div>

        <button
          type="button"
          onClick={fetchNotificationsAndConfig}
          disabled={isLoading}
          className="cb-btn inline-flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-medium transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Delivery Logs</span>
        </button>
      </div>

      {actionNotice && (
        <div
          className={`p-3.5 rounded-xl text-xs flex items-start gap-2.5 ${
            actionNotice.type === 'success'
              ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/15 border border-rose-500/30 text-rose-300'
          }`}
        >
          {actionNotice.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
          )}
          <span>{actionNotice.text}</span>
        </div>
      )}

      {/* Provider Configuration Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* WhatsApp Business Provider Card */}
        <div className="bg-[#0B1F33] border border-slate-700/60 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 text-xs font-bold text-slate-200">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <MessageSquare className="w-4 h-4" />
              </div>
              <span>WhatsApp Business API</span>
            </div>
            {config?.whatsapp?.isConfigured ? (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                ACTIVE
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                CREDENTIALS REQUIRED
              </span>
            )}
          </div>

          <div className="space-y-1.5 text-xs pt-1">
            <div className="flex justify-between text-slate-400">
              <span>Admin Recipient:</span>
              <span className="font-mono text-white font-semibold">{config?.adminWhatsApp || '+2348141880550'}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Active Provider:</span>
              <span className="font-mono text-slate-300">{config?.whatsapp?.activeService}</span>
            </div>
          </div>

          <p className="text-[11px] text-slate-400 pt-2 border-t border-slate-800 leading-relaxed">
            {config?.whatsapp?.isConfigured
              ? 'WhatsApp Cloud API credentials configured. Live transmission active.'
              : 'To enable live delivery, set WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID in Cloud Run environment.'}
          </p>
        </div>

        {/* Gmail / SMTP Provider Card */}
        <div className="bg-[#0B1F33] border border-slate-700/60 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 text-xs font-bold text-slate-200">
              <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
                <Mail className="w-4 h-4" />
              </div>
              <span>Gmail / SMTP Delivery</span>
            </div>
            {config?.gmail?.isConfigured ? (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                ACTIVE
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                CREDENTIALS REQUIRED
              </span>
            )}
          </div>

          <div className="space-y-1.5 text-xs pt-1">
            <div className="flex justify-between text-slate-400">
              <span>Admin Recipient:</span>
              <span className="font-mono text-white font-semibold">{config?.adminEmail || 'thecornerstreams@gmail.com'}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Active Service:</span>
              <span className="font-mono text-slate-300">{config?.gmail?.activeService}</span>
            </div>
          </div>

          <p className="text-[11px] text-slate-400 pt-2 border-t border-slate-800 leading-relaxed">
            {config?.gmail?.isConfigured
              ? 'Gmail SMTP credentials configured. Live transmission active.'
              : 'To enable live delivery, set GMAIL_APP_PASSWORD in Cloud Run environment (uses thecornerstreams@gmail.com).'}
          </p>
        </div>
      </div>

      {/* Live Provider Verification & Test Dispatcher */}
      <div className="bg-[#0B1F33] border border-blue-500/30 rounded-2xl overflow-hidden shadow-lg shadow-blue-500/5">
        <div className="p-4 bg-gradient-to-r from-blue-950/40 via-slate-900/60 to-slate-900 border-b border-slate-700/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
              <Send className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Live Notification Verification & Dispatch Tester</span>
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  Production Probe
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Authenticate your 16-character Google App Password or WhatsApp credentials and verify real SMTP/API delivery
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowTester(!showTester)}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
          >
            {showTester ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {showTester && (
          <div className="p-5 space-y-5">
            {/* Tab Selector */}
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <button
                type="button"
                onClick={() => setTestTab('GMAIL')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  testTab === 'GMAIL'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Gmail SMTP (thecornerstreams@gmail.com)</span>
                {config?.gmail?.isConfigured && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setTestTab('WHATSAPP')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  testTab === 'WHATSAPP'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>WhatsApp Business (+2348141880550)</span>
                {config?.whatsapp?.isConfigured && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                )}
              </button>
            </div>

            {/* Tab 1: Gmail SMTP */}
            {testTab === 'GMAIL' && (
              <form onSubmit={handleTestGmail} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Google 16-Character App Password */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Key className="w-3.5 h-3.5 text-blue-400" />
                        <span>16-Character Google App Password</span>
                      </span>
                      <span className="text-[10px] text-slate-400 font-normal">
                        (e.g. abcd efgh ijkl mnop)
                      </span>
                    </label>
                    <div className="relative">
                      <input
                        type={showGmailPassword ? 'text' : 'password'}
                        value={gmailAppPassword}
                        onChange={(e) => setGmailAppPassword(e.target.value)}
                        placeholder="Paste your 16-character Google App Password..."
                        className="w-full bg-[#07131F] text-white border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:border-blue-500 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowGmailPassword(!showGmailPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                      >
                        {showGmailPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Generated at <span className="text-slate-300 font-mono">myaccount.google.com/apppasswords</span>. Spaces are stripped automatically.
                    </p>
                  </div>

                  {/* Recipient Target Email */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-blue-400" />
                        <span>Test Recipient Mailbox</span>
                      </span>
                      <span className="text-[10px] text-emerald-400 font-medium">Platform Admin</span>
                    </label>
                    <input
                      type="email"
                      value={gmailRecipient}
                      onChange={(e) => setGmailRecipient(e.target.value)}
                      placeholder="thecornerstreams@gmail.com"
                      className="w-full bg-[#07131F] text-white border border-slate-700 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-500"
                    />
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Delivery probe will send a real styled verification alert directly to this inbox.
                    </p>
                  </div>
                </div>

                {/* Outcome Display */}
                {gmailTestOutcome && (
                  <div
                    className={`p-3.5 rounded-xl text-xs space-y-1.5 ${
                      gmailTestOutcome.success
                        ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                        : 'bg-rose-500/15 border border-rose-500/30 text-rose-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-semibold">
                      {gmailTestOutcome.success ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span>Google SMTP Verification Successful! Delivered live to {gmailRecipient}</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-4 h-4 text-rose-400" />
                          <span>Google SMTP Delivery Rejected</span>
                        </>
                      )}
                    </div>
                    <div className="text-[11px] font-mono opacity-90 pl-6">
                      {gmailTestOutcome.success ? (
                        <div>
                          <strong>Google Message ID:</strong> {gmailTestOutcome.messageId || 'Delivered'}
                          <div className="text-[10px] text-emerald-400/80 mt-1 font-sans">
                            ✓ Credentials persisted. Automatic hospital registration & review emails are fully active.
                          </div>
                        </div>
                      ) : (
                        <div>
                          <strong>Provider Error:</strong> {gmailTestOutcome.error || gmailTestOutcome.message}
                          <div className="text-[10px] text-rose-300/80 mt-1 font-sans">
                            Hint: Check that 2-Step Verification is enabled and that you generated an "App Password" specifically for Mail.
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-1">
                  <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                    <Lock className="w-3 h-3 text-slate-500" />
                    <span>Credentials are tested server-side and never exposed in client bundles.</span>
                  </div>

                  <button
                    type="submit"
                    disabled={isTestingGmail}
                    className="cb-btn inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-500/20 disabled:opacity-50 transition-all cursor-pointer"
                  >
                    {isTestingGmail ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Authenticating with Google SMTP...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Send Live Test Email via Google SMTP</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* Tab 2: WhatsApp Cloud API */}
            {testTab === 'WHATSAPP' && (
              <form onSubmit={handleTestWhatsapp} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Meta Access Token */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Key className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Meta Access Token</span>
                      </span>
                    </label>
                    <div className="relative">
                      <input
                        type={showWhatsappToken ? 'text' : 'password'}
                        value={whatsappToken}
                        onChange={(e) => setWhatsappToken(e.target.value)}
                        placeholder="EAAB..."
                        className="w-full bg-[#07131F] text-white border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:border-emerald-500 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowWhatsappToken(!showWhatsappToken)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                      >
                        {showWhatsappToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Phone Number ID */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Phone Number ID</span>
                      </span>
                    </label>
                    <input
                      type="text"
                      value={whatsappPhoneId}
                      onChange={(e) => setWhatsappPhoneId(e.target.value)}
                      placeholder="e.g. 1029384756..."
                      className="w-full bg-[#07131F] text-white border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  {/* Recipient Number */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Test WhatsApp Recipient</span>
                      </span>
                    </label>
                    <input
                      type="text"
                      value={whatsappRecipient}
                      onChange={(e) => setWhatsappRecipient(e.target.value)}
                      placeholder="+2348141880550"
                      className="w-full bg-[#07131F] text-white border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* Outcome Display */}
                {whatsappTestOutcome && (
                  <div
                    className={`p-3.5 rounded-xl text-xs space-y-1.5 ${
                      whatsappTestOutcome.success
                        ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                        : 'bg-rose-500/15 border border-rose-500/30 text-rose-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-semibold">
                      {whatsappTestOutcome.success ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span>WhatsApp Verification Successful! Delivered to {whatsappRecipient}</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-4 h-4 text-rose-400" />
                          <span>WhatsApp API Rejected</span>
                        </>
                      )}
                    </div>
                    <div className="text-[11px] font-mono opacity-90 pl-6">
                      {whatsappTestOutcome.success ? (
                        <div>
                          <strong>Meta Message ID:</strong> {whatsappTestOutcome.messageId || 'Delivered'}
                        </div>
                      ) : (
                        <div>
                          <strong>Provider Error:</strong> {whatsappTestOutcome.error || whatsappTestOutcome.message}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-1">
                  <div className="text-[11px] text-slate-400">
                    Supports Meta WhatsApp Cloud API (v21.0) and Twilio WhatsApp API.
                  </div>

                  <button
                    type="submit"
                    disabled={isTestingWhatsapp}
                    className="cb-btn inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-emerald-500/20 disabled:opacity-50 transition-all cursor-pointer"
                  >
                    {isTestingWhatsapp ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Calling Meta Graph API...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Send Live Test WhatsApp Message</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#0B1F33] border border-slate-700/60 rounded-2xl p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Keyword Search */}
          <div>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search phone, email, facility..."
                className="w-full bg-[#07131F] text-white border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs focus:outline-none focus:border-[#3B82F6]"
              />
            </div>
          </div>

          {/* Channel Filter */}
          <div>
            <select
              value={channelFilter}
              onChange={(e) => setChannelFilter(e.target.value)}
              className="w-full bg-[#07131F] text-slate-200 border border-slate-700 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#3B82F6]"
            >
              <option value="ALL">All Channels</option>
              <option value="WHATSAPP">WhatsApp Only</option>
              <option value="GMAIL">Gmail Only</option>
            </select>
          </div>

          {/* Event Type Filter */}
          <div>
            <select
              value={eventTypeFilter}
              onChange={(e) => setEventTypeFilter(e.target.value)}
              className="w-full bg-[#07131F] text-slate-200 border border-slate-700 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#3B82F6]"
            >
              <option value="ALL">All Event Types</option>
              <option value="FACILITY_REGISTERED_ADMIN">Admin New Reg Alert</option>
              <option value="FACILITY_REGISTERED_CONFIRMATION">Hospital Reg Confirmation</option>
              <option value="FACILITY_APPROVED">Hospital Approval Notice</option>
              <option value="FACILITY_REJECTED">Hospital Rejection Notice</option>
            </select>
          </div>

          {/* Delivery Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-[#07131F] text-slate-200 border border-slate-700 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#3B82F6]"
            >
              <option value="ALL">All Delivery Statuses</option>
              <option value="SENT">Delivered (SENT)</option>
              <option value="FAILED">Failed</option>
              <option value="CONFIG_MISSING">Config Missing</option>
            </select>
          </div>
        </div>
      </div>

      {/* Notifications Table */}
      <div className="bg-[#0B1F33] border border-slate-700/60 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-[#07131F] border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                <th className="px-5 py-3.5">Timestamp</th>
                <th className="px-4 py-3.5">Channel</th>
                <th className="px-4 py-3.5">Event Type</th>
                <th className="px-4 py-3.5">Recipient</th>
                <th className="px-4 py-3.5">Hospital</th>
                <th className="px-4 py-3.5">Delivery Status</th>
                <th className="px-4 py-3.5">Provider Diagnostics</th>
                <th className="px-4 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {filteredNotifications.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-10 text-center text-slate-400">
                    <p className="font-semibold text-slate-300">No notification records found.</p>
                    <p className="text-[11px] mt-1">
                      Notifications are dispatched automatically whenever a hospital registers or is reviewed.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredNotifications.map((notif) => (
                  <tr key={notif.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-3.5 font-mono text-slate-300 whitespace-nowrap">
                      <div>
                        {new Date(notif.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {new Date(notif.createdAt).toLocaleDateString([], {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </div>
                    </td>

                    <td className="px-4 py-3.5">
                      {notif.channel === 'WHATSAPP' ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                          WhatsApp
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                          <Mail className="w-3.5 h-3.5 text-blue-400" />
                          Gmail
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3.5 text-slate-200 font-medium">
                      {getEventTypeLabel(notif.eventType)}
                    </td>

                    <td className="px-4 py-3.5 font-mono text-slate-300">
                      {notif.recipient}
                    </td>

                    <td className="px-4 py-3.5 text-slate-300">
                      <div>{notif.metadata?.facilityName || notif.facilityCode || notif.facilityId}</div>
                      {notif.facilityCode && (
                        <span className="text-[10px] font-mono text-slate-400">
                          Code: {notif.facilityCode}
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3.5">
                      {getStatusBadge(notif.status)}
                    </td>

                    <td className="px-4 py-3.5 text-slate-400 text-[11px] max-w-xs truncate">
                      {notif.status === 'SENT' ? (
                        <span className="text-emerald-400 font-mono text-[10px]">
                          ID: {notif.providerMessageId || 'Confirmed'} ({notif.provider})
                        </span>
                      ) : (
                        <span className="text-rose-300" title={notif.error}>
                          {notif.error || 'Provider communication error'}
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => handleRetry(notif.id)}
                        disabled={retryingId === notif.id}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg text-xs transition-colors border border-slate-700 disabled:opacity-50 cursor-pointer"
                        title="Retry sending this notification"
                      >
                        {retryingId === notif.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <RotateCw className="w-3 h-3" />
                        )}
                        <span>Retry</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
