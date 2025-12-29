"use client";

import { useRef } from "react";
import { Card } from "@crowdstack/ui";

interface MixEmbedProps {
  soundcloudUrl: string;
  soundcloudEmbedUrl?: string | null;
  title?: string;
}

export function MixEmbed({ soundcloudUrl, soundcloudEmbedUrl, title }: MixEmbedProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Use provided embed URL or generate landscape player
  // visual=false gives us the classic landscape waveform player
  const embedUrl = soundcloudEmbedUrl?.replace('visual=true', 'visual=false') || 
    `https://w.soundcloud.com/player/?url=${encodeURIComponent(soundcloudUrl)}&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&visual=false&color=%239933ff`;

  return (
    <Card className="p-0 overflow-hidden rounded-lg">
      <iframe
        ref={iframeRef}
        width="100%"
        height="166"
        scrolling="no"
        frameBorder="no"
        allow="autoplay"
        src={embedUrl}
        className="w-full"
        style={{ height: "166px" }}
        title={title || "SoundCloud Mix"}
      />
    </Card>
  );
}

