"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Button, Card, Input, Textarea, Select, Badge } from "@crowdstack/ui";
import { CheckCircle2, ArrowRight, Mail, Building2, Calendar, Users } from "lucide-react";

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
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to send message");
      }

      setSubmitted(true);
    } catch (err) {
      console.error("Form submission error:", err);
      setError(err instanceof Error ? err.message : "Failed to send message. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-void pt-24 pb-12">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card className="text-center p-12">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.5, delay: 0.2, type: "spring" }}
                className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-accent-success/10 mb-6"
              >
                <CheckCircle2 className="h-8 w-8 text-accent-success" />
              </motion.div>
              <h2 className="page-title mb-4">Thank you!</h2>
              <p className="text-lg text-secondary mb-2">
                We&apos;ve received your request and will contact you within 24 hours.
              </p>
              <p className="text-sm text-muted">
                We look forward to speaking with you soon.
              </p>
            </Card>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-void pt-24 pb-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mb-6"
          >
            <Badge color="purple" variant="solid" className="mb-4">
              FOR BUSINESS
            </Badge>
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-muted block">
              Get Started
            </span>
          </motion.div>
          
          <h1 className="page-title mb-4">
            Request a Demo
          </h1>
          <p className="text-lg text-secondary max-w-2xl mx-auto">
            Let&apos;s discuss how CrowdStack can streamline your event management and help you grow your business.
          </p>
        </motion.div>

        {/* Form Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Card className="p-8">
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

            {error && (
              <div className="p-3 rounded-lg bg-accent-error/10 border border-accent-error/20 text-accent-error text-sm">
                {error}
              </div>
            )}

              <Button
                type="submit"
                disabled={loading}
                loading={loading}
                className="w-full"
                size="lg"
                variant="primary"
              >
                Request Demo
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </form>
          </Card>

          {/* Additional Info Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            <Card className="p-6 text-center border-border-subtle">
              <div className="w-12 h-12 rounded-xl bg-accent-primary/10 flex items-center justify-center mx-auto mb-4">
                <Mail className="h-6 w-6 text-accent-primary" />
              </div>
              <h3 className="font-sans text-base font-bold text-primary mb-2">Quick Response</h3>
              <p className="text-sm text-secondary">
                We&apos;ll get back to you within 24 hours
              </p>
            </Card>

            <Card className="p-6 text-center border-border-subtle">
              <div className="w-12 h-12 rounded-xl bg-accent-secondary/10 flex items-center justify-center mx-auto mb-4">
                <Building2 className="h-6 w-6 text-accent-secondary" />
              </div>
              <h3 className="font-sans text-base font-bold text-primary mb-2">Custom Demo</h3>
              <p className="text-sm text-secondary">
                Tailored to your venue or organization
              </p>
            </Card>

            <Card className="p-6 text-center border-border-subtle">
              <div className="w-12 h-12 rounded-xl bg-accent-success/10 flex items-center justify-center mx-auto mb-4">
                <Users className="h-6 w-6 text-accent-success" />
              </div>
              <h3 className="font-sans text-base font-bold text-primary mb-2">Expert Support</h3>
              <p className="text-sm text-secondary">
                Our team will guide you through everything
              </p>
            </Card>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
