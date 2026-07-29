const DEFAULT_KEYS = [
  'companyName', 'companyLogoUrl', 'invoiceFooter', 'emailSenderName', 'whatsappNumber', 'gstNumber', 'address',
  'invoiceAccentColor', 'invoiceLayout', 'invoiceTitle', 'invoiceShowGst', 'invoiceShowPaymentStatus', 'invoiceTerms'
];

/** camelCase key -> Postgres column name in the `settings` table */
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
  invoiceTerms: 'invoice_terms'
};

function rowToSettings(row) {
  const obj = {};
  DEFAULT_KEYS.forEach((k) => {
    const val = row ? row[COLUMN_MAP[k]] : undefined;
    if (k === 'invoiceShowGst' || k === 'invoiceShowPaymentStatus') {
      obj[k] = val !== undefined ? !!val : true;
    } else if (k === 'invoiceAccentColor') {
      obj[k] = val || '#0f766e';
    } else if (k === 'invoiceLayout') {
      obj[k] = val || 'minimal';
    } else if (k === 'invoiceTitle') {
      obj[k] = val || 'INVOICE';
    } else if (k === 'invoiceTerms') {
      obj[k] = val || 'Amounts once paid are subject to cancellation & refund policy shared at the time of booking. Please carry a valid photo ID on the day of departure. For any queries, contact us.';
    } else {
      obj[k] = val || '';
    }
  });
  return obj;
}

module.exports = { DEFAULT_KEYS, COLUMN_MAP, rowToSettings };
