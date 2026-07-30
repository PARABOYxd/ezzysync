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

function isSmtpConfigured(env) {
  return Boolean(env.smtpHost) && Boolean(env.smtpUser) && !env.smtpUser.includes('your-') && env.smtpPass !== 'your_app_password';
}

async function sendMailViaSMTP({ to, subject, html }) {
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
  });
  return true;
}

// Resend (HTTPS API, port 443) is the default/fallback for system-level
// emails (registration OTP, password reset) - it isn't blocked on any
// Render tier, unlike SMTP.
async function sendMailViaResend({ to, subject, html }) {
  const env = require('../config/env');
  if (!env.resendApiKey || !env.emailFrom || env.emailFrom.includes('your-')) {
    // Not configured - log so devs can grab OTPs during local testing.
    logger.debug({ to, subject, html }, '[MOCK - Resend not configured] email not actually sent');
    return;
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
    }),
  });
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Resend API error ${response.status}: ${body}`);
  }
}

async function sendMail({
  tenantId,
  to,
  subject,
  html,
  attachments = [],
}) {
  // Try Gmail OAuth first
  try {
    const auth = await gmailApiService.getAuthenticatedClient(tenantId);
    const gmail = google.gmail({ version: 'v1', auth });

    let boundary = 'invoice_boundary';
    let message = [
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
  } catch (gmailErr) {
    logger.warn({ err: gmailErr, tenantId, to }, 'Gmail send failed, falling back to Resend');
    if (attachments.length === 0) {
      await sendMailViaResend({ to, subject, html });
    } else {
      throw gmailErr; // Can't send attachments without Gmail for now
    }
  }
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
  // System-level OTP send order: SMTP (only if configured, fast-timeout) ->
  // Resend (always available) -> tenant Gmail OAuth as a last resort.
  try {
    const sentViaSmtp = await sendMailViaSMTP({ to, subject, html });
    if (!sentViaSmtp) {
      await sendMailViaResend({ to, subject, html });
    }
  } catch (err) {
    logger.warn({ err, to }, 'SMTP/Resend sendOTP failed, trying Gmail');
    await sendMail({ tenantId, to, subject, html });
  }
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

module.exports = {
  sendMail,
  sendOTPEmail,
  sendRegistrationOTPEmail,
  sendInvoiceEmail,
};