import { useAuth } from './useAuth.jsx';

/**
 * usePermission('bookings', 'delete') -> boolean.
 * Admins always have access; team members are gated by user.permissions,
 * which mirrors the backend's normalized module x action shape.
 */
export function usePermission(moduleKey, action = 'read') {
  const { user } = useAuth();
  if (!user) return false;
  if (user.role === 'ADMIN') return true;
  return !!user.permissions?.[moduleKey]?.[action];
}
