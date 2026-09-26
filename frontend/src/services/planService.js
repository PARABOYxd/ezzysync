import api from './api';

/**
 * The tenant's live plan status - seats, limits, usage, expiry. Deliberately
 * reachable while locked out, so a paywalled tenant can still be told why.
 */
let planStatusCache = null;
let planStatusFetchTime = 0;
const CACHE_TTL_MS = 30000; // 30 seconds cache

export async function getMyPlanStatus(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && planStatusCache && (now - planStatusFetchTime < CACHE_TTL_MS)) {
    return planStatusCache;
  }
  const { data } = await api.get('/plans/me');
  planStatusCache = data;
  planStatusFetchTime = now;
  return data;
}

