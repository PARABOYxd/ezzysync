import { useEffect, useState } from 'react';
import { getPlanCatalog } from '../services/planCatalogService';

/**
 * Server-priced plan cards, for any screen that offers an upgrade.
 *
 * Returns `{ plans, loading, error }`. `plans` is an empty array until the
 * fetch lands - never a placeholder price - because a card showing a number
 * the checkout will not honour is the bug this whole change exists to remove.
 */
export function usePlanCatalog() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    getPlanCatalog()
      .then((data) => {
        if (!active) return;
        setPlans(data);
        setError(null);
      })
      .catch((err) => {
        if (!active) return;
        setError(err?.response?.data?.message || 'Could not load plan pricing.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      // The catalog is cached in the service, so unmounting mid-flight just
      // drops this component's copy of the result.
      active = false;
    };
  }, []);

  const byId = (id) => plans.find((p) => p.id === id);

  return { plans, loading, error, byId };
}

export default usePlanCatalog;
