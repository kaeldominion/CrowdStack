import "server-only";

/**
 * Mask email address to protect PII while preserving domain recognition
 * Example: "john.doe@example.com" -> "j***@example.com"
 */
export function maskEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  
  const [localPart, domain] = email.split("@");
  if (!domain || !localPart) return email; // Invalid email format, return as-is
  
  // Show first character of local part, mask the rest
  const maskedLocal = localPart[0] + "***";
  return `${maskedLocal}@${domain}`;
}

/**
 * Mask phone number to protect PII while preserving last 4 digits
 * Example: "+15551234567" -> "+1***4567"
 */
export function maskPhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  
  // If phone is less than 4 characters, return as-is
  if (phone.length <= 4) return phone;
  
  // Show last 4 digits, mask everything before
  const lastFour = phone.slice(-4);
  const prefix = phone.slice(0, -4).replace(/\d/g, "*");
  return prefix + lastFour;
}

