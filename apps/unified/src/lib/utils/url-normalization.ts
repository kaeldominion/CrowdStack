/**
 * Normalize Instagram URL/handle to full URL format
 * Accepts: handle, @handle, instagram.com/handle, https://instagram.com/handle
 * Returns: https://instagram.com/handle (or null if invalid)
 */
export function normalizeInstagramUrl(input: string | null | undefined): string | null {
  if (!input || !input.trim()) {
    return null;
  }

  const trimmed = input.trim();

  // If it's already a full URL, validate and return
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    try {
      const url = new URL(trimmed);
      // Extract handle from various Instagram URL formats
      const pathname = url.pathname.replace(/^\//, "").replace(/\/$/, "");
      
      if (url.hostname.includes("instagram.com")) {
        const handle = pathname.split("/")[0];
        if (handle) {
          return `https://instagram.com/${handle}`;
        }
      }
      
      return null;
    } catch {
      return null;
    }
  }

  // If it contains "instagram.com", extract the handle
  if (trimmed.includes("instagram.com")) {
    const match = trimmed.match(/instagram\.com\/([a-zA-Z0-9._]+)/);
    if (match && match[1]) {
      return `https://instagram.com/${match[1]}`;
    }
    return null;
  }

  // Otherwise, treat it as a handle (with or without @)
  const handle = trimmed.replace(/^@/, "").replace(/[^a-zA-Z0-9._]/g, "");
  if (handle.length > 0) {
    return `https://instagram.com/${handle}`;
  }

  return null;
}

/**
 * Normalize website URL to full URL format
 * Accepts: domain.com, www.domain.com, http://domain.com, https://domain.com
 * Returns: https://domain.com (or null if invalid)
 */
export function normalizeWebsiteUrl(input: string | null | undefined): string | null {
  if (!input || !input.trim()) {
    return null;
  }

  const trimmed = input.trim();

  // If it's already a full URL, validate and return
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    try {
      const url = new URL(trimmed);
      // Ensure it's HTTPS
      return url.protocol === "https:" ? trimmed : `https://${url.hostname}${url.pathname}${url.search}${url.hash}`;
    } catch {
      return null;
    }
  }

  // If it looks like a domain (contains a dot), add https://
  if (trimmed.includes(".") && !trimmed.includes(" ")) {
    // Remove www. prefix (we'll keep it if user provides it, but normalize protocol)
    const domain = trimmed.replace(/^www\./, "").split("/")[0];
    
    // Basic domain validation (must contain a dot and valid characters)
    if (/^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\.[a-zA-Z]{2,}/.test(domain)) {
      return `https://${trimmed}`;
    }
  }

  return null;
}

/**
 * Normalize Mixcloud URL/handle to full URL format
 * Accepts: handle, mixcloud.com/handle, https://mixcloud.com/handle
 * Returns: https://mixcloud.com/handle (or null if invalid)
 */
export function normalizeMixcloudUrl(input: string | null | undefined): string | null {
  if (!input || !input.trim()) {
    return null;
  }

  const trimmed = input.trim();

  // If it's already a full URL, validate and return
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    try {
      const url = new URL(trimmed);
      // Extract handle from various Mixcloud URL formats
      const pathname = url.pathname.replace(/^\//, "").replace(/\/$/, "");
      
      if (url.hostname.includes("mixcloud.com")) {
        const handle = pathname.split("/")[0];
        if (handle) {
          return `https://mixcloud.com/${handle}`;
        }
      }
      
      return null;
    } catch {
      return null;
    }
  }

  // If it contains "mixcloud.com", extract the handle
  if (trimmed.includes("mixcloud.com")) {
    const match = trimmed.match(/mixcloud\.com\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      return `https://mixcloud.com/${match[1]}`;
    }
    return null;
  }

  // Otherwise, treat it as a handle
  const handle = trimmed.replace(/[^a-zA-Z0-9_-]/g, "");
  if (handle.length > 0) {
    return `https://mixcloud.com/${handle}`;
  }

  return null;
}

/**
 * Normalize Spotify URL to full URL format
 * Accepts: spotify.com/artist/..., open.spotify.com/artist/..., https://spotify.com/artist/...
 * Returns: https://open.spotify.com/... (or null if invalid)
 */
export function normalizeSpotifyUrl(input: string | null | undefined): string | null {
  if (!input || !input.trim()) {
    return null;
  }

  const trimmed = input.trim();

  // If it's already a full URL, validate and normalize
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    try {
      const url = new URL(trimmed);
      
      if (url.hostname.includes("spotify.com")) {
        // Normalize to open.spotify.com
        const path = url.pathname + url.search + url.hash;
        return `https://open.spotify.com${path}`;
      }
      
      return null;
    } catch {
      return null;
    }
  }

  // If it contains "spotify.com", extract the path and normalize
  if (trimmed.includes("spotify.com")) {
    const match = trimmed.match(/spotify\.com(\/[^\s]+)/);
    if (match && match[1]) {
      return `https://open.spotify.com${match[1]}`;
    }
    return null;
  }

  // If it starts with a path (e.g., /artist/...), assume it's a Spotify path
  if (trimmed.startsWith("/") && trimmed.length > 1) {
    return `https://open.spotify.com${trimmed}`;
  }

  return null;
}

/**
 * Normalize YouTube URL to full URL format
 * Accepts: handle (@channel), youtube.com/@channel, youtube.com/channel/..., youtube.com/user/..., youtu.be/..., https://youtube.com/...
 * Returns: https://youtube.com/... (or null if invalid)
 */
export function normalizeYoutubeUrl(input: string | null | undefined): string | null {
  if (!input || !input.trim()) {
    return null;
  }

  const trimmed = input.trim();

  // If it's already a full URL, validate and normalize
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    try {
      const url = new URL(trimmed);
      
      // Handle youtube.com and youtu.be
      if (url.hostname.includes("youtube.com") || url.hostname.includes("youtu.be")) {
        // Normalize to youtube.com
        if (url.hostname.includes("youtu.be")) {
          // Convert youtu.be/videoId to youtube.com/watch?v=videoId
          const videoId = url.pathname.replace(/^\//, "");
          if (videoId) {
            return `https://youtube.com/watch?v=${videoId}`;
          }
        } else {
          // Keep as youtube.com but ensure HTTPS
          return `https://youtube.com${url.pathname}${url.search}${url.hash}`;
        }
      }
      
      return null;
    } catch {
      return null;
    }
  }

  // If it contains "youtube.com" or "youtu.be", extract and normalize
  if (trimmed.includes("youtube.com") || trimmed.includes("youtu.be")) {
    // Extract the path/query
    const youtubeMatch = trimmed.match(/(?:youtube\.com|youtu\.be)(\/[^\s]+|\?[^\s]+)/);
    if (youtubeMatch && youtubeMatch[1]) {
      if (trimmed.includes("youtu.be")) {
        const videoId = youtubeMatch[1].replace(/^\/|\?v=/g, "");
        return `https://youtube.com/watch?v=${videoId}`;
      }
      return `https://youtube.com${youtubeMatch[1]}`;
    }
    return null;
  }

  // If it starts with @, treat as YouTube handle
  if (trimmed.startsWith("@")) {
    const handle = trimmed.replace(/[^a-zA-Z0-9_@-]/g, "");
    if (handle.length > 1) {
      return `https://youtube.com/${handle}`;
    }
    return null;
  }

  // If it starts with a path, assume it's a YouTube path
  if (trimmed.startsWith("/") && trimmed.length > 1) {
    return `https://youtube.com${trimmed}`;
  }

  return null;
}

