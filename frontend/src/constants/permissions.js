// Mirrors backend/config/permissions.js — labels/config only, no logic.
// Keep MODULES and TEAM_MEMBER_DEFAULTS in sync with the backend registry.

export const ACTION_LABELS = {
  create: 'Create',
  read: 'View',
  update: 'Edit',
  delete: 'Delete',
  editPhone: 'Edit Mobile Number',
  download: 'Download',
  email: 'Email',
  use: 'Use',
  viewAll: 'View Everyone\'s (not just own)',
};

export const PERMISSION_MODULES = [
  { key: 'leads', label: 'Leads', actions: ['create', 'read', 'update', 'delete', 'viewAll'] },
  { key: 'bookings', label: 'Bookings', actions: ['create', 'read', 'update', 'delete', 'editPhone', 'viewAll'] },
  { key: 'quotations', label: 'Quotations', actions: ['create', 'read', 'update', 'delete'] },
  { key: 'invoices', label: 'Invoices', actions: ['read', 'download', 'email'] },
  { key: 'hotels', label: 'Hotels', actions: ['create', 'read', 'update', 'delete'] },
  { key: 'tourBatches', label: 'Group Tours', actions: ['create', 'read', 'update', 'delete'] },
  { key: 'followUps', label: 'Follow-ups', actions: ['create', 'read', 'update', 'viewAll'] },
  { key: 'customers', label: 'Customers', actions: ['read'] },
  { key: 'aiTools', label: 'AI Tools', actions: ['use'] },
  { key: 'billing', label: 'Billing & Analytics', actions: ['read'] },
];

// Matches backend TEAM_MEMBER_DEFAULTS — used to seed the Add form and to
// fill in gaps when editing a member whose stored permissions predate a module.
export const DEFAULT_TEAM_MEMBER_PERMISSIONS = {
  leads: { create: true, read: true, update: true, delete: false, viewAll: true },
  bookings: { create: true, read: true, update: true, delete: false, editPhone: false, viewAll: true },
  quotations: { create: true, read: true, update: true, delete: true },
  invoices: { read: true, download: true, email: true },
  hotels: { create: true, read: true, update: true, delete: true },
  tourBatches: { create: true, read: true, update: true, delete: true },
  followUps: { create: true, read: true, update: true, viewAll: true },
  customers: { read: true },
  aiTools: { use: true },
  billing: { read: false },
};
