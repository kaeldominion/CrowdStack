"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, Container, Section, Button } from "@crowdstack/ui";
import { ArrowLeft, Music } from "lucide-react";

export default function AdminDJMixesPage() {
  const params = useParams();
  const router = useRouter();
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
              Manage Mixes
            </h1>
            <p className="text-white/60">
              Mix management coming soon
            </p>
          </div>
        </div>

        <Card className="p-12 text-center">
          <Music className="h-12 w-12 text-white/20 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Mix Management</h2>
          <p className="text-white/60 mb-4">
            Full mix management interface will be available here soon.
          </p>
          <p className="text-sm text-white/40">
            For now, you can manage the DJ profile from the main management page.
          </p>
        </Card>
      </Section>
    </Container>
  );
}



