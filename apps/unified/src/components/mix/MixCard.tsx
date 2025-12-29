"use client";

import { Card } from "@crowdstack/ui";
import { Radio, Eye } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { Mix } from "@crowdstack/shared/types";

interface MixCardProps {
  mix: Mix;
  djHandle?: string;
  showPlayCount?: boolean;
}

export function MixCard({ mix, djHandle, showPlayCount = true }: MixCardProps) {
  const mixUrl = djHandle ? `/dj/${djHandle}/mix/${mix.id}` : "#";

  return (
    <Link href={mixUrl}>
      <Card className="p-0 overflow-hidden hover:bg-white/5 transition-colors cursor-pointer h-full">
        <div className="aspect-video bg-black relative">
          {mix.cover_image_url ? (
            <Image
              src={mix.cover_image_url}
              alt={mix.title}
              fill
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-900/50 to-purple-900/50">
              <Radio className="h-12 w-12 text-white/20" />
            </div>
          )}
          {mix.is_featured && (
            <div className="absolute top-2 right-2 px-2 py-1 bg-yellow-500/90 text-yellow-900 text-xs font-bold rounded">
              Featured
            </div>
          )}
        </div>
        <div className="p-4">
          <h3 className="font-semibold text-white mb-1 truncate">{mix.title}</h3>
          {mix.description && (
            <p className="text-sm text-white/60 mb-2 line-clamp-2">{mix.description}</p>
          )}
          <div className="flex items-center justify-between text-xs text-white/40">
            {showPlayCount && (
              <span className="flex items-center gap-1">
                <Eye className="h-3 w-3" />
                {mix.plays_count || 0} plays
              </span>
            )}
            <a
              href={mix.soundcloud_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-primary hover:underline"
            >
              Play on SoundCloud →
            </a>
          </div>
        </div>
      </Card>
    </Link>
  );
}



