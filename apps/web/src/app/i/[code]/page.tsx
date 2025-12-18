"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Container, Section, Button, Input, Card } from "@crowdstack/ui";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

export default function InviteCodePage() {
  const params = useParams();
  const router = useRouter();
  const code = params.code as string;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [event, setEvent] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
  });

  useEffect(() => {
    loadInviteCode();
  }, [code]);

  const loadInviteCode = async () => {
    try {
      const response = await fetch(`/api/i/${code}`);
      if (!response.ok) {
        setError("Invalid invite code");
        return;
      }
      const data = await response.json();
      setEvent(data.event);
    } catch (err) {
      setError("Failed to load invite");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Register for event with referral attribution
      const response = await fetch(`/api/events/${event.slug}/register?ref=${code}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Registration failed");
      }

      const data = await response.json();
      // Redirect to pass page
      router.push(`/e/${event.slug}/pass`);
    } catch (err: any) {
      setError(err.message || "Failed to register");
    } finally {
      setLoading(false);
    }
  };

  if (loading && !event) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-foreground-muted" />
      </div>
    );
  }

  if (error && !event) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card>
          <div className="p-8 text-center">
            <XCircle className="h-12 w-12 text-error mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-foreground mb-2">Invalid Invite Code</h1>
            <p className="text-foreground-muted">{error}</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Section spacing="lg">
        <Container>
          <div className="max-w-md mx-auto">
            <Card>
              <div className="p-8">
                <div className="text-center mb-8">
                  <CheckCircle2 className="h-12 w-12 text-primary mx-auto mb-4" />
                  <h1 className="text-2xl font-bold text-foreground mb-2">You're Invited!</h1>
                  <p className="text-foreground-muted">{event?.name}</p>
                  {event?.start_time && (
                    <p className="text-sm text-foreground-muted mt-2">
                      {new Date(event.start_time).toLocaleDateString()} at{" "}
                      {new Date(event.start_time).toLocaleTimeString()}
                    </p>
                  )}
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <Input
                    label="Name"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                  <Input
                    label="Email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                  <Input
                    label="Phone"
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />

                  {error && (
                    <div className="p-3 rounded-md bg-error/10 border border-error/20 text-error text-sm">
                      {error}
                    </div>
                  )}

                  <Button type="submit" className="w-full" loading={loading}>
                    Register for Event
                  </Button>
                </form>
              </div>
            </Card>
          </div>
        </Container>
      </Section>
    </div>
  );
}

