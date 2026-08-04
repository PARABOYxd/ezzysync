import React from 'react';
import { Navigate } from 'react-router-dom';
import { usePermission } from '../../hooks/usePermission.js';

/**
 * Route guard for module-level access, separate from the auth-only
 * ProtectedRoute. Redirects to /dashboard if the current user doesn't
 * have `action` (default 'read') permission on `module`.
 */
export default function RequirePermission({ module, action = 'read', children }) {
  const allowed = usePermission(module, action);
  if (!allowed) return <Navigate to="/dashboard" replace />;
  return children;
}
