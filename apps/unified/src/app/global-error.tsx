"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Global application error:", error);
  }, [error]);

  return (
    <html lang="en" className="dark">
      <body className="bg-[#0A0A0A] text-white antialiased">
        <div className="flex min-h-screen flex-col items-center justify-center p-4">
          <div className="max-w-md w-full space-y-4 text-center">
            <h1 className="text-2xl font-bold">Something went wrong!</h1>
            <p className="text-gray-400">
              {error.message || "An unexpected error occurred"}
            </p>
            {error.digest && (
              <p className="text-xs text-gray-500">Error ID: {error.digest}</p>
            )}
            <div className="flex gap-4 justify-center pt-4">
              <button
                onClick={reset}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Try again
              </button>
              <button
                onClick={() => (window.location.href = "/")}
                className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600"
              >
                Go home
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}

