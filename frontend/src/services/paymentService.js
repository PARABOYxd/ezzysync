import api from './api';

export const createSubscriptionOrder = (planId = 'PRO', amount = null) =>
  api.post('/payments/create-subscription-order', { planId, amount }).then((r) => r.data);

export const verifySubscription = (payload) =>
  api.post('/payments/verify-subscription', payload).then((r) => r.data);

/**
 * Dynamically loads Razorpay checkout.js script if not already loaded.
 */
export function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

/**
 * Initiates Razorpay Standard Web Checkout modal
 */
export async function openRazorpayCheckout({
  planId = 'PRO',
  planName = 'Agency Growth Pro Plan',
  user,
  onSuccess,
  onError,
}) {
  const loaded = await loadRazorpayScript();
  if (!loaded) {
    onError?.('Razorpay SDK failed to load. Please check your internet connection.');
    return;
  }

  // 1. Create Order on Backend (Logged in PostgreSQL payments table)
  let order;
  try {
    order = await createSubscriptionOrder(planId);
  } catch (err) {
    const errorMsg = err.response?.data?.message || err.message || 'Could not initiate payment order with Razorpay.';
    onError?.(errorMsg);
    return;
  }

  if (!order || !order.id) {
    onError?.('Failed to get valid order ID from Razorpay.');
    return;
  }

  const options = {
    key: order.key_id || import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_TNwnsNgaD1ek1F',
    amount: order.amount,
    currency: order.currency || 'INR',
    name: 'EzzySync CRM',
    description: `${planName} Subscription`,
    image: '/logo.png',
    order_id: order.id,
    prefill: {
      name: user?.name || '',
      email: user?.email || '',
      contact: user?.phone || '',
    },
    theme: {
      color: '#F97316',
    },
    handler: async function (response) {
      try {
        const verifyRes = await verifySubscription({
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_order_id: response.razorpay_order_id,
          razorpay_signature: response.razorpay_signature,
          planId,
        });
        onSuccess?.(verifyRes);
      } catch (err) {
        onError?.(err.response?.data?.message || 'Payment signature verification failed.');
      }
    },
    modal: {
      ondismiss: function () {
        // User dismissed modal
      },
    },
  };

  try {
    const rzp = new window.Razorpay(options);
    rzp.on('payment.failed', function (response) {
      onError?.(response.error?.description || 'Payment transaction failed.');
    });
    rzp.open();
  } catch (err) {
    onError?.(err?.message || 'Failed to open Razorpay modal.');
  }
}
