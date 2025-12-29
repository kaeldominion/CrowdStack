/**
 * Fetch SoundCloud track metadata (title and description)
 * Uses SoundCloud oEmbed API (no API key needed)
 */

interface SoundCloudMetadata {
  title: string;
  description: string | null;
  thumbnail_url: string | null;
}

/**
 * Resolve SoundCloud shortlink to full URL
 * Handles on.soundcloud.com and other shortlink formats by following redirects
 */
async function resolveSoundCloudShortlink(shortUrl: string): Promise<string | null> {
  try {
    // Follow redirects to get the final URL
    const response = await fetch(shortUrl, {
      method: "HEAD",
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; CrowdStack/1.0)",
      },
    });
    
    if (response.ok && response.url) {
      // Verify the resolved URL is actually a SoundCloud URL
      const resolvedUrl = new URL(response.url);
      if (resolvedUrl.hostname.includes("soundcloud.com")) {
        return response.url;
      }
    }
  } catch (error) {
    console.warn("Failed to resolve SoundCloud shortlink:", error);
  }
  
  return null;
}

/**
 * Normalize SoundCloud track URL (validate and normalize)
 * Handles shortlinks by resolving them to full URLs
 * Returns the full SoundCloud URL, or null if invalid
 */
export async function normalizeSoundCloudUrl(url: string): Promise<string | null> {
  if (!url || !url.trim()) {
    return null;
  }

  const trimmed = url.trim();

  // Already a full URL
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    try {
      const urlObj = new URL(trimmed);
      
      // If it's a shortlink, resolve it
      if (urlObj.hostname.includes("on.soundcloud.com") || 
          urlObj.hostname.includes("soundcloud.app.goo.gl")) {
        const resolved = await resolveSoundCloudShortlink(trimmed);
        if (resolved) {
          return resolved;
        }
        // If resolution failed, return null (invalid shortlink)
        return null;
      }
      
      // Check if it's a full soundcloud.com URL
      if (urlObj.hostname.includes("soundcloud.com")) {
        // Ensure it's HTTPS
        return urlObj.protocol === "https:" ? trimmed : trimmed.replace(/^http:/, "https:");
      }
    } catch {
      return null;
    }
  }

  // If it contains soundcloud.com, try to construct full URL
  if (trimmed.includes("soundcloud.com")) {
    const match = trimmed.match(/soundcloud\.com\/[^\s]+/);
    if (match) {
      return `https://${match[0]}`;
    }
    return null;
  }

  return null;
}

/**
 * Fetch SoundCloud track metadata using oEmbed API
 */
export async function fetchSoundCloudMetadata(soundcloudUrl: string): Promise<SoundCloudMetadata | null> {
  const normalizedUrl = await normalizeSoundCloudUrl(soundcloudUrl);
  
  if (!normalizedUrl) {
    return null;
  }

  try {
    // SoundCloud oEmbed endpoint
    const oembedUrl = `https://soundcloud.com/oembed?url=${encodeURIComponent(normalizedUrl)}&format=json`;
    const response = await fetch(oembedUrl);
    
    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    
    // Extract title from HTML or use provided title
    let title = data.title || '';
    
    // If title is in HTML format, extract text
    if (title.includes('<')) {
      const match = title.match(/>([^<]+)</);
      if (match && match[1]) {
        title = match[1].trim();
      }
    }

    // SoundCloud oEmbed doesn't provide description directly
    // We can extract it from the HTML if available, but it's limited
    let description: string | null = null;
    if (data.description) {
      description = data.description.trim() || null;
    }

    // Get thumbnail from HTML if available
    let thumbnailUrl: string | null = null;
    if (data.thumbnail_url) {
      thumbnailUrl = data.thumbnail_url;
    } else if (data.html) {
      // Try to extract thumbnail from HTML embed
      const imgMatch = data.html.match(/<img[^>]+src="([^"]+)"/);
      if (imgMatch && imgMatch[1]) {
        thumbnailUrl = imgMatch[1];
      }
    }

    return {
      title: title || '',
      description,
      thumbnail_url: thumbnailUrl,
    };
  } catch (error) {
    console.error('Error fetching SoundCloud oEmbed data:', error);
    return null;
  }
}

