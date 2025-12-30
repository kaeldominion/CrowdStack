/**
 * Distance calculation utilities using Haversine formula
 * Calculates great-circle distance between two points on Earth
 */

interface Coordinates {
  latitude: number;
  longitude: number;
}

/**
 * Calculate distance between two coordinates in kilometers
 * Uses Haversine formula for great-circle distance
 * 
 * @param coord1 - First coordinate point
 * @param coord2 - Second coordinate point
 * @returns Distance in kilometers
 */
export function calculateDistance(
  coord1: Coordinates,
  coord2: Coordinates
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(coord2.latitude - coord1.latitude);
  const dLon = toRadians(coord2.longitude - coord1.longitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(coord1.latitude)) *
      Math.cos(toRadians(coord2.latitude)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance;
}

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Find nearest point within radius
 * 
 * @param userLocation - User's coordinates
 * @param locations - Array of locations with coordinates
 * @param radiusKm - Maximum radius in kilometers (default: 50)
 * @returns Nearest location within radius, or null if none found
 */
export function findNearestWithinRadius<T extends Coordinates>(
  userLocation: Coordinates,
  locations: T[],
  radiusKm: number = 50
): { location: T; distance: number } | null {
  let nearest: { location: T; distance: number } | null = null;

  for (const location of locations) {
    const distance = calculateDistance(userLocation, location);
    
    if (distance <= radiusKm) {
      if (!nearest || distance < nearest.distance) {
        nearest = { location, distance };
      }
    }
  }

  return nearest;
}

/**
 * Find all locations within radius, sorted by distance
 * 
 * @param userLocation - User's coordinates
 * @param locations - Array of locations with coordinates
 * @param radiusKm - Maximum radius in kilometers (default: 50)
 * @returns Array of locations within radius, sorted by distance (nearest first)
 */
export function findAllWithinRadius<T extends Coordinates>(
  userLocation: Coordinates,
  locations: T[],
  radiusKm: number = 50
): Array<{ location: T; distance: number }> {
  const results: Array<{ location: T; distance: number }> = [];

  for (const location of locations) {
    const distance = calculateDistance(userLocation, location);
    
    if (distance <= radiusKm) {
      results.push({ location, distance });
    }
  }

  // Sort by distance (nearest first)
  results.sort((a, b) => a.distance - b.distance);

  return results;
}

