const nodemailer = require('nodemailer');

const SMTP_TIMEOUT_MS = 8000;

function isSmtpConfigured() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  return Boolean(host && user && pass && !user.includes('your-') && pass !== 'your_app_password');
}

/**
 * Send credentials email to travel agency / agent
 */
async function sendCredentialsEmail({ to, name, agencyName, password, loginUrl, isReset = false }) {
  const subject = isReset 
    ? `🔑 EzzySync CRM: New Login Credentials for ${agencyName || 'Your Agency'}`
    : `🎉 EzzySync CRM: Welcome to your workspace! Login credentials`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #1e293b; }
        .card { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05); }
        .header { background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); padding: 32px 28px; text-align: center; color: #ffffff; }
        .header h1 { margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px; }
        .header p { margin: 6px 0 0; opacity: 0.9; font-size: 13px; }
        .body { padding: 32px 28px; }
        .greeting { font-size: 15px; font-weight: 600; margin-bottom: 12px; color: #0f172a; }
        .intro { font-size: 13.5px; color: #475569; line-height: 1.6; margin-bottom: 24px; }
        .creds-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; margin-bottom: 24px; }
        .creds-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #edf2f7; font-size: 13px; }
        .creds-row:last-child { border-bottom: none; }
        .creds-label { color: #64748b; font-weight: 500; }
        .creds-value { color: #0f172a; font-weight: 700; font-family: monospace; font-size: 13.5px; }
        .btn-container { text-align: center; margin: 28px 0; }
        .btn { display: inline-block; background: #ea580c; color: #ffffff !important; font-weight: 700; font-size: 14px; text-decoration: none; padding: 12px 28px; border-radius: 10px; box-shadow: 0 4px 12px rgba(234, 88, 12, 0.25); }
        .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 28px; text-align: center; font-size: 11.5px; color: #94a3b8; }
        .tip { background: #fff7ed; border-left: 4px solid #f97316; padding: 12px 16px; border-radius: 6px; font-size: 12px; color: #9a3412; margin-top: 20px; line-height: 1.5; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <h1>EzzySync Travel CRM</h1>
          <p>${isReset ? 'Password Reset Confirmation' : 'Account Activation & Login Details'}</p>
        </div>
        <div class="body">
          <div class="greeting">Hello ${name || 'Travel Partner'},</div>
          <div class="intro">
            ${isReset 
              ? `Your login credentials for <strong>${agencyName || 'your agency workspace'}</strong> have been successfully updated by the platform administrator. You can now log into your CRM with the details below:`
              : `Your travel agency account for <strong>${agencyName || 'your agency'}</strong> is now live and ready to use. Below are your official login credentials:`}
          </div>

          <div class="creds-box">
            <div class="creds-row">
              <span class="creds-label">Login Portal:</span>
              <span class="creds-value"><a href="${loginUrl}" style="color: #ea580c; text-decoration: none;">${loginUrl}</a></span>
            </div>
            <div class="creds-row">
              <span class="creds-label">Username / Email:</span>
              <span class="creds-value">${to}</span>
            </div>
            <div class="creds-row">
              <span class="creds-label">${isReset ? 'New Password:' : 'Initial Password:'}</span>
              <span class="creds-value" style="color: #ea580c; font-size: 15px; letter-spacing: 0.5px;">${password}</span>
            </div>
          </div>

          <div class="btn-container">
            <a href="${loginUrl}" class="btn" target="_blank">Login to EzzySync CRM ↗</a>
          </div>

          <div class="tip">
            🔒 <strong>Security Tip:</strong> For your security, we recommend changing your password after logging in from your agency profile settings.
          </div>
        </div>
        <div class="footer">
          EzzySync HQ • Empowering Modern Travel Professionals<br/>
          If you did not request this change, please contact your Super Admin immediately.
        </div>
      </div>
    </body>
    </html>
  `;

  if (isSmtpConfigured()) {
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
        connectionTimeout: SMTP_TIMEOUT_MS,
        greetingTimeout: SMTP_TIMEOUT_MS,
      });

      const fromName = process.env.EMAIL_FROM_NAME || 'EzzySync HQ';
      const fromEmail = process.env.EMAIL_FROM || process.env.SMTP_USER;

      await transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to,
        subject,
        html,
      });

      console.log(`[Email] Credentials email successfully sent to ${to}`);
      return { success: true, mode: 'smtp' };
    } catch (err) {
      console.error(`[Email Error] Failed to send credentials via SMTP:`, err.message);
      // Fall through to dev log
    }
  }

  // Dev / Fallback log
  console.log(`\n============================================================`);
  console.log(`📧 [EMAIL DISPATCH - DEV LOG]`);
  console.log(`To: ${to}`);
  console.log(`Subject: ${subject}`);
  console.log(`Portal: ${loginUrl}`);
  console.log(`Password: ${password}`);
  console.log(`============================================================\n`);

  return { success: true, mode: 'dev_log' };
}

module.exports = {
  sendCredentialsEmail,
  isSmtpConfigured,
};
