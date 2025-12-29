/**
 * Fetch YouTube video metadata (title and description)
 * Uses YouTube oEmbed API for title (no API key needed)
 * Falls back to YouTube Data API v3 if API key is available (for description)
 */

interface YouTubeMetadata {
  title: string;
  description: string | null;
  thumbnail_url: string;
}

/**
 * Extract YouTube video ID from URL
 */
export function extractYouTubeVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/,
    /youtube\.com\/watch\?v=([^"&?\/\s]{11})/,
    /youtu\.be\/([^"&?\/\s]{11})/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

/**
 * Fetch YouTube video metadata using oEmbed API (no API key needed)
 * Returns title and thumbnail, but not description
 */
async function fetchYouTubeMetadataOEmbed(videoId: string): Promise<{ title: string; thumbnail_url: string } | null> {
  try {
    const response = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
    
    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return {
      title: data.title || '',
      thumbnail_url: data.thumbnail_url || `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
    };
  } catch (error) {
    console.error('Error fetching YouTube oEmbed data:', error);
    return null;
  }
}

/**
 * Fetch YouTube video metadata using Data API v3 (requires API key)
 * Returns title, description, and thumbnail
 */
async function fetchYouTubeMetadataDataAPI(videoId: string): Promise<YouTubeMetadata | null> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  
  if (!apiKey) {
    return null;
  }

  try {
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${apiKey}&part=snippet`
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    
    if (!data.items || data.items.length === 0) {
      return null;
    }

    const snippet = data.items[0].snippet;
    return {
      title: snippet.title || '',
      description: snippet.description || null,
      thumbnail_url: snippet.thumbnails?.maxres?.url || snippet.thumbnails?.high?.url || `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
    };
  } catch (error) {
    console.error('Error fetching YouTube Data API:', error);
    return null;
  }
}

/**
 * Fetch YouTube video metadata
 * Tries Data API v3 first (if API key available), falls back to oEmbed
 */
export async function fetchYouTubeMetadata(youtubeUrl: string): Promise<YouTubeMetadata | null> {
  const videoId = extractYouTubeVideoId(youtubeUrl);
  
  if (!videoId) {
    return null;
  }

  // Try Data API first (has description)
  const dataApiResult = await fetchYouTubeMetadataDataAPI(videoId);
  if (dataApiResult) {
    return dataApiResult;
  }

  // Fall back to oEmbed (no description)
  const oEmbedResult = await fetchYouTubeMetadataOEmbed(videoId);
  if (oEmbedResult) {
    return {
      ...oEmbedResult,
      description: null,
    };
  }

  return null;
}



