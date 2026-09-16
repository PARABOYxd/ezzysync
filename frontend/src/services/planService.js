import api from './api';

/**
 * The tenant's live plan status - seats, limits, usage, expiry. Deliberately
 * reachable while locked out, so a paywalled tenant can still be told why.
 */
export async function getMyPlanStatus() {
  const { data } = await api.get('/plans/me');
  return data;
}
