// Shared types and utilities
export * from "./types";
export * from "./utils";

// Supabase browser client (safe for client components)
export { createBrowserClient } from "./supabase/client";

// Server-only utilities are NOT exported here to avoid bundling server-only code in client components
// Import directly from their module paths in server-side code only:
// - Auth: "./auth/roles", "./auth/invites", "./auth/permissions"
// - QR: "./qr/generate", "./qr/verify"
// - Outbox: "./outbox/emit"
// - Email: "./email/send-magic-link", "./email/log-message"
// - Storage: "./storage/upload"
// - PDF: "./pdf/generate-statement"
// - Supabase Server: "./supabase/server"

