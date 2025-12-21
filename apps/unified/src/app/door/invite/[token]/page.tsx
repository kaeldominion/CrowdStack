"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, Button, LoadingSpinner } from "@crowdstack/ui";
import { QrCode, Calendar, MapPin, CheckCircle2, XCircle } from "lucide-react";
import Link from "next/link";

interface InviteData {
  id: string;
  email: string | null;
  expires_at: string;
  event: {
    id: string;
    name: string;
    start_time: string;
    venue?: { name: string };
  };
}

export default function DoorStaffInvitePage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [invite, setInvite] = useState<InviteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [needsLogin, setNeedsLogin] = useState(false);

  useEffect(() => {
    loadInvite();
  }, [token]);

  const loadInvite = async () => {
    try {
      const response = await fetch(`/api/door/invite/${token}`);
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Invalid invite");
        return;
      }

      setInvite(data.invite);
    } catch (err) {
      setError("Failed to load invite");
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    setAccepting(true);
    try {
      const response = await fetch(`/api/door/invite/${token}`, {
        method: "POST",
      });

      const data = await response.json();

      if (response.status === 401) {
        setNeedsLogin(true);
        return;
      }

      if (!response.ok) {
        setError(data.error || "Failed to accept invite");
        return;
      }

      setAccepted(true);
      
      // Redirect to door scanner after 2 seconds
      setTimeout(() => {
        router.push(`/door/${invite?.event.id}`);
      }, 2000);
    } catch (err) {
      setError("Failed to accept invite");
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <LoadingSpinner text="Loading invite..." size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <Card className="max-w-md w-full bg-white/5 border-white/10">
          <div className="p-8 text-center">
            <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-white mb-2">Invalid Invite</h1>
            <p className="text-white/60 mb-6">{error}</p>
            <Link href="/login">
              <Button variant="secondary">Go to Login</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  if (accepted) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <Card className="max-w-md w-full bg-white/5 border-white/10">
          <div className="p-8 text-center">
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-white mb-2">Access Granted!</h1>
            <p className="text-white/60 mb-4">
              You now have door staff access to this event.
            </p>
            <p className="text-white/40 text-sm">Redirecting to scanner...</p>
          </div>
        </Card>
      </div>
    );
  }

  if (needsLogin) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <Card className="max-w-md w-full bg-white/5 border-white/10">
          <div className="p-8 text-center">
            <QrCode className="h-16 w-16 text-indigo-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-white mb-2">Login Required</h1>
            <p className="text-white/60 mb-6">
              Please log in to accept this door staff invitation.
            </p>
            <Link href={`/login?redirect=/door/invite/${token}`}>
              <Button className="w-full">Log In to Continue</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <Card className="max-w-md w-full bg-white/5 border-white/10">
        <div className="p-8">
          <div className="text-center mb-6">
            <QrCode className="h-16 w-16 text-indigo-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-white mb-2">Door Staff Invitation</h1>
            <p className="text-white/60">
              You've been invited to work as door staff for this event.
            </p>
          </div>

          {invite && (
            <div className="bg-white/5 rounded-lg p-4 mb-6">
              <h2 className="text-xl font-bold text-white mb-3">{invite.event.name}</h2>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-white/60">
                  <Calendar className="h-4 w-4" />
                  <span>
                    {new Date(invite.event.start_time).toLocaleDateString("en-US", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-white/60">
                  <Calendar className="h-4 w-4" />
                  <span>
                    {new Date(invite.event.start_time).toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                {invite.event.venue && (
                  <div className="flex items-center gap-2 text-white/60">
                    <MapPin className="h-4 w-4" />
                    <span>{invite.event.venue.name}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <Button
            className="w-full"
            size="lg"
            onClick={handleAccept}
            disabled={accepting}
            loading={accepting}
          >
            Accept Invitation
          </Button>

          <p className="text-center text-white/40 text-sm mt-4">
            Expires: {invite ? new Date(invite.expires_at).toLocaleDateString() : "Unknown"}
          </p>
        </div>
      </Card>
    </div>
  );
}

