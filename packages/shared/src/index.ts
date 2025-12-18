// Shared types and utilities
export * from "./types";
export * from "./utils";

// Supabase clients - use appropriate one for your context
export { createBrowserClient } from "./supabase/client";
export { createClient, createServiceRoleClient } from "./supabase/server";

