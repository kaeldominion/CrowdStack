import "server-only";

import jwt from "jsonwebtoken";

// Must match the secret used in other QR modules
const DEV_SECRET = "crowdstack-dev-jwt-secret-do-not-use-in-production";
const JWT_SECRET = process.env.JWT_SECRET || DEV_SECRET;
const JWT_EXPIRY_HOURS = 24 * 7; // 7 days default
const IS_PRODUCTION = process.env.NODE_ENV === "production";

/**
 * Payload for table party guest QR tokens
 */
export interface TablePartyPassPayload {
  guest_id: string;
  booking_id: string;
  event_id: string;
  type: "table_party";
  iat?: number;
  exp?: number;
}

/**
 * Generate a JWT token for table party guest QR pass
 */
export function generateTablePartyToken(
  guestId: string,
  bookingId: string,
  eventId: string,
  expiryHours: number = JWT_EXPIRY_HOURS
): string {
  // In production, require a proper secret
  if (IS_PRODUCTION && JWT_SECRET === DEV_SECRET) {
    throw new Error(
      "JWT_SECRET environment variable must be set to a secure value in production"
    );
  }

  console.log(`[Table Party QR] Creating token for guest ${guestId}, booking ${bookingId}`);

  const payload: TablePartyPassPayload = {
    guest_id: guestId,
    booking_id: bookingId,
    event_id: eventId,
    type: "table_party",
  };

  const token = jwt.sign(payload, JWT_SECRET, {
    expiresIn: `${expiryHours}h`,
  });

  console.log(`[Table Party QR] Token generated successfully (expires in ${expiryHours}h)`);

  return token;
}

/**
 * Verify and decode a table party guest QR pass token
 */
export function verifyTablePartyToken(token: string): TablePartyPassPayload {
  // In production, require a proper secret
  if (IS_PRODUCTION && JWT_SECRET === DEV_SECRET) {
    throw new Error(
      "JWT_SECRET environment variable must be set to a secure value in production"
    );
  }

  console.log(`[Table Party QR] Verifying token (length: ${token.length})`);

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as TablePartyPassPayload;

    // Validate required fields
    if (!decoded.guest_id || !decoded.booking_id || !decoded.event_id) {
      console.log(`[Table Party QR] Token missing required fields`);
      throw new Error("Invalid token payload: missing required fields");
    }

    // Verify this is a table party token
    if (decoded.type !== "table_party") {
      console.log(`[Table Party QR] Token is not a table party token`);
      throw new Error("Invalid token type: not a table party token");
    }

    console.log(`[Table Party QR] Token verified successfully:`, {
      guest_id: decoded.guest_id,
      booking_id: decoded.booking_id,
      event_id: decoded.event_id,
    });

    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      console.log(`[Table Party QR] Token expired`);
      throw new Error("Table party pass token has expired");
    }
    if (error instanceof jwt.JsonWebTokenError) {
      console.log(`[Table Party QR] Invalid token:`, error.message);
      throw new Error("Invalid table party pass token");
    }
    throw error;
  }
}

/**
 * Check if a table party token is valid without throwing
 */
export function isValidTablePartyToken(token: string): boolean {
  try {
    verifyTablePartyToken(token);
    return true;
  } catch {
    return false;
  }
}

/**
 * Decode a token without verifying (for checking type)
 * Used by door scanner to determine token type before full verification
 */
export function decodeTokenType(token: string): "table_party" | "registration" | "unknown" {
  try {
    const decoded = jwt.decode(token) as Record<string, unknown>;
    if (!decoded) return "unknown";

    if (decoded.type === "table_party") {
      return "table_party";
    }

    if (decoded.registration_id) {
      return "registration";
    }

    return "unknown";
  } catch {
    return "unknown";
  }
}
