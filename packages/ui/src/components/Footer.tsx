"use client";

import { getAppVersion, getEnvironmentLabel } from "@crowdstack/shared";

export function Footer() {
  const version = getAppVersion();
  const envLabel = getEnvironmentLabel();

  return (
    <footer className="border-t border-[#2A2F3A] bg-[#0B0D10]">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-sm text-white/60">
            © {new Date().getFullYear()} CrowdStack. All rights reserved.
          </p>
          <div className="flex items-center gap-4 text-sm text-white/60">
            <span className="font-mono text-xs">
              v{version}
            </span>
            <span className="rounded-md bg-[#141821] border border-[#2A2F3A] px-2 py-1 text-xs font-medium text-white/80">
              {envLabel}
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}

