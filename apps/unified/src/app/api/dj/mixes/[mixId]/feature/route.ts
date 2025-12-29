import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { getUserDJId } from "@/lib/data/get-user-entity";

/**
 * POST /api/dj/mixes/[mixId]/feature
 * Feature or unfeature a mix
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { mixId: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const djId = await getUserDJId();
    if (!djId) {
      return NextResponse.json({ error: "DJ profile not found" }, { status: 404 });
    }

    const body = await request.json();
    const { is_featured } = body;

    if (typeof is_featured !== "boolean") {
      return NextResponse.json({ error: "is_featured must be a boolean" }, { status: 400 });
    }

    const serviceSupabase = createServiceRoleClient();

    // Verify mix belongs to DJ
    const { data: existingMix } = await serviceSupabase
      .from("mixes")
      .select("id")
      .eq("id", params.mixId)
      .eq("dj_id", djId)
      .single();

    if (!existingMix) {
      return NextResponse.json({ error: "Mix not found" }, { status: 404 });
    }

    const { data: updatedMix, error: updateError } = await serviceSupabase
      .from("mixes")
      .update({
        is_featured: is_featured,
        updated_at: new Date().toISOString(),
      })
      .eq("id", params.mixId)
      .select()
      .single();

    if (updateError || !updatedMix) {
      console.error("Error updating mix feature status:", updateError);
      return NextResponse.json({ error: "Failed to update mix" }, { status: 500 });
    }

    return NextResponse.json({ mix: updatedMix });
  } catch (error: any) {
    console.error("Error updating mix feature status:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}



