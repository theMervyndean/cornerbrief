import nodemailer, { type Transporter } from 'nodemailer';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {
  NotificationChannel,
  NotificationDeliveryStatus,
  NotificationEventType,
  NotificationRecord,
} from '../types.ts';

export interface NotificationPayload {
  facilityId: string;
  facilityName: string;
  facilityCode: string;
  facilityType: string;
  location: string;
  state: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  createdAt: string;
  status: string;
  rejectionReason?: string;
  reviewNotes?: string;
}

export interface NotificationDispatchResult {
  id: string;
  channel: NotificationChannel;
  eventType: NotificationEventType;
  recipient: string;
  status: NotificationDeliveryStatus;
  provider: string;
  providerMessageId?: string;
  error?: string;
  deliveredAt?: string;
}

// In-memory store for notification records (complements Firestore persistence)
export const inMemoryNotifications = new Map<string, NotificationRecord>();

// Global deduplication cache: key -> timestamp
const notificationDeduplicationMap = new Map<string, number>();

/**
 * Normalizes phone numbers to standard E.164 format (e.g., Nigerian +234...)
 */
export function normalizeE164Phone(rawPhone: string): string {
  if (!rawPhone) return '';
  let cleaned = rawPhone.replace(/[^\d+]/g, '');
  if (cleaned.startsWith('0') && cleaned.length === 11) {
    cleaned = '+234' + cleaned.slice(1);
  } else if (cleaned.startsWith('234') && !cleaned.startsWith('+')) {
    cleaned = '+' + cleaned;
  } else if (!cleaned.startsWith('+') && cleaned.length >= 10) {
    cleaned = '+234' + cleaned;
  }
  return cleaned;
}

/**
 * Returns active notification configuration without exposing secret keys
 */
export function getNotificationConfig() {
  const rawAdminWhatsApp = (process.env.PLATFORM_ADMIN_WHATSAPP || '').trim();
  const adminWhatsApp =
    rawAdminWhatsApp.startsWith('+') && rawAdminWhatsApp.length >= 10
      ? rawAdminWhatsApp
      : '+2348141880550';

  const rawAdminEmail = (process.env.PLATFORM_ADMIN_EMAIL || '').trim();
  const adminEmail =
    rawAdminEmail.includes('@')
      ? rawAdminEmail
      : 'thecornerstreams@gmail.com';

  const whatsappProvider = (process.env.WHATSAPP_PROVIDER || 'meta').toLowerCase();

  const hasMetaWhatsApp = !!(
    process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID
  );
  const hasTwilioWhatsApp = !!(
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_WHATSAPP_FROM
  );
  const isWhatsAppConfigured = hasMetaWhatsApp || hasTwilioWhatsApp;

  const hasGmailAppPass = !!(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);
  const hasSmtp = !!(
    process.env.SMTP_HOST &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS
  );
  const isGmailConfigured = hasGmailAppPass || hasSmtp;

  return {
    adminWhatsApp,
    adminEmail,
    whatsapp: {
      provider: whatsappProvider,
      isConfigured: isWhatsAppConfigured,
      activeService: hasMetaWhatsApp
        ? 'Meta WhatsApp Business Cloud API'
        : hasTwilioWhatsApp
        ? 'Twilio WhatsApp API'
        : 'Not Configured (Requires WHATSAPP_ACCESS_TOKEN & WHATSAPP_PHONE_NUMBER_ID)',
      hasMetaCredentials: hasMetaWhatsApp,
      hasTwilioCredentials: hasTwilioWhatsApp,
    },
    gmail: {
      isConfigured: isGmailConfigured,
      activeService: hasGmailAppPass
        ? `Gmail SMTP (${process.env.GMAIL_USER})`
        : hasSmtp
        ? `Custom SMTP (${process.env.SMTP_HOST})`
        : 'Not Configured (Requires GMAIL_APP_PASSWORD in environment)',
      senderEmail: process.env.GMAIL_USER || adminEmail,
    },
  };
}

/**
 * Sends a real WhatsApp message using authorized providers.
 * Strictly verifies provider responses and does NOT simulate delivery.
 */
async function sendWhatsAppMessage(
  recipientPhone: string,
  messageText: string
): Promise<{ success: boolean; provider: string; messageId?: string; error?: string }> {
  const normalizedRecipient = normalizeE164Phone(recipientPhone);
  if (!normalizedRecipient) {
    return {
      success: false,
      provider: 'none',
      error: 'Invalid recipient phone number. E.164 format is required.',
    };
  }

  const metaToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const metaPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  // 1. Meta WhatsApp Business Cloud API
  if (metaToken && metaPhoneId) {
    try {
      const url = `https://graph.facebook.com/v21.0/${metaPhoneId}/messages`;
      const cleanPhone = normalizedRecipient.replace('+', '');
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${metaToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: cleanPhone,
          type: 'text',
          text: {
            preview_url: true,
            body: messageText,
          },
        }),
      });

      const data = (await res.json().catch(() => null)) as any;
      if (!res.ok) {
        const errorMsg =
          data?.error?.message || `Meta WhatsApp Cloud API error (HTTP ${res.status})`;
        return {
          success: false,
          provider: 'meta-cloud-api',
          error: errorMsg,
        };
      }

      const messageId = data?.messages?.[0]?.id || `meta_msg_${Date.now()}`;
      return {
        success: true,
        provider: 'meta-cloud-api',
        messageId,
      };
    } catch (err: any) {
      return {
        success: false,
        provider: 'meta-cloud-api',
        error: err?.message || 'Network exception communicating with Meta WhatsApp Cloud API.',
      };
    }
  }

  // 2. Twilio WhatsApp API
  const twilioSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioAuth = process.env.TWILIO_AUTH_TOKEN;
  const twilioFrom = process.env.TWILIO_WHATSAPP_FROM || '+14155238886';

  if (twilioSid && twilioAuth) {
    try {
      const url = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`;
      const authHeader = 'Basic ' + Buffer.from(`${twilioSid}:${twilioAuth}`).toString('base64');
      const params = new URLSearchParams();
      params.append('From', twilioFrom.startsWith('whatsapp:') ? twilioFrom : `whatsapp:${twilioFrom}`);
      params.append(
        'To',
        normalizedRecipient.startsWith('whatsapp:')
          ? normalizedRecipient
          : `whatsapp:${normalizedRecipient}`
      );
      params.append('Body', messageText);

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      const data = (await res.json().catch(() => null)) as any;
      if (!res.ok) {
        return {
          success: false,
          provider: 'twilio-whatsapp',
          error: data?.message || `Twilio error (HTTP ${res.status})`,
        };
      }

      return {
        success: true,
        provider: 'twilio-whatsapp',
        messageId: data?.sid,
      };
    } catch (err: any) {
      return {
        success: false,
        provider: 'twilio-whatsapp',
        error: err?.message || 'Network exception communicating with Twilio API.',
      };
    }
  }

  // 3. Neither provider configured
  return {
    success: false,
    provider: 'unconfigured',
    error:
      'WhatsApp Business credentials missing in environment (WHATSAPP_ACCESS_TOKEN & WHATSAPP_PHONE_NUMBER_ID or TWILIO credentials).',
  };
}

/**
 * Sends a real Gmail / SMTP email message using nodemailer.
 * Strictly verifies provider responses and does NOT simulate delivery.
 */
async function sendGmailMessage(
  recipientEmail: string,
  subject: string,
  htmlContent: string,
  textContent: string
): Promise<{ success: boolean; provider: string; messageId?: string; error?: string }> {
  if (!recipientEmail || !recipientEmail.includes('@')) {
    return {
      success: false,
      provider: 'none',
      error: 'Invalid recipient email address.',
    };
  }

  const rawUser = (process.env.GMAIL_USER || process.env.PLATFORM_ADMIN_EMAIL || '').trim();
  const gmailUser = rawUser.includes('@') ? rawUser : 'thecornerstreams@gmail.com';
  const gmailPass = (process.env.GMAIL_APP_PASSWORD || '').trim().replace(/\s+/g, '');
  const smtpHost = process.env.SMTP_HOST;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const senderName = process.env.GMAIL_SENDER_NAME || 'CornerBrief Healthcare Platform';

  let transporter: Transporter | null = null;
  let providerName = 'unconfigured';

  if (gmailUser && gmailPass) {
    providerName = 'nodemailer-gmail';
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailUser,
        pass: gmailPass,
      },
    });
  } else if (smtpHost && smtpUser && smtpPass) {
    providerName = 'nodemailer-smtp';
    transporter = nodemailer.createTransport({
      host: smtpHost,
      port: parseInt(process.env.SMTP_PORT || '465', 10),
      secure: (process.env.SMTP_PORT || '465') === '465',
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });
  }

  if (!transporter) {
    return {
      success: false,
      provider: 'unconfigured',
      error:
        'Gmail delivery credentials missing in environment (GMAIL_USER & GMAIL_APP_PASSWORD required).',
    };
  }

  try {
    const info = await transporter.sendMail({
      from: `"${senderName}" <${gmailUser || 'noreply@cornerbrief.ng'}>`,
      to: recipientEmail,
      subject,
      text: textContent,
      html: htmlContent,
    });

    return {
      success: true,
      provider: providerName,
      messageId: info.messageId,
    };
  } catch (err: any) {
    return {
      success: false,
      provider: providerName,
      error: err?.message || 'SMTP transmission failure.',
    };
  }
}

/**
 * Records a notification delivery event to memory and attempts Firestore sync
 */
async function recordNotification(
  record: NotificationRecord,
  adminDb?: any
): Promise<NotificationRecord> {
  // 1. Commit to in-memory store
  inMemoryNotifications.set(record.id, record);

  // 2. Attempt Firestore persistence
  if (adminDb) {
    try {
      await adminDb.collection('notifications').doc(record.id).set(record);
    } catch (err: any) {
      // Diagnostic log for server operators; does NOT interrupt service
      console.warn('Notification Firestore sync notice:', err?.message || err);
    }
  }

  return record;
}

/**
 * Checks deduplication key to prevent rapid duplicate transmissions
 */
function isDuplicateTransmission(key: string, cooldownMs = 180000): boolean {
  const lastTime = notificationDeduplicationMap.get(key);
  if (!lastTime) return false;
  return Date.now() - lastTime < cooldownMs;
}

function markTransmissionKey(key: string) {
  notificationDeduplicationMap.set(key, Date.now());
  if (notificationDeduplicationMap.size > 2000) {
    const oldestKey = notificationDeduplicationMap.keys().next().value;
    if (oldestKey) notificationDeduplicationMap.delete(oldestKey);
  }
}

/**
 * Dispatches all notifications for a newly submitted hospital registration:
 * 1. Platform Admin WhatsApp alert
 * 2. Platform Admin Gmail alert
 * 3. Hospital Contact WhatsApp confirmation
 * 4. Hospital Contact Gmail confirmation
 */
export async function notifyNewFacilityRegistration(
  payload: NotificationPayload,
  adminDb?: any,
  baseUrl = 'https://ais-dev-2lmibzlcblr4gj4hfdoxra-900563531568.europe-west2.run.app',
  forceRetry = false
): Promise<NotificationDispatchResult[]> {
  const config = getNotificationConfig();
  const results: NotificationDispatchResult[] = [];
  const appUrl = (process.env.APP_URL || baseUrl).replace(/\/$/, '');
  const reviewUrl = `${appUrl}/platform-admin/facility-registrations`;
  const hospitalStatusUrl = `${appUrl}/`;

  // --------------------------------------------------------------------------
  // A. Platform Admin WhatsApp Alert
  // --------------------------------------------------------------------------
  const adminWhatsAppRecipient = config.adminWhatsApp;
  const adminWhatsAppKey = `${payload.facilityId}_FACILITY_REGISTERED_ADMIN_WHATSAPP`;

  if (forceRetry || !isDuplicateTransmission(adminWhatsAppKey)) {
    const adminWhatsAppBody =
      `🏥 *NEW HOSPITAL REGISTRATION AWAITING VERIFICATION*\n\n` +
      `A new healthcare organization has registered on CornerBrief and requires administrative verification before its clinical workspace can be activated.\n\n` +
      `• *Hospital Name:* ${payload.facilityName}\n` +
      `• *Facility Type:* ${payload.facilityType}\n` +
      `• *Assigned Code:* ${payload.facilityCode}\n` +
      `• *Location:* ${payload.location}\n` +
      `• *Contact Person:* ${payload.contactName}\n` +
      `• *Contact Phone:* ${payload.contactPhone}\n` +
      `• *Registration Email:* ${payload.contactEmail}\n` +
      `• *Submitted At:* ${payload.createdAt}\n` +
      `• *Current Status:* Pending Verification\n\n` +
      `👉 *Review & Approve Application:*\n${reviewUrl}\n\n` +
      `_CornerBrief Central Multi-Tenant Platform_`;

    const res = await sendWhatsAppMessage(adminWhatsAppRecipient, adminWhatsAppBody);
    markTransmissionKey(adminWhatsAppKey);

    const recordId = `notif_adm_wa_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const record: NotificationRecord = {
      id: recordId,
      eventType: 'FACILITY_REGISTERED_ADMIN',
      channel: 'WHATSAPP',
      recipient: adminWhatsAppRecipient,
      facilityId: payload.facilityId,
      facilityCode: payload.facilityCode,
      status: res.success ? 'SENT' : res.provider === 'unconfigured' ? 'CONFIG_MISSING' : 'FAILED',
      provider: res.provider,
      providerMessageId: res.messageId,
      error: res.error,
      metadata: {
        facilityName: payload.facilityName,
        reviewUrl,
      },
      createdAt: new Date().toISOString(),
      deliveredAt: res.success ? new Date().toISOString() : undefined,
    };

    await recordNotification(record, adminDb);
    results.push(record as NotificationDispatchResult);
  }

  // --------------------------------------------------------------------------
  // B. Platform Admin Gmail Notification
  // --------------------------------------------------------------------------
  const adminEmailRecipient = config.adminEmail;
  const adminEmailKey = `${payload.facilityId}_FACILITY_REGISTERED_ADMIN_GMAIL`;

  if (forceRetry || !isDuplicateTransmission(adminEmailKey)) {
    const adminSubject = `[CornerBrief Verification Required] New Hospital Registration: ${payload.facilityName} (${payload.facilityCode})`;
    const adminText =
      `NEW HOSPITAL REGISTRATION AWAITING VERIFICATION\n\n` +
      `Hospital Name: ${payload.facilityName}\n` +
      `Facility Type: ${payload.facilityType}\n` +
      `Assigned Code: ${payload.facilityCode}\n` +
      `Location: ${payload.location}\n` +
      `Contact Administrator: ${payload.contactName}\n` +
      `Contact Phone: ${payload.contactPhone}\n` +
      `Contact Email: ${payload.contactEmail}\n` +
      `Submitted At: ${payload.createdAt}\n` +
      `Status: Pending Verification\n\n` +
      `Review this application in the Platform Admin Portal:\n${reviewUrl}\n`;

    const adminHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; padding: 24px;">
        <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.04);">
          <div style="background-color: #0b1f33; padding: 20px 24px; color: #ffffff;">
            <div style="font-size: 11px; font-weight: 700; letter-spacing: 0.1em; color: #38bdf8; text-transform: uppercase;">CornerBrief Central Platform Administration</div>
            <h1 style="margin: 6px 0 0; font-size: 18px; font-weight: 700; color: #ffffff;">New Hospital Registration Pending Verification</h1>
          </div>
          <div style="padding: 24px;">
            <p style="font-size: 14px; color: #334155; line-height: 1.5; margin-top: 0;">
              A healthcare organization has registered on CornerBrief and is awaiting review. Its workspace is held in <strong>Pending</strong> status until approved by a Platform Administrator.
            </p>
            <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin: 20px 0; border: 1px solid #e2e8f0;">
              <tr style="background: #f1f5f9; border-bottom: 1px solid #e2e8f0;"><td style="padding: 10px 14px; font-weight: 600; color: #475569; width: 35%;">Hospital Name</td><td style="padding: 10px 14px; color: #0f172a; font-weight: 700;">${payload.facilityName}</td></tr>
              <tr style="border-bottom: 1px solid #e2e8f0;"><td style="padding: 10px 14px; font-weight: 600; color: #475569;">Facility Type</td><td style="padding: 10px 14px; color: #0f172a;">${payload.facilityType}</td></tr>
              <tr style="border-bottom: 1px solid #e2e8f0;"><td style="padding: 10px 14px; font-weight: 600; color: #475569;">Hospital Code</td><td style="padding: 10px 14px; color: #1769e0; font-weight: 700; font-family: monospace;">${payload.facilityCode}</td></tr>
              <tr style="border-bottom: 1px solid #e2e8f0;"><td style="padding: 10px 14px; font-weight: 600; color: #475569;">Location</td><td style="padding: 10px 14px; color: #0f172a;">${payload.location}</td></tr>
              <tr style="border-bottom: 1px solid #e2e8f0;"><td style="padding: 10px 14px; font-weight: 600; color: #475569;">Primary Admin</td><td style="padding: 10px 14px; color: #0f172a;">${payload.contactName}</td></tr>
              <tr style="border-bottom: 1px solid #e2e8f0;"><td style="padding: 10px 14px; font-weight: 600; color: #475569;">Contact WhatsApp</td><td style="padding: 10px 14px; color: #0f172a;">${payload.contactPhone}</td></tr>
              <tr style="border-bottom: 1px solid #e2e8f0;"><td style="padding: 10px 14px; font-weight: 600; color: #475569;">Contact Email</td><td style="padding: 10px 14px; color: #0f172a;">${payload.contactEmail}</td></tr>
              <tr><td style="padding: 10px 14px; font-weight: 600; color: #475569;">Submission Time</td><td style="padding: 10px 14px; color: #0f172a;">${payload.createdAt}</td></tr>
            </table>
            <div style="text-align: center; margin: 28px 0 16px;">
              <a href="${reviewUrl}" style="background-color: #1769e0; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-size: 13px; font-weight: 700; display: inline-block;">
                Open Application in Review Queue →
              </a>
            </div>
            <p style="font-size: 11px; color: #64748b; text-align: center; margin-top: 16px;">
              Direct link: <a href="${reviewUrl}" style="color: #1769e0;">${reviewUrl}</a>
            </p>
          </div>
        </div>
      </div>
    `;

    const res = await sendGmailMessage(adminEmailRecipient, adminSubject, adminHtml, adminText);
    markTransmissionKey(adminEmailKey);

    const recordId = `notif_adm_gm_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const record: NotificationRecord = {
      id: recordId,
      eventType: 'FACILITY_REGISTERED_ADMIN',
      channel: 'GMAIL',
      recipient: adminEmailRecipient,
      facilityId: payload.facilityId,
      facilityCode: payload.facilityCode,
      status: res.success ? 'SENT' : res.provider === 'unconfigured' ? 'CONFIG_MISSING' : 'FAILED',
      provider: res.provider,
      providerMessageId: res.messageId,
      error: res.error,
      metadata: {
        facilityName: payload.facilityName,
        reviewUrl,
      },
      createdAt: new Date().toISOString(),
      deliveredAt: res.success ? new Date().toISOString() : undefined,
    };

    await recordNotification(record, adminDb);
    results.push(record as NotificationDispatchResult);
  }

  // --------------------------------------------------------------------------
  // C. Hospital Contact WhatsApp Confirmation
  // --------------------------------------------------------------------------
  const hospitalPhone = payload.contactPhone;
  const hospitalPhoneKey = `${payload.facilityId}_FACILITY_CONFIRMATION_WHATSAPP`;

  if (hospitalPhone && (forceRetry || !isDuplicateTransmission(hospitalPhoneKey))) {
    const hospitalWhatsAppBody =
      `🏥 *CORNERBRIEF HOSPITAL REGISTRATION CONFIRMATION*\n\n` +
      `Dear ${payload.contactName},\n\n` +
      `Your healthcare facility onboarding submission for *${payload.facilityName}* has been received successfully.\n\n` +
      `• *Registration Reference:* ${payload.facilityId}\n` +
      `• *Assigned Hospital Code:* ${payload.facilityCode}\n` +
      `• *Current Status:* Awaiting Platform Administrator Verification\n\n` +
      `_What happens next?_\n` +
      `Our clinical platform governance team is currently reviewing your facility details. As soon as your workspace is verified and approved, you will receive an approval alert with complete instructions to log in and configure your staff accounts.\n\n` +
      `🔗 *Return to CornerBrief to check your status:*\n${hospitalStatusUrl}\n\n` +
      `Thank you for choosing CornerBrief for clinical excellence.\n` +
      `_CornerBrief Healthcare Platform_`;

    const res = await sendWhatsAppMessage(hospitalPhone, hospitalWhatsAppBody);
    markTransmissionKey(hospitalPhoneKey);

    const recordId = `notif_hosp_wa_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const record: NotificationRecord = {
      id: recordId,
      eventType: 'FACILITY_REGISTERED_CONFIRMATION',
      channel: 'WHATSAPP',
      recipient: hospitalPhone,
      facilityId: payload.facilityId,
      facilityCode: payload.facilityCode,
      status: res.success ? 'SENT' : res.provider === 'unconfigured' ? 'CONFIG_MISSING' : 'FAILED',
      provider: res.provider,
      providerMessageId: res.messageId,
      error: res.error,
      metadata: {
        facilityName: payload.facilityName,
        statusUrl: hospitalStatusUrl,
      },
      createdAt: new Date().toISOString(),
      deliveredAt: res.success ? new Date().toISOString() : undefined,
    };

    await recordNotification(record, adminDb);
    results.push(record as NotificationDispatchResult);
  }

  // --------------------------------------------------------------------------
  // D. Hospital Contact Gmail Confirmation
  // --------------------------------------------------------------------------
  const hospitalEmail = payload.contactEmail;
  const hospitalEmailKey = `${payload.facilityId}_FACILITY_CONFIRMATION_GMAIL`;

  if (hospitalEmail && (forceRetry || !isDuplicateTransmission(hospitalEmailKey))) {
    const hospitalSubject = `Registration Received: ${payload.facilityName} (Reference: ${payload.facilityCode})`;
    const hospitalText =
      `Dear ${payload.contactName},\n\n` +
      `Your registration for ${payload.facilityName} has been received and is currently under review by our Platform Administration team.\n\n` +
      `Registration Reference: ${payload.facilityId}\n` +
      `Assigned Hospital Code: ${payload.facilityCode}\n` +
      `Status: Pending Verification\n\n` +
      `Once verified, you will receive an official approval notification with instructions for accessing your facility workspace.\n\n` +
      `Return to CornerBrief: ${hospitalStatusUrl}\n\n` +
      `CornerBrief Healthcare Platform`;

    const hospitalHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; padding: 24px;">
        <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.04);">
          <div style="background-color: #0b1f33; padding: 20px 24px; color: #ffffff;">
            <div style="font-size: 11px; font-weight: 700; letter-spacing: 0.1em; color: #38bdf8; text-transform: uppercase;">CornerBrief Healthcare Platform</div>
            <h1 style="margin: 6px 0 0; font-size: 18px; font-weight: 700; color: #ffffff;">Hospital Registration Received</h1>
          </div>
          <div style="padding: 24px;">
            <p style="font-size: 14px; color: #334155; line-height: 1.5; margin-top: 0;">
              Dear <strong>${payload.contactName}</strong>,
            </p>
            <p style="font-size: 14px; color: #334155; line-height: 1.5;">
              Thank you for registering <strong>${payload.facilityName}</strong> on the CornerBrief Healthcare Information Platform. Your application has been successfully submitted and is currently awaiting verification.
            </p>
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;">
              <div style="font-size: 12px; color: #64748b; margin-bottom: 4px;">Assigned Hospital Code</div>
              <div style="font-size: 20px; font-weight: 800; font-family: monospace; color: #1769e0;">${payload.facilityCode}</div>
              <div style="font-size: 11px; color: #94a3b8; margin-top: 4px;">Application Reference: ${payload.facilityId}</div>
            </div>
            <div style="border-left: 4px solid #f59e0b; padding: 10px 14px; background: #fffbeb; border-radius: 0 6px 6px 0; margin-bottom: 20px;">
              <div style="font-size: 12px; font-weight: 700; color: #92400e;">Status: Pending Platform Review</div>
              <p style="font-size: 12px; color: #b45309; margin: 4px 0 0;">
                Your workspace is queued for compliance verification. You will receive an immediate notification as soon as a Platform Administrator approves and activates your facility.
              </p>
            </div>
            <div style="text-align: center; margin: 24px 0 16px;">
              <a href="${hospitalStatusUrl}" style="background-color: #0b1f33; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-size: 13px; font-weight: 700; display: inline-block;">
                Visit CornerBrief Public Portal →
              </a>
            </div>
            <p style="font-size: 11px; color: #94a3b8; text-align: center; margin-top: 20px; border-top: 1px solid #e2e8f0; pt-16px;">
              &copy; 2026 CornerBrief. Modern Healthcare Infrastructure.
            </p>
          </div>
        </div>
      </div>
    `;

    const res = await sendGmailMessage(hospitalEmail, hospitalSubject, hospitalHtml, hospitalText);
    markTransmissionKey(hospitalEmailKey);

    const recordId = `notif_hosp_gm_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const record: NotificationRecord = {
      id: recordId,
      eventType: 'FACILITY_REGISTERED_CONFIRMATION',
      channel: 'GMAIL',
      recipient: hospitalEmail,
      facilityId: payload.facilityId,
      facilityCode: payload.facilityCode,
      status: res.success ? 'SENT' : res.provider === 'unconfigured' ? 'CONFIG_MISSING' : 'FAILED',
      provider: res.provider,
      providerMessageId: res.messageId,
      error: res.error,
      metadata: {
        facilityName: payload.facilityName,
        statusUrl: hospitalStatusUrl,
      },
      createdAt: new Date().toISOString(),
      deliveredAt: res.success ? new Date().toISOString() : undefined,
    };

    await recordNotification(record, adminDb);
    results.push(record as NotificationDispatchResult);
  }

  return results;
}

/**
 * Dispatches notifications when Platform Admin approves a hospital registration:
 * 1. Hospital Contact WhatsApp approval notification
 * 2. Hospital Contact Gmail approval notification
 */
export async function notifyFacilityApproved(
  payload: NotificationPayload,
  adminDb?: any,
  baseUrl = 'https://ais-dev-2lmibzlcblr4gj4hfdoxra-900563531568.europe-west2.run.app',
  forceRetry = false
): Promise<NotificationDispatchResult[]> {
  const results: NotificationDispatchResult[] = [];
  const appUrl = (process.env.APP_URL || baseUrl).replace(/\/$/, '');
  const loginUrl = `${appUrl}/`;

  // 1. WhatsApp Approval Alert to Hospital Contact
  const hospitalPhone = payload.contactPhone;
  const waKey = `${payload.facilityId}_FACILITY_APPROVED_WHATSAPP`;

  if (hospitalPhone && (forceRetry || !isDuplicateTransmission(waKey))) {
    const waText =
      `🎉 *CORNERBRIEF HOSPITAL WORKSPACE APPROVED & ACTIVATED*\n\n` +
      `Dear ${payload.contactName},\n\n` +
      `We are pleased to inform you that *${payload.facilityName}* has been officially verified and approved by the Platform Administration team.\n\n` +
      `• *Hospital Code:* ${payload.facilityCode}\n` +
      `• *Workspace Status:* Active\n` +
      `• *Facility Type:* ${payload.facilityType}\n\n` +
      `🔑 *Staff & Facility Admin Sign In:*\n` +
      `1. Open the login page: ${loginUrl}\n` +
      `2. Enter your Hospital Code: *${payload.facilityCode}*\n` +
      `3. Enter your assigned staff username and password\n\n` +
      `📋 *Next Steps:*\n` +
      `Your Facility Administrator can now access Settings to configure clinical units and provision clinical team credentials.\n\n` +
      `Welcome to the CornerBrief Healthcare Network!`;

    const res = await sendWhatsAppMessage(hospitalPhone, waText);
    markTransmissionKey(waKey);

    const recordId = `notif_appr_wa_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const record: NotificationRecord = {
      id: recordId,
      eventType: 'FACILITY_APPROVED',
      channel: 'WHATSAPP',
      recipient: hospitalPhone,
      facilityId: payload.facilityId,
      facilityCode: payload.facilityCode,
      status: res.success ? 'SENT' : res.provider === 'unconfigured' ? 'CONFIG_MISSING' : 'FAILED',
      provider: res.provider,
      providerMessageId: res.messageId,
      error: res.error,
      metadata: {
        facilityName: payload.facilityName,
        loginUrl,
      },
      createdAt: new Date().toISOString(),
      deliveredAt: res.success ? new Date().toISOString() : undefined,
    };

    await recordNotification(record, adminDb);
    results.push(record as NotificationDispatchResult);
  }

  // 2. Gmail Approval Email to Hospital Contact
  const hospitalEmail = payload.contactEmail;
  const gmKey = `${payload.facilityId}_FACILITY_APPROVED_GMAIL`;

  if (hospitalEmail && (forceRetry || !isDuplicateTransmission(gmKey))) {
    const subject = `🎉 Workspace Approved: ${payload.facilityName} is now Active on CornerBrief`;
    const textContent =
      `Dear ${payload.contactName},\n\n` +
      `We are pleased to inform you that ${payload.facilityName} has been verified and approved by Platform Administration.\n\n` +
      `Hospital Code: ${payload.facilityCode}\n` +
      `Status: Active\n\n` +
      `Log in to your workspace at: ${loginUrl}\n` +
      `Enter your Hospital Code (${payload.facilityCode}) followed by your staff username and password.\n\n` +
      `CornerBrief Healthcare Platform`;

    const htmlContent = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; padding: 24px;">
        <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.04);">
          <div style="background-color: #065f46; padding: 24px; color: #ffffff;">
            <div style="font-size: 11px; font-weight: 700; letter-spacing: 0.1em; color: #a7f3d0; text-transform: uppercase;">Official Verification Notice</div>
            <h1 style="margin: 6px 0 0; font-size: 20px; font-weight: 800; color: #ffffff;">Workspace Approved & Activated</h1>
          </div>
          <div style="padding: 24px;">
            <p style="font-size: 14px; color: #334155; line-height: 1.5; margin-top: 0;">
              Dear <strong>${payload.contactName}</strong>,
            </p>
            <p style="font-size: 14px; color: #334155; line-height: 1.5;">
              Congratulations! Your facility <strong>${payload.facilityName}</strong> has completed administrative verification. Your dedicated healthcare workspace is now <strong>Active</strong>.
            </p>
            <div style="background-color: #f0fdf4; border: 2px solid #86efac; border-radius: 10px; padding: 18px; margin: 20px 0; text-align: center;">
              <div style="font-size: 12px; font-weight: 700; color: #166534; text-transform: uppercase; letter-spacing: 0.05em;">Your Official Hospital Code</div>
              <div style="font-size: 26px; font-weight: 900; font-family: monospace; color: #15803d; margin: 6px 0;">${payload.facilityCode}</div>
              <div style="font-size: 12px; color: #166534;">Use this code to sign in to your dedicated hospital portal.</div>
            </div>
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
              <h3 style="margin: 0 0 8px; font-size: 13px; font-weight: 700; color: #0f172a;">How to Access Your Workspace:</h3>
              <ol style="margin: 0; padding-left: 20px; font-size: 13px; color: #475569; line-height: 1.6;">
                <li>Visit the hospital sign-in page: <a href="${loginUrl}" style="color: #1769e0; font-weight: 600;">CornerBrief Sign-In</a></li>
                <li>Enter your Hospital Code: <strong>${payload.facilityCode}</strong></li>
                <li>Enter your assigned Administrator username and password</li>
              </ol>
            </div>
            <div style="text-align: center; margin: 28px 0 16px;">
              <a href="${loginUrl}" style="background-color: #15803d; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-size: 14px; font-weight: 700; display: inline-block;">
                Launch Hospital Workspace →
              </a>
            </div>
            <p style="font-size: 11px; color: #94a3b8; text-align: center; margin-top: 24px; border-top: 1px solid #e2e8f0; padding-top: 16px;">
              &copy; 2026 CornerBrief Healthcare Platform. All clinical rights reserved.
            </p>
          </div>
        </div>
      </div>
    `;

    const res = await sendGmailMessage(hospitalEmail, subject, htmlContent, textContent);
    markTransmissionKey(gmKey);

    const recordId = `notif_appr_gm_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const record: NotificationRecord = {
      id: recordId,
      eventType: 'FACILITY_APPROVED',
      channel: 'GMAIL',
      recipient: hospitalEmail,
      facilityId: payload.facilityId,
      facilityCode: payload.facilityCode,
      status: res.success ? 'SENT' : res.provider === 'unconfigured' ? 'CONFIG_MISSING' : 'FAILED',
      provider: res.provider,
      providerMessageId: res.messageId,
      error: res.error,
      metadata: {
        facilityName: payload.facilityName,
        loginUrl,
      },
      createdAt: new Date().toISOString(),
      deliveredAt: res.success ? new Date().toISOString() : undefined,
    };

    await recordNotification(record, adminDb);
    results.push(record as NotificationDispatchResult);
  }

  return results;
}

/**
 * Dispatches notifications when Platform Admin rejects a hospital application
 */
export async function notifyFacilityRejected(
  payload: NotificationPayload,
  adminDb?: any,
  baseUrl = 'https://ais-dev-2lmibzlcblr4gj4hfdoxra-900563531568.europe-west2.run.app',
  forceRetry = false
): Promise<NotificationDispatchResult[]> {
  const results: NotificationDispatchResult[] = [];
  const appUrl = (process.env.APP_URL || baseUrl).replace(/\/$/, '');
  const portalUrl = `${appUrl}/`;
  const reason = payload.rejectionReason || 'Registration requirements not met.';

  // 1. WhatsApp Rejection Alert
  const hospitalPhone = payload.contactPhone;
  const waKey = `${payload.facilityId}_FACILITY_REJECTED_WHATSAPP`;

  if (hospitalPhone && (forceRetry || !isDuplicateTransmission(waKey))) {
    const waText =
      `⚠️ *CORNERBRIEF REGISTRATION STATUS UPDATE*\n\n` +
      `Dear ${payload.contactName},\n\n` +
      `Your registration application for *${payload.facilityName}* (Ref: ${payload.facilityCode}) was reviewed and could not be approved at this time.\n\n` +
      `• *Status:* Rejected\n` +
      `• *Reason:* ${reason}\n\n` +
      `If you believe this decision was made in error or wish to submit updated documentation, please contact our Platform Administration team.\n\n` +
      `Portal Link: ${portalUrl}\n` +
      `_CornerBrief Healthcare Platform_`;

    const res = await sendWhatsAppMessage(hospitalPhone, waText);
    markTransmissionKey(waKey);

    const recordId = `notif_rej_wa_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const record: NotificationRecord = {
      id: recordId,
      eventType: 'FACILITY_REJECTED',
      channel: 'WHATSAPP',
      recipient: hospitalPhone,
      facilityId: payload.facilityId,
      facilityCode: payload.facilityCode,
      status: res.success ? 'SENT' : res.provider === 'unconfigured' ? 'CONFIG_MISSING' : 'FAILED',
      provider: res.provider,
      providerMessageId: res.messageId,
      error: res.error,
      metadata: {
        facilityName: payload.facilityName,
        reason,
      },
      createdAt: new Date().toISOString(),
      deliveredAt: res.success ? new Date().toISOString() : undefined,
    };

    await recordNotification(record, adminDb);
    results.push(record as NotificationDispatchResult);
  }

  // 2. Gmail Rejection Alert
  const hospitalEmail = payload.contactEmail;
  const gmKey = `${payload.facilityId}_FACILITY_REJECTED_GMAIL`;

  if (hospitalEmail && (forceRetry || !isDuplicateTransmission(gmKey))) {
    const subject = `Registration Status Update: ${payload.facilityName} (Code: ${payload.facilityCode})`;
    const textContent =
      `Dear ${payload.contactName},\n\n` +
      `Your registration for ${payload.facilityName} has been reviewed by Platform Administration.\n\n` +
      `Status: Rejected\n` +
      `Reason: ${reason}\n\n` +
      `Please contact Platform Administration if you wish to appeal or provide updated credentials.\n\n` +
      `CornerBrief Healthcare Platform`;

    const htmlContent = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; padding: 24px;">
        <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden;">
          <div style="background-color: #991b1b; padding: 20px 24px; color: #ffffff;">
            <h1 style="margin: 0; font-size: 18px; font-weight: 700;">Registration Review Notice</h1>
          </div>
          <div style="padding: 24px;">
            <p style="font-size: 14px; color: #334155; margin-top: 0;">Dear <strong>${payload.contactName}</strong>,</p>
            <p style="font-size: 14px; color: #334155;">
              Following review by our platform compliance team, your registration application for <strong>${payload.facilityName}</strong> was not approved.
            </p>
            <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin: 20px 0;">
              <div style="font-size: 12px; font-weight: 700; color: #991b1b; margin-bottom: 4px;">Rejection Reason</div>
              <div style="font-size: 13px; color: #7f1d1d; line-height: 1.5;">${reason}</div>
            </div>
            <p style="font-size: 12px; color: #64748b;">
              You may submit updated compliance documents or address the issues noted above by contacting the CornerBrief Platform Administration desk.
            </p>
          </div>
        </div>
      </div>
    `;

    const res = await sendGmailMessage(hospitalEmail, subject, htmlContent, textContent);
    markTransmissionKey(gmKey);

    const recordId = `notif_rej_gm_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const record: NotificationRecord = {
      id: recordId,
      eventType: 'FACILITY_REJECTED',
      channel: 'GMAIL',
      recipient: hospitalEmail,
      facilityId: payload.facilityId,
      facilityCode: payload.facilityCode,
      status: res.success ? 'SENT' : res.provider === 'unconfigured' ? 'CONFIG_MISSING' : 'FAILED',
      provider: res.provider,
      providerMessageId: res.messageId,
      error: res.error,
      metadata: {
        facilityName: payload.facilityName,
        reason,
      },
      createdAt: new Date().toISOString(),
      deliveredAt: res.success ? new Date().toISOString() : undefined,
    };

    await recordNotification(record, adminDb);
    results.push(record as NotificationDispatchResult);
  }

  return results;
}

/**
 * Retries a single notification record by its ID
 */
export async function retryNotificationById(
  notificationId: string,
  adminDb?: any,
  baseUrl = 'https://ais-dev-2lmibzlcblr4gj4hfdoxra-900563531568.europe-west2.run.app'
): Promise<NotificationRecord | null> {
  const existing = inMemoryNotifications.get(notificationId);
  if (!existing) return null;

  const appUrl = (process.env.APP_URL || baseUrl).replace(/\/$/, '');
  const reviewUrl = `${appUrl}/platform-admin/facility-registrations`;

  let res: { success: boolean; provider: string; messageId?: string; error?: string };

  if (existing.channel === 'WHATSAPP') {
    const msg =
      existing.eventType === 'FACILITY_REGISTERED_ADMIN'
        ? `🏥 *NOTIFICATION RETRY: NEW HOSPITAL REGISTRATION*\nFacility: ${existing.metadata?.facilityName || existing.facilityId}\nReview: ${reviewUrl}`
        : existing.eventType === 'FACILITY_APPROVED'
        ? `🎉 *NOTIFICATION RETRY: WORKSPACE APPROVED*\nFacility: ${existing.metadata?.facilityName || existing.facilityId}\nHospital Code: ${existing.facilityCode}\nSign In: ${appUrl}/`
        : `⚠️ *NOTIFICATION RETRY: REGISTRATION STATUS UPDATE*\nFacility: ${existing.metadata?.facilityName || existing.facilityId}`;

    res = await sendWhatsAppMessage(existing.recipient, msg);
  } else {
    res = await sendGmailMessage(
      existing.recipient,
      `[Retried Notification] CornerBrief Update`,
      `<p>Notification update for ${existing.metadata?.facilityName || existing.facilityId}</p>`,
      `Notification update for ${existing.metadata?.facilityName || existing.facilityId}`
    );
  }

  existing.status = res.success ? 'SENT' : res.provider === 'unconfigured' ? 'CONFIG_MISSING' : 'FAILED';
  existing.provider = res.provider;
  existing.providerMessageId = res.messageId || existing.providerMessageId;
  existing.error = res.error;
  if (res.success) {
    existing.deliveredAt = new Date().toISOString();
  }

  await recordNotification(existing, adminDb);
  return existing;
}

/**
 * Persists runtime environment variables to .env file and process.env
 */
export function persistEnvVariables(updates: Record<string, string>) {
  for (const [k, v] of Object.entries(updates)) {
    process.env[k] = v;
  }
  try {
    const envPath = path.resolve(process.cwd(), '.env');
    const envMap: Record<string, string> = {};
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      const matches = content.matchAll(/([A-Za-z0-9_]+)=(?:"([^"]*)"|'([^']*)'|([^\r\n]*))/g);
      for (const m of matches) {
        const key = m[1];
        const val = m[2] ?? m[3] ?? m[4] ?? '';
        envMap[key] = val;
      }
    }
    for (const [k, v] of Object.entries(updates)) {
      envMap[k] = v;
    }
    const output =
      Object.entries(envMap)
        .map(([k, v]) => `${k}="${v}"`)
        .join('\n') + '\n';
    fs.writeFileSync(envPath, output);
  } catch (err) {
    console.warn('Failed to persist .env file:', err);
  }
}

/**
 * Performs a direct live test email dispatch using Google SMTP
 */
export async function sendDirectTestGmail(
  options: {
    appPassword?: string;
    recipientEmail?: string;
    senderUser?: string;
    saveConfig?: boolean;
  },
  adminDb?: any,
  baseUrl = 'https://ais-dev-2lmibzlcblr4gj4hfdoxra-900563531568.europe-west2.run.app'
): Promise<{
  success: boolean;
  provider: string;
  messageId?: string;
  error?: string;
  recipient: string;
  record?: NotificationRecord;
}> {
  const cleanPass = (options.appPassword || process.env.GMAIL_APP_PASSWORD || '').trim().replace(/\s+/g, '');
  const rawSender = (options.senderUser || process.env.GMAIL_USER || process.env.PLATFORM_ADMIN_EMAIL || '').trim();
  const senderUser = rawSender.includes('@') ? rawSender : 'thecornerstreams@gmail.com';
  const recipient = (options.recipientEmail || senderUser || 'thecornerstreams@gmail.com').trim();
  const appUrl = (process.env.APP_URL || baseUrl).replace(/\/$/, '');

  if (!cleanPass) {
    return {
      success: false,
      provider: 'unconfigured',
      recipient,
      error: 'Gmail 16-character App Password is required. Please supply it to test SMTP delivery.',
    };
  }

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: senderUser,
        pass: cleanPass,
      },
    });

    const timestamp = new Date().toLocaleString('en-US', { timeZone: 'Africa/Lagos' });
    const info = await transporter.sendMail({
      from: `"CornerBrief Healthcare Platform" <${senderUser}>`,
      to: recipient,
      subject: `[CornerBrief Platform] Live Gmail Verification Test — ${new Date().toLocaleTimeString()}`,
      text: `CornerBrief Central Platform Administration — Gmail Integration Test\n\nRecipient: ${recipient}\nSender: ${senderUser}\nTime: ${timestamp} WAT\nEnvironment: Live Central Backend\n\nYour 16-character Google App Password has been successfully authenticated by Google SMTP servers.\nAutomatic registration and approval alerts are now operational.\n\nPlatform Admin Portal: ${appUrl}/platform-admin`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
          <div style="background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%); padding: 24px 28px; color: #ffffff;">
            <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; opacity: 0.85;">CornerBrief Platform Verification</div>
            <h1 style="margin: 6px 0 0; font-size: 22px; font-weight: 700;">Live Gmail SMTP Verified ✓</h1>
          </div>
          <div style="padding: 28px; color: #1e293b; font-size: 14px; line-height: 1.6;">
            <p style="margin-top: 0;">This email confirms that your <strong>16-character Google App Password</strong> was verified and authenticated successfully by Google SMTP servers.</p>
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 13px;">
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 10px 0; color: #64748b; font-weight: 500;">Authorized Sender</td>
                <td style="padding: 10px 0; color: #0f172a; font-weight: 600; text-align: right;">${senderUser}</td>
              </tr>
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 10px 0; color: #64748b; font-weight: 500;">Delivered To</td>
                <td style="padding: 10px 0; color: #0f172a; font-weight: 600; text-align: right;">${recipient}</td>
              </tr>
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 10px 0; color: #64748b; font-weight: 500;">Verification Timestamp</td>
                <td style="padding: 10px 0; color: #0f172a; font-weight: 600; text-align: right;">${timestamp}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; color: #64748b; font-weight: 500;">Active Integration</td>
                <td style="padding: 10px 0; color: #059669; font-weight: 700; text-align: right;">Google SMTP (nodemailer-gmail)</td>
              </tr>
            </table>
            <div style="background: #f8fafc; border-left: 4px solid #0284c7; padding: 14px 18px; border-radius: 4px; margin: 24px 0;">
              <strong style="color: #0f172a;">Active Workflow Status:</strong><br />
              All newly registered facilities and verification reviews will automatically dispatch alerts to this email address in real time.
            </div>
            <div style="text-align: center; margin-top: 28px;">
              <a href="${appUrl}/platform-admin" style="background: #0284c7; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; display: inline-block;">Open Platform Admin Portal</a>
            </div>
          </div>
          <div style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 28px; text-align: center; font-size: 12px; color: #94a3b8;">
            CornerBrief Healthcare Platform Central Administration &bull; Automated System Verification
          </div>
        </div>
      `,
    });

    if (options.saveConfig !== false) {
      persistEnvVariables({
        GMAIL_USER: senderUser,
        GMAIL_APP_PASSWORD: cleanPass,
        PLATFORM_ADMIN_EMAIL: senderUser,
      });
    }

    const recordId = `notif_test_gm_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const record: NotificationRecord = {
      id: recordId,
      eventType: 'PLATFORM_METRICS_SYNC' as any,
      channel: 'GMAIL',
      recipient,
      facilityId: 'PLATFORM_ADMIN',
      facilityCode: 'ADMIN',
      status: 'SENT',
      provider: 'nodemailer-gmail',
      providerMessageId: info.messageId,
      metadata: {
        testType: 'MANUAL_TEST_PROBE',
        sender: senderUser,
      },
      createdAt: new Date().toISOString(),
      deliveredAt: new Date().toISOString(),
    };

    await recordNotification(record, adminDb);

    return {
      success: true,
      provider: 'nodemailer-gmail',
      messageId: info.messageId,
      recipient,
      record,
    };
  } catch (err: any) {
    const errorMsg = err?.message || 'Google SMTP connection rejected.';
    return {
      success: false,
      provider: 'nodemailer-gmail',
      recipient,
      error: errorMsg,
    };
  }
}

/**
 * Performs a direct live test WhatsApp dispatch using Meta Cloud API
 */
export async function sendDirectTestWhatsApp(
  options: {
    accessToken?: string;
    phoneNumberId?: string;
    recipientPhone?: string;
    saveConfig?: boolean;
  },
  adminDb?: any,
  baseUrl = 'https://ais-dev-2lmibzlcblr4gj4hfdoxra-900563531568.europe-west2.run.app'
): Promise<{
  success: boolean;
  provider: string;
  messageId?: string;
  error?: string;
  recipient: string;
  record?: NotificationRecord;
}> {
  const metaToken = (options.accessToken || process.env.WHATSAPP_ACCESS_TOKEN || '').trim();
  const metaPhoneId = (options.phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID || '').trim();
  const recipient = normalizeE164Phone((options.recipientPhone || process.env.PLATFORM_ADMIN_WHATSAPP || '+2348141880550').trim());
  const appUrl = (process.env.APP_URL || baseUrl).replace(/\/$/, '');

  if (!metaToken || !metaPhoneId) {
    return {
      success: false,
      provider: 'unconfigured',
      recipient,
      error: 'WhatsApp Business credentials missing (WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID required).',
    };
  }

  const timestamp = new Date().toLocaleString('en-US', { timeZone: 'Africa/Lagos' });
  const testText = `🏥 *CORNERBRIEF PLATFORM — WHATSAPP NOTIFICATION TEST*\n\nStatus: Live Connection Verified\nRecipient: ${recipient}\nTimestamp: ${timestamp} WAT\nEnvironment: Central Backend\n\nAutomated hospital registration and approval alerts are operational.\n\nPortal: ${appUrl}/platform-admin`;

  try {
    const url = `https://graph.facebook.com/v21.0/${metaPhoneId}/messages`;
    const cleanPhone = recipient.replace('+', '');
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${metaToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: cleanPhone,
        type: 'text',
        text: { preview_url: true, body: testText },
      }),
    });

    const data = (await res.json().catch(() => null)) as any;
    if (!res.ok) {
      return {
        success: false,
        provider: 'meta-cloud-api',
        recipient,
        error: data?.error?.message || `Meta Graph API error (HTTP ${res.status})`,
      };
    }

    const messageId = data?.messages?.[0]?.id || `meta_wa_${Date.now()}`;

    if (options.saveConfig !== false) {
      persistEnvVariables({
        WHATSAPP_ACCESS_TOKEN: metaToken,
        WHATSAPP_PHONE_NUMBER_ID: metaPhoneId,
        PLATFORM_ADMIN_WHATSAPP: recipient,
      });
    }

    const recordId = `notif_test_wa_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const record: NotificationRecord = {
      id: recordId,
      eventType: 'PLATFORM_METRICS_SYNC' as any,
      channel: 'WHATSAPP',
      recipient,
      facilityId: 'PLATFORM_ADMIN',
      facilityCode: 'ADMIN',
      status: 'SENT',
      provider: 'meta-cloud-api',
      providerMessageId: messageId,
      metadata: {
        testType: 'MANUAL_TEST_PROBE',
      },
      createdAt: new Date().toISOString(),
      deliveredAt: new Date().toISOString(),
    };

    await recordNotification(record, adminDb);

    return {
      success: true,
      provider: 'meta-cloud-api',
      messageId,
      recipient,
      record,
    };
  } catch (err: any) {
    return {
      success: false,
      provider: 'meta-cloud-api',
      recipient,
      error: err?.message || 'Network exception communicating with Meta Graph API.',
    };
  }
}

