const DEFAULT_KEYS = [
  'companyName', 'companyLogoUrl', 'invoiceFooter', 'emailSenderName', 'whatsappNumber', 'gstNumber', 'address',
  'invoiceAccentColor', 'invoiceLayout', 'invoiceTitle', 'invoiceShowGst', 'invoiceShowPaymentStatus', 'invoiceTerms', 'autoSendInvoice',
  'whatsappPhoneNumberId', 'whatsappAccessToken', 'whatsappWabaId', 'whatsappBusinessId', 'whatsappAppSecret',
  'instagramUsername', 'instagramAccountId', 'instagramAccessToken', 'whatsappAiAutoReply', 'whatsappDefaultChatMode'
];

/** camelCase key -> Postgres column name in the `settings` table */
/**
 * Credentials that are write-only over the API.
 *
 * The settings form posts the whole object back, so a masked value would
 * otherwise be saved over the real one. updateSettings() treats the
 * placeholder as "leave this alone", which makes the round trip lossless.
 */
const SECRET_KEYS = ['whatsappAccessToken', 'whatsappAppSecret', 'instagramAccessToken'];
const SECRET_PLACEHOLDER = '••••••••';

const COLUMN_MAP = {
  companyName: 'company_name',
  companyLogoUrl: 'company_logo_url',
  invoiceFooter: 'invoice_footer',
  emailSenderName: 'email_sender_name',
  whatsappNumber: 'whatsapp_number',
  gstNumber: 'gst_number',
  address: 'address',
  invoiceAccentColor: 'invoice_accent_color',
  invoiceLayout: 'invoice_layout',
  invoiceTitle: 'invoice_title',
  invoiceShowGst: 'invoice_show_gst',
  invoiceShowPaymentStatus: 'invoice_show_payment_status',
  invoiceTerms: 'invoice_terms',
  autoSendInvoice: 'auto_send_invoice',
  whatsappPhoneNumberId: 'whatsapp_phone_number_id',
  whatsappAccessToken: 'whatsapp_access_token',
  whatsappWabaId: 'whatsapp_waba_id',
  whatsappBusinessId: 'whatsapp_business_id',
  whatsappAppSecret: 'whatsapp_app_secret',
  instagramUsername: 'instagram_username',
  instagramAccountId: 'instagram_account_id',
  instagramAccessToken: 'instagram_access_token',
  whatsappAiAutoReply: 'whatsapp_ai_auto_reply',
  whatsappDefaultChatMode: 'whatsapp_default_chat_mode'
};

/**
 * @param {object} row      settings row from the database
 * @param {object} [opts]
 * @param {boolean} [opts.includeSecrets]  true only for server-side callers
 *   that need the live credential (sending to Meta, syncing templates).
 *   The API must never pass this.
 */
function rowToSettings(row, { includeSecrets = false } = {}) {
  const obj = {};
  DEFAULT_KEYS.forEach((k) => {
    const val = row ? row[COLUMN_MAP[k]] : undefined;
    if (k === 'invoiceShowGst' || k === 'invoiceShowPaymentStatus') {
      obj[k] = val !== undefined ? !!val : true;
    } else if (k === 'whatsappAiAutoReply') {
      obj[k] = val !== undefined && val !== null ? !!val : true;
    } else if (k === 'autoSendInvoice') {
      obj[k] = !!val;
    } else if (k === 'whatsappDefaultChatMode') {
      obj[k] = val || 'ai';
    } else if (k === 'invoiceAccentColor') {
      obj[k] = val || '#0f766e';
    } else if (k === 'invoiceLayout') {
      obj[k] = val || 'minimal';
    } else if (k === 'invoiceTitle') {
      obj[k] = val || 'INVOICE';
    } else if (k === 'invoiceTerms') {
      obj[k] = val || 'Amounts once paid are subject to cancellation & refund policy shared at the time of booking. Please carry a valid photo ID on the day of departure. For any queries, contact us.';
    } else if (SECRET_KEYS.includes(k)) {
      // Never handed back to the browser. These are live credentials - a Meta
      // access token can send WhatsApp messages as the business, and the app
      // secret can be used to forge webhooks into its account - and this
      // endpoint returned them in full to every logged-in user of the tenant,
      // including restricted team members. The UI only ever tests whether they
      // are set, so a placeholder serves it just as well.
      obj[k] = includeSecrets ? (val || '') : (val ? SECRET_PLACEHOLDER : '');
    } else if ([
      'whatsappPhoneNumberId', 'whatsappWabaId', 'whatsappBusinessId',
      'instagramUsername', 'instagramAccountId'
    ].includes(k)) {
      obj[k] = val || '';
    } else {
      obj[k] = val || '';
    }
  });
  return obj;
}

module.exports = { DEFAULT_KEYS, COLUMN_MAP, rowToSettings, SECRET_KEYS, SECRET_PLACEHOLDER };
