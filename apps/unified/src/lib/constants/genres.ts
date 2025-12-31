/**
 * Genre constants for the platform
 * - GENRES: Detailed list for DJs (50+ specific genres)
 * - VENUE_EVENT_GENRES: Curated list for Venues and Events (15-20 broader categories)
 * - GENRE_MAPPING: Maps venue/event genres to DJ genres for smart search
 */

// Detailed genres for DJs
export const GENRES = [
  // Electronic - House
  "House",
  "Tech House",
  "Deep House",
  "Afro House",
  "Progressive House",
  "Melodic House",
  
  // Electronic - Techno & Others
  "Techno",
  "Melodic Techno",
  "Trance",
  "EDM",
  "Electro",
  "Drum & Bass",
  "Dubstep",
  "Garage",
  "UK Garage",
  "Amapiano",
  
  // Urban
  "Hip-Hop",
  "R&B",
  "Trap",
  "UK Rap",
  "Grime",
  
  // Latin
  "Reggaeton",
  "Latin House",
  "Salsa",
  "Bachata",
  "Dembow",
  
  // African & Caribbean
  "Afrobeats",
  "Dancehall",
  "Reggae",
  "Soca",
  
  // Pop & Commercial
  "Pop",
  "Top 40",
  "Commercial",
  "Throwbacks",
  "80s / 90s",
  
  // Other Styles
  "Open Format",
  "Disco",
  "Nu Disco",
  "Funk",
  "Soul",
  "Jersey Club",
  "Baile Funk",
  "Minimal",
  "Breaks",
  
  // Live & Specialty
  "Live Music",
  "Jazz",
  "World Music",
] as const;

export type Genre = typeof GENRES[number];

// Genre categories for grouped display (optional)
export const GENRE_CATEGORIES = {
  "Electronic - House": ["House", "Tech House", "Deep House", "Afro House", "Progressive House", "Melodic House"],
  "Electronic - Other": ["Techno", "Melodic Techno", "Trance", "EDM", "Electro", "Drum & Bass", "Dubstep", "Garage", "UK Garage", "Amapiano"],
  "Urban": ["Hip-Hop", "R&B", "Trap", "UK Rap", "Grime"],
  "Latin": ["Reggaeton", "Latin House", "Salsa", "Bachata", "Dembow"],
  "African & Caribbean": ["Afrobeats", "Dancehall", "Reggae", "Soca"],
  "Pop & Commercial": ["Pop", "Top 40", "Commercial", "Throwbacks", "80s / 90s"],
  "Other": ["Open Format", "Disco", "Nu Disco", "Funk", "Soul", "Jersey Club", "Baile Funk", "Minimal", "Breaks"],
  "Live & Specialty": ["Live Music", "Jazz", "World Music"],
} as const;

// Curated genres for Venues and Events (broader categories)
export const VENUE_EVENT_GENRES = [
  // Electronic
  "House",
  "Techno",
  "EDM",
  "Trance",
  "Drum & Bass",
  
  // Urban
  "Hip-Hop",
  "R&B",
  
  // Latin
  "Latin",
  
  // African & Caribbean
  "Afrobeats",
  
  // Pop & Commercial
  "Pop",
  
  // Other
  "Open Format",
  "Jazz",
  "Live Music",
] as const;

export type VenueEventGenre = typeof VENUE_EVENT_GENRES[number];

/**
 * Maps venue/event genres to DJ genres for smart search
 * When a user searches for a detailed DJ genre (e.g., "Tech House"),
 * it will match venues/events with the broader category (e.g., "House")
 */
export const GENRE_MAPPING: Record<string, string> = {
  // House sub-genres → House
  "House": "House",
  "Tech House": "House",
  "Deep House": "House",
  "Afro House": "House",
  "Progressive House": "House",
  "Melodic House": "House",
  "Latin House": "House",
  
  // Techno sub-genres → Techno
  "Techno": "Techno",
  "Melodic Techno": "Techno",
  
  // Electronic other → EDM
  "EDM": "EDM",
  "Trance": "Trance",
  "Electro": "EDM",
  "Drum & Bass": "Drum & Bass",
  "Dubstep": "EDM",
  "Garage": "EDM",
  "UK Garage": "EDM",
  "Amapiano": "House",
  
  // Urban → Hip-Hop/R&B
  "Hip-Hop": "Hip-Hop",
  "R&B": "R&B",
  "Trap": "Hip-Hop", // Trap maps to Hip-Hop
  "UK Rap": "Hip-Hop",
  "Grime": "Hip-Hop",
  
  // Latin → Latin (Reggaeton, Dancehall, Reggae all map to Latin)
  "Reggaeton": "Latin", // Reggaeton maps to Latin
  "Latin": "Latin",
  "Salsa": "Latin",
  "Bachata": "Latin",
  "Dembow": "Latin", // Dembow maps to Latin
  "Dancehall": "Latin", // Dancehall maps to Latin
  "Reggae": "Latin", // Reggae maps to Latin
  "Soca": "Latin", // Soca maps to Latin
  
  // African & Caribbean
  "Afrobeats": "Afrobeats",
  
  // Pop & Commercial → Pop (Top 40, Throwbacks map to Pop)
  "Pop": "Pop",
  "Top 40": "Pop", // Top 40 maps to Pop
  "Commercial": "Pop",
  "Throwbacks": "Pop", // Throwbacks maps to Pop
  "80s / 90s": "Pop", // 80s/90s maps to Pop
  
  // Other
  "Open Format": "Open Format",
  "Disco": "Open Format",
  "Nu Disco": "Open Format",
  "Funk": "Open Format",
  "Soul": "R&B",
  "Jersey Club": "House",
  "Baile Funk": "Trap",
  "Minimal": "Techno",
  "Breaks": "Drum & Bass",
  
  // Live & Specialty
  "Live Music": "Live Music",
  "Jazz": "Jazz",
  "World Music": "Live Music",
};

/**
 * Get the venue/event genre that a DJ genre maps to
 * Returns the broader category, or the genre itself if no mapping exists
 */
export function getVenueEventGenre(djGenre: string): string | null {
  return GENRE_MAPPING[djGenre] || null;
}

/**
 * Get all DJ genres that map to a venue/event genre
 * Useful for reverse lookup (e.g., "House" → ["House", "Tech House", "Deep House", ...])
 */
export function getDJGenresForVenueEventGenre(venueEventGenre: string): string[] {
  return Object.entries(GENRE_MAPPING)
    .filter(([_, mapped]) => mapped === venueEventGenre)
    .map(([djGenre]) => djGenre);
}

