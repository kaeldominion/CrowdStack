"use client";

import { useState } from "react";
import { Button, Card, Input, Textarea, Select, Container, Section } from "@crowdstack/ui";
import { CheckCircle2 } from "lucide-react";

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    venueName: "",
    phone: "",
    message: "",
    interestType: "venue" as "venue" | "organizer" | "other",
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // TODO: Implement form submission to API route
      await new Promise(resolve => setTimeout(resolve, 1000));
      setSubmitted(true);
    } catch (error) {
      console.error("Form submission error:", error);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <Section spacing="xl">
        <Container size="md">
          <Card className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/10 mb-4">
              <CheckCircle2 className="h-8 w-8 text-success" />
            </div>
            <h2 className="text-2xl font-semibold text-foreground">Thank you!</h2>
            <p className="mt-2 text-foreground-muted">
              We&apos;ve received your request and will contact you within 24 hours.
            </p>
            <p className="mt-4 text-sm text-foreground-subtle">
              In the meantime, check out our <a href="/pricing" className="text-primary hover:text-primary-hover">pricing</a> page.
            </p>
          </Card>
        </Container>
      </Section>
    );
  }

  return (
    <Section spacing="xl">
      <Container size="md">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-foreground">Request a Demo</h1>
          <p className="mt-4 text-lg text-foreground-muted">
            Let&apos;s discuss how CrowdStack can streamline your event management
          </p>
        </div>

        <Card>
          <form onSubmit={handleSubmit} className="space-y-6">
            <Select
              label="I am a..."
              value={formData.interestType}
              onChange={(e) => setFormData({ ...formData, interestType: e.target.value as any })}
              options={[
                { value: "venue", label: "Venue Owner/Manager" },
                { value: "organizer", label: "Event Organizer" },
                { value: "other", label: "Other" },
              ]}
            />

            <Input
              label="Your Name"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />

            {formData.interestType === "venue" && (
              <Input
                label="Venue Name"
                required
                value={formData.venueName}
                onChange={(e) => setFormData({ ...formData, venueName: e.target.value })}
              />
            )}

            <Input
              label="Email"
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />

            <Input
              label="Phone (optional)"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />

            <Textarea
              label="Tell us about your needs"
              required
              rows={6}
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              placeholder="What events do you host? How many attendees per event? Any specific features you're interested in?"
            />

            <Button
              type="submit"
              disabled={loading}
              loading={loading}
              className="w-full"
              size="lg"
            >
              Request Demo
            </Button>
          </form>
        </Card>
      </Container>
    </Section>
  );
}
