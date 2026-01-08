// This file configures the initialization of Sentry on the client.
// The config you add here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  replaysOnErrorSampleRate: 1.0,

  // This sets the sample rate to be 10%. You may want this to be 100% while
  // in development and sample at a lower rate in production
  replaysSessionSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // You can remove this option if you're not planning to use the Sentry Session Replay feature:
  integrations: [
    Sentry.replayIntegration({
      // Additional Replay configuration goes in here, for example:
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  // Filter out common non-actionable errors
  beforeSend(event, hint) {
    // Ignore network errors that are likely user-side issues
    if (event.exception) {
      const error = hint.originalException;
      if (error instanceof Error) {
        // Ignore common browser extension errors
        if (
          error.message.includes("chrome-extension://") ||
          error.message.includes("moz-extension://") ||
          error.message.includes("safari-extension://")
        ) {
          return null;
        }
        // Ignore network errors that are likely connectivity issues
        if (
          error.message.includes("Failed to fetch") ||
          error.message.includes("NetworkError") ||
          error.message.includes("Network request failed")
        ) {
          return null;
        }
        // Ignore third-party script errors (browser extensions, injected scripts)
        if (
          error.message.includes("SCDynimacBridge") ||
          error.message.includes("Can't find variable:") ||
          error.name === "ReferenceError" && error.message.includes("Can't find variable")
        ) {
          return null;
        }
      }
      
      // Also check exception values directly
      if (event.exception.values) {
        for (const exception of event.exception.values) {
          if (exception.value) {
            // Ignore SCDynimacBridge and similar third-party script errors
            if (
              exception.value.includes("SCDynimacBridge") ||
              (exception.type === "ReferenceError" && exception.value.includes("Can't find variable"))
            ) {
              return null;
            }
          }
        }
      }
    }
    return event;
  },
});

