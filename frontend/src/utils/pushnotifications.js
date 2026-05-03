import API from '../services/api';

// Register service worker
export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('Push notifications not supported');
    return;
  }
  try {
    const registration = await navigator.serviceWorker.register('/sw.js');
    console.log('Service Worker registered');
    return registration;
  } catch (err) {
    console.error('Service Worker registration failed:', err);
  }
}

// Subscribe user to push notifications
export async function subscribeUserToPush() {
  const registration = await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    const publicKey = process.env.REACT_APP_VAPID_PUBLIC_KEY;
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: publicKey,
    });
  }
  // Send subscription to backend
  await API.post('/notifications/push-subscribe', {
    subscription: {
      endpoint: subscription.endpoint,
      keys: subscription.toJSON().keys,
    },
    userAgent: navigator.userAgent,
  });
  return subscription;
}