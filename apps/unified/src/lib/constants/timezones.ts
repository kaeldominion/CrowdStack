/**
 * Comprehensive list of IANA timezones organized by region
 * Use these for event timezone selection
 */

export interface TimezoneOption {
  value: string;
  label: string;
  offset: string;
}

export const TIMEZONE_GROUPS: Record<string, TimezoneOption[]> = {
  "Americas": [
    { value: "America/New_York", label: "New York (Eastern)", offset: "UTC-5/-4" },
    { value: "America/Chicago", label: "Chicago (Central)", offset: "UTC-6/-5" },
    { value: "America/Denver", label: "Denver (Mountain)", offset: "UTC-7/-6" },
    { value: "America/Los_Angeles", label: "Los Angeles (Pacific)", offset: "UTC-8/-7" },
    { value: "America/Anchorage", label: "Anchorage (Alaska)", offset: "UTC-9/-8" },
    { value: "Pacific/Honolulu", label: "Honolulu (Hawaii)", offset: "UTC-10" },
    { value: "America/Toronto", label: "Toronto", offset: "UTC-5/-4" },
    { value: "America/Vancouver", label: "Vancouver", offset: "UTC-8/-7" },
    { value: "America/Montreal", label: "Montreal", offset: "UTC-5/-4" },
    { value: "America/Mexico_City", label: "Mexico City", offset: "UTC-6/-5" },
    { value: "America/Bogota", label: "Bogota", offset: "UTC-5" },
    { value: "America/Lima", label: "Lima", offset: "UTC-5" },
    { value: "America/Sao_Paulo", label: "São Paulo", offset: "UTC-3" },
    { value: "America/Buenos_Aires", label: "Buenos Aires", offset: "UTC-3" },
    { value: "America/Santiago", label: "Santiago", offset: "UTC-4/-3" },
    { value: "America/Caracas", label: "Caracas", offset: "UTC-4" },
    { value: "America/Panama", label: "Panama", offset: "UTC-5" },
    { value: "America/Puerto_Rico", label: "Puerto Rico", offset: "UTC-4" },
  ],
  "Europe": [
    { value: "Europe/London", label: "London (GMT/BST)", offset: "UTC+0/+1" },
    { value: "Europe/Dublin", label: "Dublin", offset: "UTC+0/+1" },
    { value: "Europe/Paris", label: "Paris", offset: "UTC+1/+2" },
    { value: "Europe/Berlin", label: "Berlin", offset: "UTC+1/+2" },
    { value: "Europe/Amsterdam", label: "Amsterdam", offset: "UTC+1/+2" },
    { value: "Europe/Brussels", label: "Brussels", offset: "UTC+1/+2" },
    { value: "Europe/Rome", label: "Rome", offset: "UTC+1/+2" },
    { value: "Europe/Madrid", label: "Madrid", offset: "UTC+1/+2" },
    { value: "Europe/Lisbon", label: "Lisbon", offset: "UTC+0/+1" },
    { value: "Europe/Vienna", label: "Vienna", offset: "UTC+1/+2" },
    { value: "Europe/Zurich", label: "Zurich", offset: "UTC+1/+2" },
    { value: "Europe/Stockholm", label: "Stockholm", offset: "UTC+1/+2" },
    { value: "Europe/Oslo", label: "Oslo", offset: "UTC+1/+2" },
    { value: "Europe/Copenhagen", label: "Copenhagen", offset: "UTC+1/+2" },
    { value: "Europe/Helsinki", label: "Helsinki", offset: "UTC+2/+3" },
    { value: "Europe/Warsaw", label: "Warsaw", offset: "UTC+1/+2" },
    { value: "Europe/Prague", label: "Prague", offset: "UTC+1/+2" },
    { value: "Europe/Budapest", label: "Budapest", offset: "UTC+1/+2" },
    { value: "Europe/Athens", label: "Athens", offset: "UTC+2/+3" },
    { value: "Europe/Istanbul", label: "Istanbul", offset: "UTC+3" },
    { value: "Europe/Moscow", label: "Moscow", offset: "UTC+3" },
    { value: "Europe/Kiev", label: "Kyiv", offset: "UTC+2/+3" },
  ],
  "Asia": [
    { value: "Asia/Dubai", label: "Dubai (GST)", offset: "UTC+4" },
    { value: "Asia/Riyadh", label: "Riyadh", offset: "UTC+3" },
    { value: "Asia/Qatar", label: "Qatar", offset: "UTC+3" },
    { value: "Asia/Kuwait", label: "Kuwait", offset: "UTC+3" },
    { value: "Asia/Bahrain", label: "Bahrain", offset: "UTC+3" },
    { value: "Asia/Tehran", label: "Tehran", offset: "UTC+3:30/+4:30" },
    { value: "Asia/Karachi", label: "Karachi", offset: "UTC+5" },
    { value: "Asia/Kolkata", label: "Mumbai / Delhi (IST)", offset: "UTC+5:30" },
    { value: "Asia/Dhaka", label: "Dhaka", offset: "UTC+6" },
    { value: "Asia/Bangkok", label: "Bangkok", offset: "UTC+7" },
    { value: "Asia/Ho_Chi_Minh", label: "Ho Chi Minh City", offset: "UTC+7" },
    { value: "Asia/Jakarta", label: "Jakarta (WIB)", offset: "UTC+7" },
    { value: "Asia/Makassar", label: "Makassar / Bali (WITA)", offset: "UTC+8" },
    { value: "Asia/Singapore", label: "Singapore", offset: "UTC+8" },
    { value: "Asia/Kuala_Lumpur", label: "Kuala Lumpur", offset: "UTC+8" },
    { value: "Asia/Manila", label: "Manila", offset: "UTC+8" },
    { value: "Asia/Hong_Kong", label: "Hong Kong", offset: "UTC+8" },
    { value: "Asia/Shanghai", label: "Shanghai / Beijing", offset: "UTC+8" },
    { value: "Asia/Taipei", label: "Taipei", offset: "UTC+8" },
    { value: "Asia/Seoul", label: "Seoul", offset: "UTC+9" },
    { value: "Asia/Tokyo", label: "Tokyo", offset: "UTC+9" },
  ],
  "Australia & Pacific": [
    { value: "Australia/Perth", label: "Perth (AWST)", offset: "UTC+8" },
    { value: "Australia/Adelaide", label: "Adelaide (ACST/ACDT)", offset: "UTC+9:30/+10:30" },
    { value: "Australia/Darwin", label: "Darwin (ACST)", offset: "UTC+9:30" },
    { value: "Australia/Brisbane", label: "Brisbane (AEST)", offset: "UTC+10" },
    { value: "Australia/Sydney", label: "Sydney (AEST/AEDT)", offset: "UTC+10/+11" },
    { value: "Australia/Melbourne", label: "Melbourne (AEST/AEDT)", offset: "UTC+10/+11" },
    { value: "Australia/Hobart", label: "Hobart (AEST/AEDT)", offset: "UTC+10/+11" },
    { value: "Pacific/Auckland", label: "Auckland (NZST/NZDT)", offset: "UTC+12/+13" },
    { value: "Pacific/Fiji", label: "Fiji", offset: "UTC+12/+13" },
    { value: "Pacific/Guam", label: "Guam", offset: "UTC+10" },
  ],
  "Africa & Middle East": [
    { value: "Africa/Cairo", label: "Cairo", offset: "UTC+2" },
    { value: "Africa/Johannesburg", label: "Johannesburg (SAST)", offset: "UTC+2" },
    { value: "Africa/Lagos", label: "Lagos (WAT)", offset: "UTC+1" },
    { value: "Africa/Nairobi", label: "Nairobi (EAT)", offset: "UTC+3" },
    { value: "Africa/Casablanca", label: "Casablanca", offset: "UTC+0/+1" },
    { value: "Africa/Accra", label: "Accra", offset: "UTC+0" },
    { value: "Asia/Jerusalem", label: "Jerusalem", offset: "UTC+2/+3" },
    { value: "Asia/Beirut", label: "Beirut", offset: "UTC+2/+3" },
    { value: "Asia/Amman", label: "Amman", offset: "UTC+2/+3" },
  ],
};

// Flat list of all timezones for simple iteration
export const ALL_TIMEZONES: TimezoneOption[] = Object.values(TIMEZONE_GROUPS).flat();

// Get a timezone option by value
export function getTimezoneByValue(value: string): TimezoneOption | undefined {
  return ALL_TIMEZONES.find((tz) => tz.value === value);
}

// Get user's local timezone
export function getLocalTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "America/New_York";
  }
}

