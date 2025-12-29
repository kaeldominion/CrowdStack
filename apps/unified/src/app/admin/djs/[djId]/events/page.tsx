"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, Container, Section, Button } from "@crowdstack/ui";
import { ArrowLeft, Calendar } from "lucide-react";

export default function AdminDJEventsPage() {
  const params = useParams();
  const djId = params.djId as string;

  return (
    <Container>
      <Section>
        <div className="flex items-center gap-4 mb-6">
          <Link href={`/admin/djs/${djId}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-3xl font-bold tracking-tighter text-white mb-2">
              DJ Events
            </h1>
            <p className="text-white/60">
              View upcoming and past events for this DJ
            </p>
          </div>
        </div>

        <Card className="p-12 text-center">
          <Calendar className="h-12 w-12 text-white/20 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Event Management</h2>
          <p className="text-white/60 mb-4">
            Event listing interface will be available here soon.
          </p>
          <p className="text-sm text-white/40">
            For now, you can view events from the DJ's public profile.
          </p>
        </Card>
      </Section>
    </Container>
  );
}



