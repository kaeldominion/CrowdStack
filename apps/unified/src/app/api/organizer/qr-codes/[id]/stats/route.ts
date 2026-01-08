import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { userHasRoleOrSuperadmin, getUserId } from "@/lib/auth/check-role";
import { getUserOrganizerIds } from "@/lib/data/get-user-entity";

/**
 * GET /api/organizer/qr-codes/[id]/stats
 * Get scan statistics for a QR code
 */

// Force dynamic rendering since this route uses cookies() or createClient()
export const dynamic = 'force-dynamic';
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getUserId();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!(await userHasRoleOrSuperadmin("event_organizer"))) {
      return NextResponse.json({ 
        error: "Forbidden - Organizer role required"
      }, { status: 403 });
    }

    const organizerIds = await getUserOrganizerIds();
    const serviceSupabase = createServiceRoleClient();

    // Verify QR code belongs to one of the user's organizers
    const { data: existing } = await serviceSupabase
      .from("dynamic_qr_codes")
      .select("organizer_id")
      .eq("id", params.id)
      .single();

    if (!existing || (existing.organizer_id && !organizerIds.includes(existing.organizer_id))) {
      return NextResponse.json({ error: "QR code not found" }, { status: 404 });
    }

    // Get total scans
    const { count: totalScans } = await serviceSupabase
      .from("qr_code_scans")
      .select("*", { count: "exact", head: true })
      .eq("qr_code_id", params.id);

    // Get scans in the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { count: recentScans } = await serviceSupabase
      .from("qr_code_scans")
      .select("*", { count: "exact", head: true })
      .eq("qr_code_id", params.id)
      .gte("scanned_at", thirtyDaysAgo.toISOString());

    // Get scans today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const { count: todayScans } = await serviceSupabase
      .from("qr_code_scans")
      .select("*", { count: "exact", head: true })
      .eq("qr_code_id", params.id)
      .gte("scanned_at", today.toISOString());

    // Get scans by day for the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const { data: dailyScans } = await serviceSupabase
      .from("qr_code_scans")
      .select("scanned_at")
      .eq("qr_code_id", params.id)
      .gte("scanned_at", sevenDaysAgo.toISOString())
      .order("scanned_at", { ascending: true });

    // Group by day
    const scansByDay: Record<string, number> = {};
    dailyScans?.forEach((scan) => {
      const date = new Date(scan.scanned_at).toISOString().split("T")[0];
      scansByDay[date] = (scansByDay[date] || 0) + 1;
    });

    return NextResponse.json({
      stats: {
        totalScans: totalScans || 0,
        recentScans: recentScans || 0,
        todayScans: todayScans || 0,
        scansByDay,
      },
    });
  } catch (error: any) {
    console.error("[QR Stats API] Unexpected error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

