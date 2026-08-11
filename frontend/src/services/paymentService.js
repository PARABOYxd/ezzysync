import api from './api';

export const createSubscriptionOrder = () =>
  api.post('/payments/create-subscription-order').then((r) => r.data);

export const verifySubscription = (payload) =>
  api.post('/payments/verify-subscription', payload).then((r) => r.data);
