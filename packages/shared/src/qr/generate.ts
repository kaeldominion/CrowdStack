import "server-only";

import jwt from "jsonwebtoken";
import type { QRPassPayload } from "../types";

const JWT_SECRET = process.env.JWT_SECRET || "change-me-in-production";
const JWT_EXPIRY_HOURS = 24 * 7; // 7 days default

/**
 * Generate a JWT token for QR pass
 */
export function generateQRPassToken(
  registrationId: string,
  eventId: string,
  attendeeId: string,
  expiryHours: number = JWT_EXPIRY_HOURS
): string {
  if (!JWT_SECRET || JWT_SECRET === "change-me-in-production") {
    throw new Error(
      "JWT_SECRET environment variable must be set to a secure value"
    );
  }

  const payload: QRPassPayload = {
    registration_id: registrationId,
    event_id: eventId,
    attendee_id: attendeeId,
  };

  const token = jwt.sign(payload, JWT_SECRET, {
    expiresIn: `${expiryHours}h`,
  });

  return token;
}

