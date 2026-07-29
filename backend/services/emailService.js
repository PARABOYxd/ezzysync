const { google } = require('googleapis');
const gmailApiService = require('./gmailApiService');
const logger = require('../utils/logger').child({ module: 'email' });

// Nodemailer is used as a fallback for system-level emails (registration OTP, password reset)
// when no Gmail OAuth is configured for a tenant.
let nodemailer;
try { nodemailer = require('nodemailer'); } catch (_) { nodemailer = null; }

async function sendMailViaNodemailer({ to, subject, html }) {
  if (!nodemailer) {
    // debug-level: this mock path only fires when nodemailer isn't installed,
    // and the body carries OTPs, so it shouldn't surface at the default
    // production log level (info).
    logger.debug({ to, subject, html }, '[MOCK - nodemailer unavailable] email not actually sent');
    return;
  }
  const env = require('../config/env');
  if (!env.smtpHost || !env.smtpUser || env.smtpUser.includes('your-email') || env.smtpPass === 'your_app_password') {
    // No SMTP configured - log so devs can grab OTPs during local testing.
    logger.debug({ to, subject, html }, '[MOCK - no SMTP configured] email not actually sent');
    return;
  }
  const transporter = nodemailer.createTransport({
    host: env.smtpHost,
    port: Number(env.smtpPort || 587),
    secure: env.smtpSecure === 'true',
    auth: {
      user: env.smtpUser,
      pass: env.smtpPass,
    },
  });
  await transporter.sendMail({
    from: env.smtpFrom || env.smtpUser,
    to,
    subject,
    html,
  });
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
    logger.warn({ err: gmailErr, tenantId, to }, 'Gmail send failed, falling back to SMTP');
    if (attachments.length === 0) {
      await sendMailViaNodemailer({ to, subject, html });
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
  // For OTPs we try nodemailer first (system-level, no tenant OAuth needed)
  try {
    await sendMailViaNodemailer({ to, subject, html });
  } catch (err) {
    logger.warn({ err, to }, 'SMTP sendOTP failed, trying Gmail');
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