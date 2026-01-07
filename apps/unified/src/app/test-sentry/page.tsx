"use client";

import { useState } from "react";
import { Button } from "@crowdstack/ui";
import * as Sentry from "@sentry/nextjs";

export default function TestSentryPage() {
  const [testResult, setTestResult] = useState<string>("");

  const testClientError = () => {
    try {
      setTestResult("Throwing test error...");
      throw new Error("Test error from Sentry - Client Side");
    } catch (error) {
      Sentry.captureException(error);
      setTestResult("✅ Error sent to Sentry! Check your dashboard.");
    }
  };

  const testManualCapture = () => {
    setTestResult("Sending test message...");
    Sentry.captureMessage("Test message from Sentry test page", "info");
    setTestResult("✅ Message sent to Sentry!");
  };

  const testWithContext = () => {
    Sentry.withScope((scope) => {
      scope.setTag("test-type", "manual-test");
      scope.setContext("test", {
        page: "test-sentry",
        timestamp: new Date().toISOString(),
      });
      Sentry.captureException(new Error("Test error with context"));
      setTestResult("✅ Error with context sent to Sentry!");
    });
  };

  return (
    <div className="min-h-screen bg-void p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-primary mb-2">
            Sentry Test Page
          </h1>
          <p className="text-secondary">
            Use these buttons to test Sentry error tracking. Check your Sentry
            dashboard to see if errors appear.
          </p>
        </div>

        <div className="space-y-4">
          <Button variant="primary" onClick={testClientError}>
            Test Client-Side Error
          </Button>

          <Button variant="primary" onClick={testManualCapture}>
            Test Manual Message
          </Button>

          <Button variant="primary" onClick={testWithContext}>
            Test Error with Context
          </Button>
        </div>

        {testResult && (
          <div className="p-4 bg-surface rounded-lg border border-border">
            <p className="text-primary">{testResult}</p>
          </div>
        )}

        <div className="mt-8 p-4 bg-surface rounded-lg border border-border">
          <h2 className="text-lg font-semibold text-primary mb-2">
            How to Verify
          </h2>
          <ol className="list-decimal list-inside space-y-2 text-secondary">
            <li>Click any test button above</li>
            <li>
              Go to{" "}
              <a
                href="https://sentry.io"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline"
              >
                https://sentry.io
              </a>{" "}
              and open your project
            </li>
            <li>Check the "Issues" tab - you should see the error appear within a few seconds</li>
            <li>Click on the error to see details, stack trace, and user context</li>
          </ol>
        </div>

        <div className="mt-4 p-4 bg-surface rounded-lg border border-border">
          <h2 className="text-lg font-semibold text-primary mb-2">
            Browser Console Test
          </h2>
          <p className="text-secondary mb-2">
            You can also test directly from the browser console:
          </p>
          <code className="block p-2 bg-void rounded text-sm text-primary">
            throw new Error("Test error from console");
          </code>
        </div>
      </div>
    </div>
  );
}

