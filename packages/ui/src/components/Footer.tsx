"use client";

import { getAppVersion, getEnvironmentLabel } from "@crowdstack/shared";

export function Footer() {
  const version = getAppVersion();
  const envLabel = getEnvironmentLabel();

  return (
    <footer className="border-t border-gray-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-sm text-gray-600">
            © {new Date().getFullYear()} CrowdStack. All rights reserved.
          </p>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span className="font-mono">
              v{version}
            </span>
            <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium">
              {envLabel}
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}

