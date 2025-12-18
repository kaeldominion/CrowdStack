import { createBrowserClient as createSupabaseBrowserClient } from "@supabase/ssr";

/**
 * Create a Supabase client for use in the browser
 * MUST use cookies for PKCE code verifier storage (not localStorage)
 * This is critical for magic links clicked from email
 */
export function createBrowserClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing Supabase environment variables. Please check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
  }

  // Use default implementation - @supabase/ssr handles PKCE automatically
  return createSupabaseBrowserClient(supabaseUrl, supabaseAnonKey);
}
