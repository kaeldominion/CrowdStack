"use client";

import { useEffect } from "react";
import { Button } from "@crowdstack/ui";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-void p-4">
      <div className="max-w-md w-full space-y-4 text-center">
        <h1 className="text-2xl font-bold text-primary">Something went wrong!</h1>
        <p className="text-secondary">
          {error.message || "An unexpected error occurred"}
        </p>
        {error.digest && (
          <p className="text-xs text-secondary">Error ID: {error.digest}</p>
        )}
        <div className="flex gap-4 justify-center pt-4">
          <Button variant="primary" onClick={reset}>
            Try again
          </Button>
          <Button variant="ghost" onClick={() => (window.location.href = "/")}>
            Go home
          </Button>
        </div>
      </div>
    </div>
  );
}

