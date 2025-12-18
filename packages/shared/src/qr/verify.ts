import "server-only";

import jwt from "jsonwebtoken";
import type { QRPassPayload } from "../types";

const JWT_SECRET = process.env.JWT_SECRET || "change-me-in-production";

/**
 * Verify and decode a QR pass JWT token
 */
export function verifyQRPassToken(token: string): QRPassPayload {
  if (!JWT_SECRET || JWT_SECRET === "change-me-in-production") {
    throw new Error(
      "JWT_SECRET environment variable must be set to a secure value"
    );
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as QRPassPayload;

    // Validate required fields
    if (!decoded.registration_id || !decoded.event_id || !decoded.attendee_id) {
      throw new Error("Invalid token payload: missing required fields");
    }

    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error("QR pass token has expired");
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error("Invalid QR pass token");
    }
    throw error;
  }
}

/**
 * Check if a QR pass token is valid without throwing
 */
export function isValidQRPassToken(token: string): boolean {
  try {
    verifyQRPassToken(token);
    return true;
  } catch {
    return false;
  }
}

