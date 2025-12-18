// Shared utility functions

import type { AppEnvironment } from "../types";

/**
 * Get the current app environment
 */
export function getAppEnvironment(): AppEnvironment {
  const env = process.env.NEXT_PUBLIC_APP_ENV;
  if (env === "beta" || env === "prod") {
    return env;
  }
  return "local";
}

/**
 * Get the app version
 */
export function getAppVersion(): string {
  return process.env.NEXT_PUBLIC_APP_VERSION || "0.0.0-unknown";
}

/**
 * Check if we're in production
 */
export function isProduction(): boolean {
  return getAppEnvironment() === "prod";
}

/**
 * Check if we're in beta
 */
export function isBeta(): boolean {
  return getAppEnvironment() === "beta";
}

/**
 * Check if we're in local development
 */
export function isLocal(): boolean {
  return getAppEnvironment() === "local";
}

/**
 * Get environment label for display
 */
export function getEnvironmentLabel(): string {
  const env = getAppEnvironment();
  return env.charAt(0).toUpperCase() + env.slice(1);
}

