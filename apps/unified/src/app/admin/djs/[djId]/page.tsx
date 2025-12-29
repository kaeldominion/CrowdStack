"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, Container, Section, Button, LoadingSpinner } from "@crowdstack/ui";
import { Radio, ArrowLeft, Settings, Music, Calendar, BarChart3, Image as ImageIcon, Video } from "lucide-react";
import Image from "next/image";

export default function AdminDJDetailPage() {
  const params = useParams();
  const router = useRouter();
  const djId = params.djId as string;
  const [dj, setDJ] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDJ();
  }, [djId]);

  const loadDJ = async () => {
    try {
      const response = await fetch(`/api/admin/djs/${djId}`);
      if (!response.ok) throw new Error("Failed to load DJ");
      const data = await response.json();
      setDJ(data.dj);
    } catch (error) {
      console.error("Failed to load DJ:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Container>
        <Section>
          <div className="flex justify-center items-center min-h-[400px]">
            <LoadingSpinner size="lg" />
          </div>
        </Section>
      </Container>
    );
  }

  if (!dj) {
    return (
      <Container>
        <Section>
          <Card className="p-12 text-center">
            <h2 className="text-xl font-semibold text-white mb-2">DJ not found</h2>
            <p className="text-white/60 mb-4">The DJ profile you're looking for doesn't exist.</p>
            <Button onClick={() => router.push("/admin/djs")}>Back to DJs</Button>
          </Card>
        </Section>
      </Container>
    );
  }

  return (
    <Container>
      <Section>
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/admin/djs")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold tracking-tighter text-white mb-2">
              Manage DJ: {dj.name}
            </h1>
            <p className="text-white/60">
              {dj.handle && (
                <>
                  <code className="text-sm bg-white/10 px-2 py-1 rounded">{dj.handle}</code>
                  {" · "}
                </>
              )}
              <Link
                href={`/dj/${dj.handle}`}
                target="_blank"
                className="text-primary hover:underline"
              >
                View Public Profile
              </Link>
            </p>
          </div>
        </div>

        {/* DJ Info Card */}
        <Card className="mb-6">
          <div className="flex items-center gap-6">
            {dj.profile_image_url ? (
              <div className="relative w-24 h-24 rounded-2xl overflow-hidden flex-shrink-0">
                <Image
                  src={dj.profile_image_url}
                  alt={dj.name}
                  fill
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-3xl font-bold flex-shrink-0">
                {dj.name?.[0]?.toUpperCase() || "D"}
              </div>
            )}
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-white mb-2">{dj.name}</h2>
              {dj.location && (
                <p className="text-white/60 mb-2">{dj.location}</p>
              )}
              {dj.email && (
                <p className="text-sm text-white/60">{dj.email}</p>
              )}
            </div>
          </div>
        </Card>

        {/* Management Links */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link href={`/admin/djs/${djId}/profile`}>
            <Card hover className="h-full cursor-pointer">
              <div className="flex flex-col items-center text-center p-6">
                <Settings className="h-8 w-8 text-primary mb-3" />
                <h3 className="font-semibold text-white mb-2">Profile</h3>
                <p className="text-sm text-white/60">
                  Edit profile info, bio, genres, and links
                </p>
              </div>
            </Card>
          </Link>

          <Link href={`/admin/djs/${djId}/mixes`}>
            <Card hover className="h-full cursor-pointer">
              <div className="flex flex-col items-center text-center p-6">
                <Music className="h-8 w-8 text-primary mb-3" />
                <h3 className="font-semibold text-white mb-2">Mixes</h3>
                <p className="text-sm text-white/60">
                  Manage mixes and featured content
                </p>
              </div>
            </Card>
          </Link>

          <Link href={`/admin/djs/${djId}/events`}>
            <Card hover className="h-full cursor-pointer">
              <div className="flex flex-col items-center text-center p-6">
                <Calendar className="h-8 w-8 text-primary mb-3" />
                <h3 className="font-semibold text-white mb-2">Events</h3>
                <p className="text-sm text-white/60">
                  View upcoming and past events
                </p>
              </div>
            </Card>
          </Link>

          <Link href={`/admin/djs/${djId}/media`}>
            <Card hover className="h-full cursor-pointer">
              <div className="flex flex-col items-center text-center p-6">
                <ImageIcon className="h-8 w-8 text-primary mb-3" />
                <h3 className="font-semibold text-white mb-2">Media</h3>
                <p className="text-sm text-white/60">
                  Manage gallery images and videos
                </p>
              </div>
            </Card>
          </Link>
        </div>
      </Section>
    </Container>
  );
}



