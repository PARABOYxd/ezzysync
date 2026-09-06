import { useEffect, useState } from 'react';
import api from '../services/api';

/**
 * The tenant's live plan state, from the server.
 *
 * Screens used to work this out from the JWT: paid plan id means active,
 * otherwise count days since signup. That was already fragile - the token
 * carries whatever was true when it was minted - and it broke outright once
 * paid plans gained an expiry date. A tenant whose paid month had ended still
 * had `planId: 'PRO'` in their token, so the app showed them a normal
 * workspace while every API call behind it returned 403. They saw an app that
 * simply didn't work, with nothing telling them why.
 *
 * `/plans/me` is deliberately reachable while locked out, so it can be asked
 * exactly when access is gone.
 */
export function usePlanStatus() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    api
      .get('/plans/me')
      .then((res) => {
        if (active) setStatus(res.data);
      })
      .catch(() => {
        // A network failure must not throw up the paywall over a working
        // account - leaving status null means "not known to be expired".
        if (active) setStatus(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return {
    loading,
    plan: status?.plan || null,
    limits: status?.limits || null,
    usage: status?.usage || null,
    isExpired: status?.plan?.isExpired === true,
    isTrial: status?.plan?.isTrial === true,
    // Which plan lapsed, when one did, so a renewal can be offered directly.
    lapsedPlanId: status?.plan?.lapsedPlanId || null,
    expiresAt: status?.plan?.expiresAt || null,
  };
}

export default usePlanStatus;
