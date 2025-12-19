"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createBrowserClient } from "@crowdstack/shared";

export default function InviteAcceptPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createBrowserClient();
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();

      if (!currentUser) {
        // Redirect to login
        router.push(`/login?redirect=/invite/${token}`);
        return;
      }

      setUser(currentUser);
      setLoading(false);
    };

    checkAuth();
  }, [token, router]);

  const handleAccept = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/invites/${token}/accept`, {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to accept invite");
      }

      // Redirect based on role
      const redirectUrl = getRedirectUrl(data.role);
      router.push(redirectUrl);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const getRedirectUrl = (role: string): string => {
    // In local dev, use same origin (3006). In production, use app subdomain
    const isLocalDev = typeof window !== "undefined" && 
                      (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
    // All routes are now on the same origin
    const appUrl = window.location.origin;
    
    switch (role) {
      case "venue_admin":
        return `${appUrl}/app/venue`;
      case "event_organizer":
        return `${appUrl}/app/organizer`;
      case "promoter":
        return `${appUrl}/app/promoter`;
      case "door_staff":
        return `${appUrl}/door`;
      default:
        return "/me";
    }
  };

  if (loading && !user) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 sm:px-6 lg:px-8">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:px-6 lg:px-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
          Accept Invite
        </h1>
        <p className="mt-4 text-lg text-gray-600">
          You&apos;ve been invited to join CrowdStack
        </p>
      </div>

      <div className="mt-12">
        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-4 text-red-800">
            <p className="text-sm">{error}</p>
          </div>
        )}

        <button
          onClick={handleAccept}
          disabled={loading}
          className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {loading ? "Accepting..." : "Accept Invite"}
        </button>
      </div>
    </div>
  );
}

