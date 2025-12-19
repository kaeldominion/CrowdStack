import "server-only";

import jwt from "jsonwebtoken";
import type { QRPassPayload } from "../types";

// Must match the secret used in generate.ts
const DEV_SECRET = "crowdstack-dev-jwt-secret-do-not-use-in-production";
const JWT_SECRET = process.env.JWT_SECRET || DEV_SECRET;
const IS_PRODUCTION = process.env.NODE_ENV === "production";

/**
 * Verify and decode a QR pass JWT token
 */
export function verifyQRPassToken(token: string): QRPassPayload {
  // In production, require a proper secret
  if (IS_PRODUCTION && JWT_SECRET === DEV_SECRET) {
    throw new Error(
      "JWT_SECRET environment variable must be set to a secure value in production"
    );
  }

  console.log(`[QR Verify] Verifying token (length: ${token.length})`);

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as QRPassPayload;

    // Validate required fields
    if (!decoded.registration_id || !decoded.event_id || !decoded.attendee_id) {
      console.log(`[QR Verify] Token missing required fields`);
      throw new Error("Invalid token payload: missing required fields");
    }

    console.log(`[QR Verify] Token verified successfully:`, {
      registration_id: decoded.registration_id,
      event_id: decoded.event_id,
      attendee_id: decoded.attendee_id,
    });

    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      console.log(`[QR Verify] Token expired`);
      throw new Error("QR pass token has expired");
    }
    if (error instanceof jwt.JsonWebTokenError) {
      console.log(`[QR Verify] Invalid token:`, error.message);
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

