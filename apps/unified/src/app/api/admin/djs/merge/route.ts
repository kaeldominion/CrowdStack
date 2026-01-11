import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { userHasRoleOrSuperadmin } from "@/lib/auth/check-role";

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/djs/merge
 * Merge multiple DJ profiles into one primary DJ
 * Body: { primaryDjId: string, mergeDjIds: string[] }
 *
 * This will:
 * 1. Transfer all event_lineups from merged DJs to primary DJ
 * 2. Transfer all followers from merged DJs to primary DJ
 * 3. Transfer any gig applications/confirmations
 * 4. Delete the merged DJ profiles
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only superadmins can merge DJs
    const isSuperadmin = await userHasRoleOrSuperadmin("superadmin");
    if (!isSuperadmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { primaryDjId, mergeDjIds } = body;

    if (!primaryDjId || !mergeDjIds || !Array.isArray(mergeDjIds) || mergeDjIds.length === 0) {
      return NextResponse.json(
        { error: "primaryDjId and mergeDjIds array are required" },
        { status: 400 }
      );
    }

    // Ensure primary DJ is not in merge list
    const filteredMergeIds = mergeDjIds.filter(id => id !== primaryDjId);
    if (filteredMergeIds.length === 0) {
      return NextResponse.json(
        { error: "No valid DJs to merge (primary DJ cannot be in merge list)" },
        { status: 400 }
      );
    }

    const serviceSupabase = createServiceRoleClient();

    // Verify primary DJ exists
    const { data: primaryDj, error: primaryError } = await serviceSupabase
      .from("djs")
      .select("id, name, handle")
      .eq("id", primaryDjId)
      .single();

    if (primaryError || !primaryDj) {
      return NextResponse.json(
        { error: "Primary DJ not found" },
        { status: 404 }
      );
    }

    // Verify all merge DJs exist
    const { data: mergeDjs, error: mergeError } = await serviceSupabase
      .from("djs")
      .select("id, name, handle, user_id")
      .in("id", filteredMergeIds);

    if (mergeError || !mergeDjs || mergeDjs.length === 0) {
      return NextResponse.json(
        { error: "One or more merge DJs not found" },
        { status: 404 }
      );
    }

    const stats = {
      lineupsMoved: 0,
      followersMoved: 0,
      gigsTransferred: 0,
      djsDeleted: 0,
    };

    // Process each DJ to merge
    for (const mergeDj of mergeDjs) {
      // 1. Transfer event_lineups (update dj_id to primary)
      // First check if primary already in lineup for same event
      const { data: mergeLineups } = await serviceSupabase
        .from("event_lineups")
        .select("id, event_id")
        .eq("dj_id", mergeDj.id);

      if (mergeLineups && mergeLineups.length > 0) {
        for (const lineup of mergeLineups) {
          // Check if primary DJ already in this event's lineup
          const { data: existingPrimary } = await serviceSupabase
            .from("event_lineups")
            .select("id")
            .eq("event_id", lineup.event_id)
            .eq("dj_id", primaryDjId)
            .single();

          if (existingPrimary) {
            // Primary already in lineup, delete the merge DJ's entry
            await serviceSupabase
              .from("event_lineups")
              .delete()
              .eq("id", lineup.id);
          } else {
            // Transfer lineup entry to primary DJ
            await serviceSupabase
              .from("event_lineups")
              .update({ dj_id: primaryDjId })
              .eq("id", lineup.id);
            stats.lineupsMoved++;
          }
        }
      }

      // 2. Transfer followers (dj_follows table)
      const { data: mergeFollowers } = await serviceSupabase
        .from("dj_follows")
        .select("id, user_id")
        .eq("dj_id", mergeDj.id);

      if (mergeFollowers && mergeFollowers.length > 0) {
        for (const follow of mergeFollowers) {
          // Check if user already follows primary DJ
          const { data: existingFollow } = await serviceSupabase
            .from("dj_follows")
            .select("id")
            .eq("dj_id", primaryDjId)
            .eq("user_id", follow.user_id)
            .single();

          if (existingFollow) {
            // Already follows, delete duplicate
            await serviceSupabase
              .from("dj_follows")
              .delete()
              .eq("id", follow.id);
          } else {
            // Transfer follow to primary DJ
            await serviceSupabase
              .from("dj_follows")
              .update({ dj_id: primaryDjId })
              .eq("id", follow.id);
            stats.followersMoved++;
          }
        }
      }

      // 3. Transfer gig applications (gig_applications table)
      const { error: gigAppError } = await serviceSupabase
        .from("gig_applications")
        .update({ dj_id: primaryDjId })
        .eq("dj_id", mergeDj.id);

      if (!gigAppError) {
        // Count transferred (approximate)
        const { count } = await serviceSupabase
          .from("gig_applications")
          .select("*", { count: "exact", head: true })
          .eq("dj_id", primaryDjId);
        // stats.gigsTransferred is approximate
      }

      // 4. Transfer gig confirmations (gig_confirmations table) if exists
      try {
        await serviceSupabase
          .from("gig_confirmations")
          .update({ dj_id: primaryDjId })
          .eq("dj_id", mergeDj.id);
      } catch (e) {
        // Table might not exist
      }

      // 5. Delete the merged DJ profile
      const { error: deleteError } = await serviceSupabase
        .from("djs")
        .delete()
        .eq("id", mergeDj.id);

      if (!deleteError) {
        stats.djsDeleted++;
      }
    }

    // Log the merge action (ignore errors if table doesn't exist)
    try {
      await serviceSupabase.from("admin_audit_logs").insert({
        user_id: user.id,
        action: "dj_merge",
        entity_type: "dj",
        entity_id: primaryDjId,
        details: {
          primaryDj: primaryDj.name,
          mergedDjs: mergeDjs.map(d => ({ id: d.id, name: d.name })),
          stats,
        },
      });
    } catch {
      // Audit log table might not exist
    }

    return NextResponse.json({
      success: true,
      message: `Merged ${stats.djsDeleted} DJ(s) into ${primaryDj.name}`,
      stats,
      primaryDj,
    });
  } catch (error: any) {
    console.error("Error merging DJs:", error);
    return NextResponse.json(
      { error: error.message || "Failed to merge DJs" },
      { status: 500 }
    );
  }
}
