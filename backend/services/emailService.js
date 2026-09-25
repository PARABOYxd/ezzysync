const { google } = require('googleapis');
const gmailApiService = require('./gmailApiService');
const logger = require('../utils/logger').child({ module: 'email' });

let nodemailer;
try { nodemailer = require('nodemailer'); } catch (_) { nodemailer = null; }

// SMTP is opt-in: only attempted when SMTP_HOST is actually set (e.g. once
// the app moves off a Render free instance, which blocks outbound SMTP
// ports 25/465/587 and makes a normal SMTP transport hang for minutes).
// Short connect/socket timeouts mean a bad SMTP config fails fast instead
// of hanging, and Resend (HTTPS, never port-blocked) is always the
// fallback for system-level emails.
const SMTP_TIMEOUT_MS = 8000;

/**
 * Which ways out the mail actually has, checked at boot.
 *
 * A missing RESEND_API_KEY or EMAIL_FROM is invisible until someone tries to
 * sign up, and then it surfaces as a 502 on the very first thing a new
 * customer does. Registration stops working and nothing anywhere says why.
 * Reporting it at startup turns a silent misconfiguration into a line in the
 * deploy log.
 *
 * Gmail is not listed: it is per-tenant and only used for invoices, so its
 * absence is normal and says nothing about the platform's own mail.
 */
function getEmailRouteStatus() {
  const env = require('../config/env');
  const routes = [];

  if (!nodemailer) routes.push({ name: 'smtp', usable: false, reason: 'nodemailer not installed' });
  else if (!env.smtpHost) routes.push({ name: 'smtp', usable: false, reason: 'SMTP_HOST not set' });
  else if (!isSmtpConfigured(env)) routes.push({ name: 'smtp', usable: false, reason: 'SMTP_USER/SMTP_PASS incomplete or placeholder' });
  else routes.push({ name: 'smtp', usable: true, reason: `via ${env.smtpHost}` });

  if (!env.resendApiKey) routes.push({ name: 'resend', usable: false, reason: 'RESEND_API_KEY not set' });
  else if (!env.emailFrom) routes.push({ name: 'resend', usable: false, reason: 'EMAIL_FROM not set' });
  else if (env.emailFrom.includes('your-')) routes.push({ name: 'resend', usable: false, reason: 'EMAIL_FROM is still the placeholder' });
  else routes.push({ name: 'resend', usable: true, reason: `from ${env.emailFrom}` });

  return { routes, anyUsable: routes.some((r) => r.usable) };
}

function isSmtpConfigured(env) {
  return Boolean(env.smtpHost) && Boolean(env.smtpUser) && !env.smtpUser.includes('your-') && env.smtpPass !== 'your_app_password';
}

async function sendMailViaSMTP({ to, subject, html, attachments = [] }) {
  const env = require('../config/env');
  if (!nodemailer || !isSmtpConfigured(env)) {
    return false; // not configured - caller falls back to Resend
  }
  const transporter = nodemailer.createTransport({
    host: env.smtpHost,
    port: Number(env.smtpPort || 587),
    secure: env.smtpSecure === 'true',
    auth: { user: env.smtpUser, pass: env.smtpPass },
    connectionTimeout: SMTP_TIMEOUT_MS,
    greetingTimeout: SMTP_TIMEOUT_MS,
    socketTimeout: SMTP_TIMEOUT_MS,
  });
  await transporter.sendMail({
    from: env.emailFrom || env.smtpUser,
    to,
    subject,
    html,
    // nodemailer has always supported these; they simply were not passed, so
    // an invoice sent over SMTP arrived with no PDF on it.
    ...(attachments.length && {
      attachments: attachments.map((a) => ({
        filename: a.filename,
        content: a.content,
        contentType: a.contentType,
      })),
    }),
  });
  return true;
}

// Resend (HTTPS API, port 443) is the default/fallback for system-level
// emails (registration OTP, password reset) - it isn't blocked on any
// Render tier, unlike SMTP.
async function sendMailViaResend({ to, subject, html, attachments = [] }) {
  const env = require('../config/env');
  if (!env.resendApiKey || !env.emailFrom || env.emailFrom.includes('your-')) {
    // Not configured. Returning false rather than undefined so a caller can
    // tell "did not send" apart from "sent" - the old silent return let the
    // invoice endpoint report success for an email that was never sent.
    logger.debug({ to, subject, html }, '[MOCK - Resend not configured] email not actually sent');
    return false;
  }
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: env.emailFrom,
      to,
      subject,
      html,
      ...(attachments.length > 0 && {
        attachments: attachments.map((a) => ({
          filename: a.filename,
          content: a.content.toString('base64'),
        })),
      }),
    }),
  });
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Resend API error ${response.status}: ${body}`);
  }
  return true;
}

/**
 * Sends one email, trying each configured route in turn.
 *
 * Gmail first, because a tenant who has connected it wants mail to leave from
 * their own address - that is the whole point of the integration. But it is
 * one option among three, not a requirement: it needs Google verification for
 * the gmail.send scope, and most tenants never connect it at all.
 *
 * SMTP used to be missing from this chain entirely, so an invoice fell from
 * Gmail straight to Resend - and with Resend unconfigured, into a silent
 * `return`. The endpoint then told the agent "Invoice emailed to ..." for a
 * message that was never sent. Nothing here fails quietly any more: if no
 * route works, this throws and the caller reports the failure honestly.
 */
async function sendMail({
  tenantId,
  to,
  subject,
  html,
  attachments = [],
}) {
  const failures = [];

  // 1. The tenant's own Gmail, when they have connected it.
  if (tenantId) {
    try {
      const auth = await gmailApiService.getAuthenticatedClient(tenantId);
      const gmail = google.gmail({ version: 'v1', auth });

      const boundary = 'invoice_boundary';
      const message = [
        `To: ${to}`,
        `Subject: ${subject}`,
        'MIME-Version: 1.0',
        `Content-Type: multipart/mixed; boundary="${boundary}"`,
        '',
        `--${boundary}`,
        'Content-Type: text/html; charset=UTF-8',
        '',
        html,
      ];

      for (const attachment of attachments) {
        message.push(
          `--${boundary}`,
          `Content-Type: ${attachment.contentType}`,
          'Content-Transfer-Encoding: base64',
          `Content-Disposition: attachment; filename="${attachment.filename}"`,
          '',
          attachment.content.toString('base64')
        );
      }
      message.push(`--${boundary}--`);

      const encodedMessage = Buffer.from(message.join('\n'))
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      await gmail.users.messages.send({
        userId: 'me',
        requestBody: { raw: encodedMessage },
      });
      return { sent: true, via: 'gmail' };
    } catch (err) {
      // Expected for the many tenants who never connected Gmail.
      failures.push(`gmail: ${err.message}`);
    }
  }

  // 2. The platform's own SMTP account.
  try {
    if (await sendMailViaSMTP({ to, subject, html, attachments })) {
      return { sent: true, via: 'smtp' };
    }
    failures.push('smtp: not configured');
  } catch (err) {
    failures.push(`smtp: ${err.message}`);
  }

  // 3. Resend, which is not blocked on hosts that close SMTP ports.
  try {
    if (await sendMailViaResend({ to, subject, html, attachments })) {
      return { sent: true, via: 'resend' };
    }
    failures.push('resend: not configured');
  } catch (err) {
    failures.push(`resend: ${err.message}`);
  }

  logger.error({ to, subject, failures }, 'Every email route failed');
  throw new Error(`Could not send the email. Routes tried: ${failures.join('; ')}`);
}

async function sendOTPEmail({ tenantId, to, otp, subject: customSubject }) {
  const subject = customSubject || 'Your One-Time Password (OTP)';
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#f8fafc;border-radius:12px">
      <h2 style="color:#1e293b;margin-bottom:8px">Your Verification Code</h2>
      <p style="color:#64748b;font-size:14px">Use this OTP to complete your action. It expires in 10 minutes.</p>
      <div style="background:#fff;border:2px solid #e2e8f0;border-radius:12px;padding:20px;text-align:center;margin:20px 0">
        <span style="font-size:36px;font-weight:900;letter-spacing:8px;color:#0f766e">${otp}</span>
      </div>
      <p style="color:#94a3b8;font-size:12px">If you didn't request this, please ignore this email.</p>
    </div>
  `;
  // An OTP is a system message, not something a tenant should be sending from
  // their own mailbox, so Gmail is skipped by passing no tenantId. The rest of
  // the chain - SMTP, then Resend - is shared with every other email, instead
  // of this function keeping its own copy of the fallback logic.
  const result = await sendMail({ to, subject, html });
  logger.info({ to, via: result.via }, 'OTP email sent');
}

async function sendRegistrationOTPEmail({ to, otp }) {
  return sendOTPEmail({ tenantId: null, to, otp, subject: 'Verify Your Email - EzzySync Registration' });
}

async function sendInvoiceEmail({
  tenantId,
  to,
  customerName,
  tripName,
  pdfBuffer,
  bookingSummaryHtml,
  invoiceFileName,
}) {
  return sendMail({
    tenantId,
    to,
    subject: `Your Invoice for ${tripName}`,
    html: `
      <p>Hello ${customerName},</p>
      <p>Thank you for booking with us.</p>
      ${bookingSummaryHtml}
      <p>Please find your invoice attached.</p>
    `,
    attachments: [
      {
        filename: invoiceFileName,
        content: pdfBuffer,
        contentType: 'application/pdf',
      },
    ],
  });
}

async function sendWhatsappSetupNotification({ phone, companyName, tenantId, userEmail }) {
  const subject = `🚀 New WhatsApp Dedicated Setup Request: ${companyName}`;
  const html = `
    <div style="font-family: Arial, sans-serif; padding: 20px; color: #1e293b; max-width: 600px;">
      <h2 style="color: #0f766e; margin-bottom: 8px;">New Dedicated WhatsApp Request Received!</h2>
      <p style="font-size: 14px; color: #64748b; margin-top: 0;">An agency has requested dedicated WhatsApp Business setup assistance.</p>
      
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; margin: 20px 0;">
        <p style="margin: 8px 0;"><strong>🏢 Agency / Company:</strong> ${companyName}</p>
        <p style="margin: 8px 0;"><strong>📱 WhatsApp Number:</strong> <a href="https://wa.me/${phone.replace(/[^0-9]/g, '')}">${phone}</a></p>
        <p style="margin: 8px 0;"><strong>👤 User Email:</strong> ${userEmail || 'N/A'}</p>
        <p style="margin: 8px 0;"><strong>🆔 Tenant ID:</strong> ${tenantId || 'N/A'}</p>
      </div>

      <p style="font-size: 13px; color: #64748b;">Please contact the agency to help them configure their dedicated Meta WhatsApp Business API.</p>
    </div>
  `;

  const to = 'ezzysync@gmail.com';
  try {
    const sentViaSmtp = await sendMailViaSMTP({ to, subject, html });
    if (!sentViaSmtp) {
      await sendMailViaResend({ to, subject, html });
    }
  } catch (err) {
    logger.warn({ err }, 'Failed to send WhatsApp setup request email');
  }
}

// In-memory throttling for 500 error emails to prevent quota exhaustion or inbox spamming
const errorAlertCache = new Map();
const ALERT_THROTTLE_MS = 2 * 60 * 1000; // 2 minutes per unique error

async function sendErrorAlertEmail({
  error,
  requestId,
  method,
  url,
  tenantId,
  userId,
  ip,
}) {
  const alertRecipient = process.env.ALERT_EMAIL || 'ezzysync@gmail.com';
  const errMessage = error?.message || String(error || 'Internal Server Error');
  const errStack = error?.stack || 'No stack trace available';

  const errorKey = `${method} ${url} - ${errMessage}`;
  const now = Date.now();
  const lastSent = errorAlertCache.get(errorKey);
  if (lastSent && now - lastSent < ALERT_THROTTLE_MS) {
    logger.debug({ errorKey }, 'Skipping throttled error alert email');
    return false;
  }
  errorAlertCache.set(errorKey, now);

  if (errorAlertCache.size > 100) {
    for (const [k, time] of errorAlertCache.entries()) {
      if (now - time > ALERT_THROTTLE_MS) errorAlertCache.delete(k);
    }
  }

  const subject = `🚨 [500 Error] ${errMessage.slice(0, 60)} | Ref: ${requestId || 'N/A'}`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 680px; margin: 0 auto; padding: 24px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px;">
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 16px;">
        <span style="font-size: 24px;">🚨</span>
        <h2 style="color: #dc2626; margin: 0; font-size: 20px;">EzzySync 500 Server Error Alert</h2>
      </div>
      
      <p style="color: #475569; font-size: 14px; margin-top: 4px;">
        An unhandled 500 error occurred on the server. Here are the diagnostics and Request ID.
      </p>

      <table style="width: 100%; border-collapse: collapse; margin: 18px 0; font-size: 13px;">
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 8px 0; color: #64748b; font-weight: 600; width: 140px;">Request ID:</td>
          <td style="padding: 8px 0; color: #0f172a; font-family: monospace; font-weight: bold;">${requestId || 'N/A'}</td>
        </tr>
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Endpoint:</td>
          <td style="padding: 8px 0; color: #0f172a; font-family: monospace; font-weight: bold;">${method || 'GET'} ${url || ''}</td>
        </tr>
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Error Message:</td>
          <td style="padding: 8px 0; color: #dc2626; font-weight: bold;">${errMessage}</td>
        </tr>
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Tenant ID:</td>
          <td style="padding: 8px 0; color: #0f172a; font-family: monospace;">${tenantId || 'None (Public or Unauthenticated)'}</td>
        </tr>
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 8px 0; color: #64748b; font-weight: 600;">User ID / IP:</td>
          <td style="padding: 8px 0; color: #0f172a; font-family: monospace;">User: ${userId || 'N/A'} | IP: ${ip || 'N/A'}</td>
        </tr>
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Timestamp:</td>
          <td style="padding: 8px 0; color: #0f172a;">${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} (IST)</td>
        </tr>
      </table>

      <h3 style="color: #334155; font-size: 14px; margin-top: 20px; margin-bottom: 8px;">Stack Trace:</h3>
      <pre style="background: #0f172a; color: #f87171; padding: 14px; border-radius: 8px; font-size: 11px; overflow-x: auto; line-height: 1.5; font-family: Consolas, monospace;">${errStack}</pre>

      <div style="margin-top: 24px; padding-top: 12px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8;">
        This is an automated alert generated by the EzzySync error diagnostic pipeline.
      </div>
    </div>
  `;

  try {
    const sentViaSmtp = await sendMailViaSMTP({ to: alertRecipient, subject, html });
    if (!sentViaSmtp) {
      await sendMailViaResend({ to: alertRecipient, subject, html });
    }
    logger.info({ requestId, to: alertRecipient }, '500 error alert email dispatched');
    return true;
  } catch (err) {
    logger.warn({ err: err?.message, requestId }, 'Could not send 500 error alert email');
    return false;
  }
}

async function sendWalkthroughNotification({ name, agencyName, email, phone }) {
  const alertRecipient = process.env.ALERT_EMAIL || 'ezzysync@gmail.com';
  const cleanPhone = (phone || '').replace(/\D/g, '');
  const waLink = cleanPhone ? `https://wa.me/${cleanPhone.startsWith('91') ? cleanPhone : '91' + cleanPhone}` : null;
  const telLink = phone ? `tel:${phone}` : null;

  const adminSubject = `🚀 New CRM Access Request: ${name} (${agencyName})`;
  const adminHtml = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px;">
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 16px;">
        <span style="font-size: 24px;">🚀</span>
        <h2 style="color: #f97316; margin: 0; font-size: 20px;">New CRM Access / Demo Request</h2>
      </div>
      
      <p style="color: #475569; font-size: 14px; margin-top: 4px;">
        A new travel agency has requested access to EzzySync CRM:
      </p>

      <table style="width: 100%; border-collapse: collapse; margin: 18px 0; font-size: 13px;">
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 10px 0; color: #64748b; font-weight: 600; width: 140px;">Contact Person:</td>
          <td style="padding: 10px 0; color: #0f172a; font-weight: bold; font-size: 14px;">${name}</td>
        </tr>
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 10px 0; color: #64748b; font-weight: 600;">Agency Name:</td>
          <td style="padding: 10px 0; color: #0f172a; font-weight: bold;">${agencyName}</td>
        </tr>
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 10px 0; color: #64748b; font-weight: 600;">Email:</td>
          <td style="padding: 10px 0; color: #0f172a;"><a href="mailto:${email}" style="color: #f97316; text-decoration: none; font-weight: 600;">${email}</a></td>
        </tr>
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 10px 0; color: #64748b; font-weight: 600;">Phone:</td>
          <td style="padding: 10px 0; color: #0f172a; font-weight: bold;">
            ${phone ? `<a href="${telLink}" style="color: #0f172a; text-decoration: none;">${phone}</a>` : '<span style="color: #94a3b8;">Not provided</span>'}
          </td>
        </tr>
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 10px 0; color: #64748b; font-weight: 600;">Requested At:</td>
          <td style="padding: 10px 0; color: #0f172a;">${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} (IST)</td>
        </tr>
      </table>

      ${waLink ? `
      <div style="margin: 20px 0;">
        <a href="${waLink}" style="display: inline-block; background: #22c55e; color: #ffffff; text-decoration: none; padding: 10px 18px; border-radius: 8px; font-weight: bold; font-size: 13px;">
          💬 Chat on WhatsApp with ${name}
        </a>
      </div>
      ` : ''}

      <div style="margin-top: 24px; padding-top: 12px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8;">
        Sent automatically by EzzySync Lead Capture pipeline.
      </div>
    </div>
  `;

  const userSubject = `We received your request for EzzySync CRM — Welcome, ${name}!`;
  const userHtml = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px;">
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 16px;">
        <h2 style="color: #f97316; margin: 0; font-size: 20px;">Welcome to EzzySync CRM</h2>
      </div>
      
      <p style="color: #334155; font-size: 14px; line-height: 1.6;">
        Hi <strong>${name}</strong>,
      </p>

      <p style="color: #475569; font-size: 14px; line-height: 1.6;">
        Thank you for your interest in <strong>EzzySync CRM</strong> for <strong>${agencyName}</strong>! We have received your request.
      </p>

      <div style="background: #fff7ed; border-left: 4px solid #f97316; padding: 14px; border-radius: 6px; margin: 18px 0; font-size: 13px; color: #9a3412;">
        Our onboarding team is reviewing your details and will connect with you shortly${phone ? ` at <strong>${phone}</strong>` : ''} to set up your workspace and walk you through the CRM.
      </div>

      <p style="color: #475569; font-size: 14px; line-height: 1.6;">
        If you have any immediate questions or would like to share specific requirements, you can directly reply to this email.
      </p>

      <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b;">
        Best regards,<br/>
        <strong>Team EzzySync</strong><br/>
        <a href="https://ezzysync.com" style="color: #f97316; text-decoration: none;">ezzysync.com</a>
      </div>
    </div>
  `;

  try {
    const adminSmtp = await sendMailViaSMTP({ to: alertRecipient, subject: adminSubject, html: adminHtml });
    if (!adminSmtp) await sendMailViaResend({ to: alertRecipient, subject: adminSubject, html: adminHtml });
    logger.info({ to: alertRecipient }, 'Walkthrough request notification sent to admin');
  } catch (err) {
    logger.warn({ err: err?.message }, 'Could not send walkthrough notification to admin');
  }

  try {
    const userSmtp = await sendMailViaSMTP({ to: email, subject: userSubject, html: userHtml });
    if (!userSmtp) await sendMailViaResend({ to: email, subject: userSubject, html: userHtml });
    logger.info({ to: email }, 'Walkthrough confirmation email sent to user');
  } catch (err) {
    logger.warn({ err: err?.message, to: email }, 'Could not send walkthrough confirmation email to user');
  }
}

module.exports = {
  getEmailRouteStatus,
  sendMail,
  sendOTPEmail,
  sendRegistrationOTPEmail,
  sendInvoiceEmail,
  sendWhatsappSetupNotification,
  sendErrorAlertEmail,
  sendWalkthroughNotification,
};