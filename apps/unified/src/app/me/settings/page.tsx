"use client";

import { useRouter } from "next/navigation";
import { Container, Section, Card, Button } from "@crowdstack/ui";
import { ArrowLeft } from "lucide-react";

export default function SettingsPage() {
  const router = useRouter();

  return (
    <Section spacing="xl">
      <Container size="sm">
        <div className="mb-8">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => router.back()}
            className="mb-4 flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <h1 className="text-4xl font-bold tracking-tight text-foreground">
            Settings
          </h1>
          <p className="mt-2 text-foreground-muted">
            Manage your account settings
          </p>
        </div>

        <Card>
          <div className="p-8 text-center">
            <p className="text-foreground-muted">
              Settings page coming soon
            </p>
          </div>
        </Card>
      </Container>
    </Section>
  );
}

