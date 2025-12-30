/**
 * Standardized venue location formatting utility
 * 
 * This utility ensures consistent location display across the application.
 * Format: "City, Country" (with country abbreviations)
 * 
 * Handles edge cases:
 * - Missing city or country
 * - State/province/region fields (like "Bali" in Indonesia)
 * - Country abbreviations
 */

// Country name abbreviations (matching LocationAutocomplete)
const COUNTRY_ABBREVIATIONS: Record<string, string> = {
  "United States": "USA",
  "United States of America": "USA",
  "United Kingdom": "UK",
  "United Arab Emirates": "UAE",
  "Republic of Korea": "South Korea",
  "Democratic Republic of the Congo": "DR Congo",
  "Central African Republic": "CAR",
  "Papua New Guinea": "PNG",
  "Dominican Republic": "Dom. Rep.",
  "Czech Republic": "Czechia",
  "Bosnia and Herzegovina": "Bosnia",
  "Trinidad and Tobago": "Trinidad",
  "Saint Vincent and the Grenadines": "St. Vincent",
  "Antigua and Barbuda": "Antigua",
  "Saint Kitts and Nevis": "St. Kitts",
  "São Tomé and Príncipe": "São Tomé",
  "Equatorial Guinea": "Eq. Guinea",
  "New Zealand": "NZ",
  "South Africa": "SA",
  "Saudi Arabia": "KSA",
  "Hong Kong SAR China": "Hong Kong",
  "Macao SAR China": "Macau",
};

/**
 * Abbreviate country name if it's in our abbreviations list
 */
function abbreviateCountry(country: string): string {
  if (!country) return country;
  
  // Check for exact match first
  if (COUNTRY_ABBREVIATIONS[country]) {
    return COUNTRY_ABBREVIATIONS[country];
  }
  
  // Check for partial matches (case-insensitive)
  const lowerCountry = country.toLowerCase();
  for (const [full, abbr] of Object.entries(COUNTRY_ABBREVIATIONS)) {
    if (full.toLowerCase() === lowerCountry) {
      return abbr;
    }
  }
  
  return country;
}

/**
 * Format venue location consistently
 * 
 * Standard format: "City, Country" (with abbreviated country)
 * 
 * Logic:
 * 1. If city and country exist: "City, Country"
 * 2. If only city exists: "City"
 * 3. If only state/province exists (and it's not a country name): "State, Country"
 * 4. If only country exists: "Country"
 * 5. If state exists but looks like a region (e.g., "Bali"), use it as city: "State, Country"
 * 
 * @param venue - Venue object with city, state, country fields
 * @returns Formatted location string
 */
export function formatVenueLocation(venue: {
  city?: string | null;
  state?: string | null;
  country?: string | null;
}): string | null {
  const { city, state, country } = venue;
  
  // Normalize values (trim and filter empty strings)
  const normalizedCity = city?.trim() || null;
  const normalizedState = state?.trim() || null;
  const normalizedCountry = country?.trim() || null;
  
  // If we have nothing, return null
  if (!normalizedCity && !normalizedState && !normalizedCountry) {
    return null;
  }
  
  // List of known regions/provinces that should be treated as cities
  // These are common cases where "state" is actually a region/province name
  const regionNames = new Set([
    "Bali", "Java", "Sumatra", "Kalimantan", "Sulawesi", "Papua",
    "Queensland", "New South Wales", "Victoria", "Western Australia",
    "Ontario", "Quebec", "British Columbia", "Alberta",
    "California", "New York", "Texas", "Florida", // These are states, but we'll handle them
  ]);
  
  // Determine if state is actually a region/province (not a proper state)
  const stateIsRegion = normalizedState && regionNames.has(normalizedState);
  
  // Case 1: We have city and country - standard format
  if (normalizedCity && normalizedCountry) {
    const abbreviatedCountry = abbreviateCountry(normalizedCountry);
    return `${normalizedCity}, ${abbreviatedCountry}`;
  }
  
  // Case 2: We have city but no country - just city
  if (normalizedCity && !normalizedCountry) {
    return normalizedCity;
  }
  
  // Case 3: No city, but we have state and country
  // If state looks like a region, treat it as city: "State, Country"
  // Otherwise: "State, Country" (still valid)
  if (!normalizedCity && normalizedState && normalizedCountry) {
    const abbreviatedCountry = abbreviateCountry(normalizedCountry);
    return `${normalizedState}, ${abbreviatedCountry}`;
  }
  
  // Case 4: Only state exists (treat as city if it's a region)
  if (!normalizedCity && normalizedState && !normalizedCountry) {
    return normalizedState;
  }
  
  // Case 5: Only country exists
  if (!normalizedCity && !normalizedState && normalizedCountry) {
    return abbreviateCountry(normalizedCountry);
  }
  
  // Fallback: return whatever we have
  return normalizedCity || normalizedState || normalizedCountry || null;
}

/**
 * Format venue location for display in cards/lists (shorter format)
 * Same as formatVenueLocation but can be customized for different contexts
 */
export function formatVenueLocationShort(venue: {
  city?: string | null;
  state?: string | null;
  country?: string | null;
}): string | null {
  return formatVenueLocation(venue);
}

