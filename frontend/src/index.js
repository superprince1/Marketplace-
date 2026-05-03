import React from 'react';
import ReactDOM from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import * as Sentry from '@sentry/react';
import { BrowserTracing } from '@sentry/tracing';
import ReactGA from 'react-ga4';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import './i18n'; // ✅ Multi‑language support (i18n)

/**
 * Application Entry Point - index.js
 * 
 * This file is the root of the React application.
 * It renders the main <App /> component into the DOM element with id 'root'.
 * 
 * React.StrictMode is a helper component that activates additional checks
 * and warnings for its descendants. It helps identify potential problems
 * in the application (e.g., unsafe lifecycle methods, deprecated APIs).
 * 
 * In production builds, React.StrictMode has no effect.
 * 
 * HelmetProvider is required for react-helmet-async to manage document head
 * (title, meta tags) for SEO on each route.
 */

// ========== ENABLE WHY-DID-YOU-RENDER (DEVELOPMENT ONLY) ==========
if (process.env.NODE_ENV === 'development') {
  import('./setupWhyDidYouRender').catch(err => {
    console.warn('WhyDidYouRender not installed. Run `npm install @welldone-software/why-did-you-render` to enable it.');
  });
}

// ========== SENTRY ERROR TRACKING ==========
const sentryDsn = process.env.REACT_APP_SENTRY_DSN;
if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    integrations: [new BrowserTracing()],
    tracesSampleRate: 0.2, // Capture 20% of transactions for performance monitoring
    environment: process.env.NODE_ENV,
    beforeSend(event) {
      // Optional: filter out non‑critical errors (e.g., network errors from third‑party scripts)
      return event;
    },
  });
  console.log('✅ Sentry error tracking enabled');
} else if (process.env.NODE_ENV === 'development') {
  console.warn('Sentry DSN not found. Set REACT_APP_SENTRY_DSN in .env to enable error tracking.');
}

// ========== GOOGLE ANALYTICS (GA4) ==========
const measurementId = process.env.REACT_APP_GA_MEASUREMENT_ID;
if (measurementId) {
  ReactGA.initialize(measurementId);
  // Send an initial pageview (will be overwritten by router later)
  ReactGA.send('pageview');
  console.log('✅ Google Analytics enabled');
} else if (process.env.NODE_ENV === 'development') {
  console.warn('Google Analytics measurement ID not found. Set REACT_APP_GA_MEASUREMENT_ID in .env');
}

// ========== CORE WEB VITALS REPORTING ==========
reportWebVitals((metric) => {
  // Send to Google Analytics if available
  if (measurementId && ReactGA) {
    ReactGA.event({
      category: 'Web Vitals',
      action: metric.name,
      // CLS is a cumulative value, others are milliseconds; we round for readability
      value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
      label: metric.id,
      nonInteraction: true, // does not affect bounce rate
    });
  } else if (process.env.NODE_ENV === 'development') {
    // Log to console in development for debugging
    console.log(`[Web Vitals] ${metric.name}: ${metric.value}`);
  }
});

// Create a root using React 18's createRoot API
const root = ReactDOM.createRoot(document.getElementById('root'));

// Render the app inside StrictMode and HelmetProvider
root.render(
  <React.StrictMode>
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </React.StrictMode>
);

// ==========================================================================
// SERVICE WORKER (optional - for PWA)
// ==========================================================================
// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://cra.link/PWA

// import * as serviceWorkerRegistration from './serviceWorkerRegistration';
// serviceWorkerRegistration.unregister();