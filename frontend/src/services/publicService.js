import api from './api';

/** Demo/walkthrough requests submitted from the marketing site. Admin-only. */
export const listWalkthroughRequests = () =>
  api.get('/public/walkthrough').then((r) => r.data.requests || []);
