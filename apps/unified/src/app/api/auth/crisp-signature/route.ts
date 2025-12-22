import { NextResponse } from "next/server";
import { createClient } from "@crowdstack/shared/supabase/server";
import { createHmac } from "crypto";

/**
 * Generate HMAC signature for Crisp identity verification
 * 
 * This endpoint generates a signature that Crisp uses to verify
 * that user identity data came from your server, not spoofed.
 * 
 * To enable identity verification:
 * 1. Go to Crisp Dashboard > Settings > Website Settings > Security
 * 2. Enable "Verify User Identity"
 * 3. Copy the secret key and add it to your environment as CRISP_SECRET_KEY
 * 
 * @see https://docs.crisp.chat/guides/chatbox-sdks/web-sdk/identity-verification/
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user?.email) {
      return NextResponse.json(
        { error: "Not authenticated or no email" },
        { status: 401 }
      );
    }

    const crispSecretKey = process.env.CRISP_SECRET_KEY;
    
    if (!crispSecretKey) {
      // If no secret key configured, return null signature
      // The frontend will skip identity verification
      return NextResponse.json({ 
        email: user.email,
        signature: null,
        verified: false 
      });
    }

    // Generate HMAC-SHA256 signature of the user's email
    const signature = createHmac("sha256", crispSecretKey)
      .update(user.email)
      .digest("hex");

    return NextResponse.json({
      email: user.email,
      signature,
      verified: true,
    });
  } catch (error) {
    console.error("[Crisp Signature] Error:", error);
    return NextResponse.json(
      { error: "Failed to generate signature" },
      { status: 500 }
    );
  }
}

