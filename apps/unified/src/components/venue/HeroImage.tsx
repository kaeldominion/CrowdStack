"use client";

import { useState, useEffect } from "react";

interface HeroImageProps {
  src: string | null;
  alt: string;
}

export function HeroImage({ src, alt }: HeroImageProps) {
  const [imageError, setImageError] = useState(false);
  const [imageSrc, setImageSrc] = useState(src);

  // Update imageSrc when src prop changes
  useEffect(() => {
    if (src !== imageSrc) {
      setImageSrc(src);
      setImageError(false); // Reset error when src changes
    }
  }, [src, imageSrc]);

  if (!imageSrc || imageError) {
    return (
      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5" />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={imageSrc}
      alt={alt}
      className="absolute inset-0 w-full h-full object-cover"
      loading="eager"
      decoding="async"
      onError={() => {
        setImageError(true);
      }}
    />
  );
}

