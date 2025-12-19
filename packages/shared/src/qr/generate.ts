import "server-only";

import jwt from "jsonwebtoken";
import type { QRPassPayload } from "../types";

// Use a secure default for development, but require proper secret in production
const DEV_SECRET = "crowdstack-dev-jwt-secret-do-not-use-in-production";
const JWT_SECRET = process.env.JWT_SECRET || DEV_SECRET;
const JWT_EXPIRY_HOURS = 24 * 7; // 7 days default
const IS_PRODUCTION = process.env.NODE_ENV === "production";

/**
 * Generate a JWT token for QR pass
 */
export function generateQRPassToken(
  registrationId: string,
  eventId: string,
  attendeeId: string,
  expiryHours: number = JWT_EXPIRY_HOURS
): string {
  // In production, require a proper secret
  if (IS_PRODUCTION && JWT_SECRET === DEV_SECRET) {
    throw new Error(
      "JWT_SECRET environment variable must be set to a secure value in production"
    );
  }

  console.log(`[QR Generate] Creating token for registration ${registrationId}, event ${eventId}`);

  const payload: QRPassPayload = {
    registration_id: registrationId,
    event_id: eventId,
    attendee_id: attendeeId,
  };

  const token = jwt.sign(payload, JWT_SECRET, {
    expiresIn: `${expiryHours}h`,
  });

  console.log(`[QR Generate] Token generated successfully (expires in ${expiryHours}h)`);

  return token;
}

