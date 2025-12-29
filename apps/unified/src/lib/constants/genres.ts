/**
 * Shared genre list for Events and DJs
 * Used for consistent tagging and filtering across the platform
 */

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

