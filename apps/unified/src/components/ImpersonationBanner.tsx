"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, X, LogOut } from "lucide-react";
import { Button } from "@crowdstack/ui";

interface ImpersonationData {
  impersonating: boolean;
  adminUserId?: string;
  adminEmail?: string;
  targetUserId?: string;
  targetEmail?: string;
  startedAt?: string;
}

export function ImpersonationBanner() {
  const router = useRouter();
  const [data, setData] = useState<ImpersonationData | null>(null);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    checkImpersonation();
  }, []);

  const checkImpersonation = async () => {
    try {
      const response = await fetch("/api/admin/impersonate");
      if (response.ok) {
        const impersonationData = await response.json();
        setData(impersonationData);
      }
    } catch (error) {
      console.error("Failed to check impersonation status:", error);
    }
  };

  const exitImpersonation = async () => {
    setExiting(true);
    try {
      const response = await fetch("/api/admin/impersonate", {
        method: "DELETE",
      });
      if (response.ok) {
        // Redirect to admin dashboard
        router.push("/admin");
        router.refresh();
      }
    } catch (error) {
      console.error("Failed to exit impersonation:", error);
    } finally {
      setExiting(false);
    }
  };

  if (!data?.impersonating) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-accent-warning text-void">
      <div className="container mx-auto px-4 py-2">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 flex-shrink-0" />
            <div className="text-sm">
              <span className="font-bold">Impersonation Mode:</span>{" "}
              <span>
                Viewing as <strong>{data.targetEmail}</strong>
              </span>
              {data.startedAt && (
                <span className="opacity-75 ml-2">
                  (started {new Date(data.startedAt).toLocaleTimeString()})
                </span>
              )}
            </div>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={exitImpersonation}
            disabled={exiting}
            className="!bg-void !text-white hover:!bg-void/80 flex-shrink-0"
          >
            <LogOut className="h-4 w-4 mr-2" />
            {exiting ? "Exiting..." : "Exit Impersonation"}
          </Button>
        </div>
      </div>
    </div>
  );
}

