import { createBrowserClient as createSupabaseBrowserClient } from "@supabase/ssr";

/**
 * Create a Supabase client for use in the browser
 * 
 * Note: @supabase/ssr's createBrowserClient uses localStorage for PKCE code verifier by default.
 * This means magic links MUST be opened in the same browser/device where the request was initiated.
 * 
 * For magic links to work:
 * 1. Request magic link in one browser tab
 * 2. Click the link in the SAME browser (can be different tab, but same browser)
 * 3. Don't clear cookies between request and click
 * 
 * This is a known limitation of PKCE flow with magic links.
 */
export function createBrowserClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing Supabase environment variables. Please check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
  }

  // @supabase/ssr's createBrowserClient uses localStorage for PKCE by default
  // This is why magic links must be opened in the same browser
  // There's no way to configure it to use cookies in the browser client
  return createSupabaseBrowserClient(supabaseUrl, supabaseAnonKey);
}
