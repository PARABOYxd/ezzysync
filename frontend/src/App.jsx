import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import ProtectedRoute from './components/layout/ProtectedRoute.jsx';
import RequirePermission from './components/common/RequirePermission.jsx';
import DashboardLayout from './layouts/DashboardLayout.jsx';

import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import ForgotPassword from './pages/ForgotPassword.jsx';
import ResetPassword from './pages/ResetPassword.jsx';
import GoogleCallback from './pages/GoogleCallback.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Bookings from './pages/Bookings.jsx';
import Leads from './pages/Leads.jsx';
import FollowUps from './pages/FollowUps.jsx';
import Invoices from './pages/Invoices.jsx';
import Quotations from './pages/Quotations.jsx';
import QuotationPreview from './pages/QuotationPreview.jsx';
import Profile from './pages/Profile.jsx';
import Settings from './pages/Settings.jsx';
import Team from './pages/Team.jsx';
import AITools from './pages/AITools.jsx';
import CustomerProfile from './pages/CustomerProfile.jsx';
import Hotels from './pages/Hotels.jsx';
import TourBatches from './pages/TourBatches.jsx';
import HelpGuide from './pages/HelpGuide.jsx';
import NotFound from './pages/NotFound.jsx';

import BillingAnalytics from './pages/BillingAnalytics.jsx';
import Expenses from './pages/Expenses.jsx';

// ... other imports

export default function App() {
  return (
    <>
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
        <Route path="/follow-ups" element={<RequirePermission module="followUps"><FollowUps /></RequirePermission>} />
        <Route path="/bookings" element={<RequirePermission module="bookings"><Bookings /></RequirePermission>} />
        <Route path="/tour-batches" element={<RequirePermission module="tourBatches"><TourBatches /></RequirePermission>} />
        <Route path="/invoices" element={<RequirePermission module="invoices"><Invoices /></RequirePermission>} />
        <Route path="/quotations" element={<RequirePermission module="quotations"><Quotations /></RequirePermission>} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/hotels" element={<RequirePermission module="hotels"><Hotels /></RequirePermission>} />
        <Route path="/guide" element={<HelpGuide />} />
        <Route path="/team" element={<Team />} />
        <Route path="/ai-tools" element={<RequirePermission module="aiTools" action="use"><AITools /></RequirePermission>} />
        <Route path="/customers/:id" element={<RequirePermission module="customers"><CustomerProfile /></RequirePermission>} />
        <Route path="/billing" element={<RequirePermission module="billing"><BillingAnalytics /></RequirePermission>} />
        <Route path="/expenses" element={<RequirePermission module="billing" action="write"><Expenses /></RequirePermission>} />
      </Route>

        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <Analytics />
    </>
  );
}
