import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import ProtectedRoute from './components/layout/ProtectedRoute.jsx';
import DashboardLayout from './layouts/DashboardLayout.jsx';

import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import ForgotPassword from './pages/ForgotPassword.jsx';
import ResetPassword from './pages/ResetPassword.jsx';
import GoogleCallback from './pages/GoogleCallback.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Bookings from './pages/Bookings.jsx';
import Leads from './pages/Leads.jsx';
import Pipeline from './pages/Pipeline.jsx';
import FollowUps from './pages/FollowUps.jsx';
import Invoices from './pages/Invoices.jsx';
import Quotations from './pages/Quotations.jsx';
import QuotationPreview from './pages/QuotationPreview.jsx';
import Profile from './pages/Profile.jsx';
import Settings from './pages/Settings.jsx';
import Team from './pages/Team.jsx';
import AITools from './pages/AITools.jsx';
import CustomerProfile from './pages/CustomerProfile.jsx';
import NotFound from './pages/NotFound.jsx';

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
          <Route path="/leads" element={<Leads />} />
          <Route path="/pipeline" element={<Pipeline />} />
          <Route path="/follow-ups" element={<FollowUps />} />
          <Route path="/bookings" element={<Bookings />} />
          <Route path="/invoices" element={<Invoices />} />
          <Route path="/quotations" element={<Quotations />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/team" element={<Team />} />
          <Route path="/ai-tools" element={<AITools />} />
          <Route path="/customers/:id" element={<CustomerProfile />} />
        </Route>

        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <Analytics />
    </>
  );
}
