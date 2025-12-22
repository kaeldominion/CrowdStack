"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { Ticket, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Logo, LoadingSpinner } from "@crowdstack/ui";

export default function QRPassPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const eventSlug = params.eventSlug as string;
  const tokenFromQuery = searchParams.get("token");
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [eventName, setEventName] = useState<string>("");
  const [venueName, setVenueName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch registration and QR token if not provided in URL
  useEffect(() => {
    const loadPassData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // If token is provided in URL, use it
        if (tokenFromQuery) {
          const qrData = encodeURIComponent(tokenFromQuery);
          const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${qrData}&bgcolor=ffffff&color=000000&margin=10`;
          setQrCodeUrl(qrUrl);
          setLoading(false);
          return;
        }
        
        // Otherwise, fetch registration status to get the token
        const response = await fetch(`/api/events/by-slug/${eventSlug}/check-registration`);
        if (!response.ok) {
          throw new Error("Failed to check registration");
        }
        
        const data = await response.json();
        if (!data.registered) {
          setError("You are not registered for this event");
          setLoading(false);
          return;
        }
        
        // Set event details from response
        if (data.event) {
          setEventName(data.event.name || "");
          setVenueName(data.event.venue?.name || "");
        }
        
        if (data.qr_pass_token) {
          const qrData = encodeURIComponent(data.qr_pass_token);
          const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${qrData}&bgcolor=ffffff&color=000000&margin=10`;
          setQrCodeUrl(qrUrl);
          
          // Update URL to include token for sharing/bookmarking
          if (typeof window !== "undefined") {
            const newUrl = new URL(window.location.href);
            newUrl.searchParams.set("token", data.qr_pass_token);
            window.history.replaceState({}, "", newUrl.toString());
          }
        } else {
          setError("QR pass token not available");
        }
      } catch (err: any) {
        console.error("Error loading pass data:", err);
        setError(err.message || "Failed to load pass");
      } finally {
        setLoading(false);
      }
    };
    
    if (eventSlug) {
      loadPassData();
    }
  }, [eventSlug, tokenFromQuery]);

  // Fetch event details (fallback if token is provided directly in URL)
  useEffect(() => {
    const fetchEventDetails = async () => {
      // Only fetch if we have a token in URL but no event details yet
      if (tokenFromQuery && !eventName) {
        try {
          const response = await fetch(`/api/events/by-slug/${eventSlug}`);
          if (response.ok) {
            const data = await response.json();
            setEventName(data.name || "");
            setVenueName(data.venue?.name || "");
          }
        } catch (err) {
          console.error("Failed to fetch event details:", err);
        }
      }
    };
    
    if (eventSlug) {
      fetchEventDetails();
    }
  }, [eventSlug, tokenFromQuery, eventName]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black">
      {/* Header */}
      <div className="p-4 flex items-center justify-between">
        <Logo size="sm" />
        <Link 
          href={`/e/${eventSlug}`}
          className="text-white/60 hover:text-white flex items-center gap-2 text-sm"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Event
        </Link>
      </div>

      <div className="flex flex-col items-center justify-center px-4 py-8">
        {/* Pass Card */}
        <div className="w-full max-w-sm bg-white rounded-2xl overflow-hidden shadow-2xl">
          {/* Header */}
          <div className="bg-gradient-to-r from-primary to-primary/80 p-6 text-white text-center">
            <Ticket className="h-8 w-8 mx-auto mb-2" />
            <h1 className="text-xl font-bold">Event Pass</h1>
            {eventName && (
              <p className="text-white/90 mt-2 font-medium">{eventName}</p>
            )}
            {venueName && (
              <p className="text-white/70 text-sm mt-1">{venueName}</p>
            )}
          </div>

          {/* QR Code */}
          <div className="p-8 flex flex-col items-center">
            {loading ? (
              <div className="w-64 h-64 bg-gray-100 rounded-xl flex items-center justify-center">
                <LoadingSpinner text="Loading QR code..." />
              </div>
            ) : error ? (
              <div className="w-64 h-64 bg-red-50 rounded-xl flex flex-col items-center justify-center p-4">
                <p className="text-red-600 text-center font-medium mb-2">{error}</p>
                <Link 
                  href={`/e/${eventSlug}/register`}
                  className="text-red-600 text-sm underline hover:no-underline"
                >
                  Register for this event
                </Link>
              </div>
            ) : qrCodeUrl ? (
              <>
                <div className="bg-white p-4 rounded-xl shadow-inner border-2 border-gray-100">
                  <img 
                    src={qrCodeUrl} 
                    alt="Event QR Pass" 
                    className="w-64 h-64"
                    style={{ imageRendering: "pixelated" }}
                  />
                </div>
                <p className="mt-6 text-gray-600 text-center text-sm">
                  Show this QR code at the event entrance
                </p>
                <p className="mt-2 text-gray-400 text-xs text-center">
                  Keep your screen brightness high for easy scanning
                </p>
              </>
            ) : null}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-100 p-4 bg-gray-50">
            <div className="flex items-center justify-center gap-2 text-gray-400 text-xs">
              <Logo size="sm" />
              <span>Powered by CrowdStack</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

