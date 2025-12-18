// Shared types and utilities
export * from "./types";
export * from "./utils";

// Supabase browser client (safe for client components)
export { createBrowserClient } from "./supabase/client";

// Server-only Supabase clients - import directly from "./supabase/server" in server components
// Not exported here to avoid bundling server-only code in client components

