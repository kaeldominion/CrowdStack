"use client";

import { useState, useEffect } from "react";
import { Card, Button } from "@crowdstack/ui";
import { Radio, MapPin, UserMinus, ExternalLink } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { createBrowserClient } from "@crowdstack/shared";

interface FollowedDJ {
  id: string;
  handle: string;
  name: string;
  profile_image_url: string | null;
  bio: string | null;
  genres: string[] | null;
  location: string | null;
  soundcloud_url: string | null;
  instagram_url: string | null;
}

export default function FollowingPage() {
  const [loading, setLoading] = useState(true);
  const [djs, setDJs] = useState<FollowedDJ[]>([]);

  useEffect(() => {
    loadFollowing();
  }, []);

  const loadFollowing = async () => {
    try {
      const response = await fetch("/api/me/following");
      if (!response.ok) throw new Error("Failed to load followed DJs");
      const data = await response.json();
      setDJs(data.djs || []);
    } catch (error) {
      console.error("Failed to load followed DJs:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUnfollow = async (djId: string) => {
    try {
      const response = await fetch(`/api/djs/${djId}/follow`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to unfollow");

      // Reload the list
      await loadFollowing();
    } catch (error) {
      console.error("Failed to unfollow:", error);
      alert("Failed to unfollow DJ");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-secondary">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tighter text-white">Following</h1>
        <p className="mt-2 text-sm text-white/60">DJs you're following</p>
      </div>

      {djs.length === 0 && (
        <Card className="p-8 text-center">
          <Radio className="h-12 w-12 text-white/20 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">Not following anyone yet</h3>
          <p className="text-white/60 mb-4">Discover DJs and start following them to see their latest mixes and events.</p>
          <Link href="/">
            <Button variant="secondary">Browse Events</Button>
          </Link>
        </Card>
      )}

      {djs.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {djs.map((dj) => (
            <Card key={dj.id} className="p-4">
              <div className="flex items-start gap-4">
                <Link href={`/dj/${dj.handle}`}>
                  {dj.profile_image_url ? (
                    <div className="relative w-16 h-16 rounded-full overflow-hidden flex-shrink-0 border-2 border-border-subtle cursor-pointer">
                      <Image
                        src={dj.profile_image_url}
                        alt={dj.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-lg font-bold flex-shrink-0 border-2 border-border-subtle cursor-pointer">
                      {dj.name[0].toUpperCase()}
                    </div>
                  )}
                </Link>

                <div className="flex-1 min-w-0">
                  <Link href={`/dj/${dj.handle}`}>
                    <h3 className="font-semibold text-white mb-1 hover:text-primary transition-colors">
                      {dj.name}
                    </h3>
                  </Link>

                  {dj.location && (
                    <div className="flex items-center gap-1 text-xs text-white/60 mb-2">
                      <MapPin className="h-3 w-3" />
                      <span>{dj.location}</span>
                    </div>
                  )}

                  {dj.genres && dj.genres.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {dj.genres.slice(0, 3).map((genre) => (
                        <span
                          key={genre}
                          className="px-2 py-0.5 bg-glass border border-border-subtle rounded text-xs text-white/60"
                        >
                          {genre}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-2 mt-3">
                    <Link href={`/dj/${dj.handle}`}>
                      <Button variant="secondary" size="sm">
                        View Profile
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleUnfollow(dj.id)}
                    >
                      <UserMinus className="h-4 w-4 mr-1" />
                      Unfollow
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}



