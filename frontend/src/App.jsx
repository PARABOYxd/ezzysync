import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import ProtectedRoute from './components/layout/ProtectedRoute.jsx';
import RequirePermission from './components/common/RequirePermission.jsx';
import RequireSuperAdmin from './components/common/RequireSuperAdmin.jsx';
import DashboardLayout from './layouts/DashboardLayout.jsx';
import SuperAdminLayout from './layouts/SuperAdminLayout.jsx';
import PageLoader from './components/common/PageLoader.jsx';
import lazyPage from './utils/lazyPage.js';

// Loaded up front: the two pages nearly every visit starts on.
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';

// Every other page is its own file, fetched the first time it is opened -
// the app used to ship as one 1.1 MB script, charts and PDF code included,
// before the login screen could even paint.
const SuperAdmin = lazyPage(() => import('./pages/SuperAdmin.jsx'));
const AdminLogin = lazyPage(() => import('./pages/AdminLogin.jsx'));
const Register = lazyPage(() => import('./pages/Register.jsx'));
const ForgotPassword = lazyPage(() => import('./pages/ForgotPassword.jsx'));
const ResetPassword = lazyPage(() => import('./pages/ResetPassword.jsx'));
const GoogleCallback = lazyPage(() => import('./pages/GoogleCallback.jsx'));
const Bookings = lazyPage(() => import('./pages/Bookings.jsx'));
const UpcomingTrips = lazyPage(() => import('./pages/UpcomingTrips.jsx'));
const WhatsAppChat = lazyPage(() => import('./pages/WhatsAppChat.jsx'));
const Leads = lazyPage(() => import('./pages/Leads.jsx'));
const Pipeline = lazyPage(() => import('./pages/Pipeline.jsx'));
const FollowUps = lazyPage(() => import('./pages/FollowUps.jsx'));
const Invoices = lazyPage(() => import('./pages/Invoices.jsx'));
const Quotations = lazyPage(() => import('./pages/Quotations.jsx'));
const QuotationPreview = lazyPage(() => import('./pages/QuotationPreview.jsx'));
const Profile = lazyPage(() => import('./pages/Profile.jsx'));
const Settings = lazyPage(() => import('./pages/Settings.jsx'));
const Team = lazyPage(() => import('./pages/Team.jsx'));
const Customers = lazyPage(() => import('./pages/Customers.jsx'));
const CustomerProfile = lazyPage(() => import('./pages/CustomerProfile.jsx'));
const Hotels = lazyPage(() => import('./pages/Hotels.jsx'));
const TourBatches = lazyPage(() => import('./pages/TourBatches.jsx'));
const HelpGuide = lazyPage(() => import('./pages/HelpGuide.jsx'));
const NotFound = lazyPage(() => import('./pages/NotFound.jsx'));
const BillingAnalytics = lazyPage(() => import('./pages/BillingAnalytics.jsx'));
const Expenses = lazyPage(() => import('./pages/Expenses.jsx'));

export default function App() {
  return (
    <>
      {/* Pages inside the CRM layout suspend inside the layout's own boundary,
          so the sidebar stays put; this one covers the standalone pages. */}
      <Suspense fallback={<PageLoader fullScreen />}>
      <Routes>
        {/* The only unauthenticated entry point into the app */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/auth/google/callback" element={<GoogleCallback />} />
        <Route path="/quote-preview/:uuid" element={<QuotationPreview />} />

      {/* Everything below requires a valid session - no page is reachable without auth */}
      <Route
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/leads" element={<RequirePermission module="leads"><Leads /></RequirePermission>} />
        <Route path="/pipeline" element={<RequirePermission module="leads"><Pipeline /></RequirePermission>} />
        <Route path="/follow-ups" element={<RequirePermission module="followUps"><FollowUps /></RequirePermission>} />
        <Route path="/bookings" element={<RequirePermission module="bookings"><Bookings /></RequirePermission>} />
        <Route path="/upcoming-trips" element={<RequirePermission module="bookings"><UpcomingTrips /></RequirePermission>} />
        <Route path="/whatsapp-chat" element={<RequirePermission module="bookings"><WhatsAppChat /></RequirePermission>} />
        <Route path="/tour-batches" element={<RequirePermission module="tourBatches"><TourBatches /></RequirePermission>} />
        <Route path="/invoices" element={<RequirePermission module="invoices"><Invoices /></RequirePermission>} />
        <Route path="/quotations" element={<RequirePermission module="quotations"><Quotations /></RequirePermission>} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/hotels" element={<RequirePermission module="hotels"><Hotels /></RequirePermission>} />
        <Route path="/guide" element={<HelpGuide />} />
        <Route path="/team" element={<Team />} />
        <Route path="/customers" element={<RequirePermission module="customers"><Customers /></RequirePermission>} />
        <Route path="/customers/:id" element={<RequirePermission module="customers"><CustomerProfile /></RequirePermission>} />
        <Route path="/billing" element={<RequirePermission module="billing"><BillingAnalytics /></RequirePermission>} />
        <Route path="/expenses" element={<RequirePermission module="expenses"><Expenses /></RequirePermission>} />
      </Route>

        {/* Dedicated EzzySync Company Master Admin Portal (Standalone, outside agency CRM) */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route
          path="/admin"
          element={
            <RequireSuperAdmin>
              <SuperAdminLayout>
                <SuperAdmin />
              </SuperAdminLayout>
            </RequireSuperAdmin>
          }
        />
        <Route path="/super-admin" element={<Navigate to="/admin" replace />} />

        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      </Suspense>
      <Analytics />
    </>
  );
}
