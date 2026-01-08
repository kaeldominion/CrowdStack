import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { getUserId } from "@/lib/auth/check-role";
import { uploadToStorage } from "@crowdstack/shared/storage/upload";

/**
 * PATCH /api/payouts/[payoutLineId]/mark-paid
 * Mark a payout line as paid with optional proof upload
 */

// Force dynamic rendering since this route uses cookies() or createClient()
export const dynamic = 'force-dynamic';
export async function PATCH(
  request: NextRequest,
  { params }: { params: { payoutLineId: string } }
) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const paymentNotes = formData.get("payment_notes") as string | null;
    const proofFile = formData.get("proof_file") as File | null;

    const serviceSupabase = createServiceRoleClient();

    // Get payout line with event info
    const { data: payoutLine, error: payoutError } = await serviceSupabase
      .from("payout_lines")
      .select(`
        id,
        payout_run_id,
        event_id,
        promoter_id,
        payment_status,
        payout_runs!inner(
          event_id,
          events!inner(
            id,
            organizer_id,
            venue_id
          )
        )
      `)
      .eq("id", params.payoutLineId)
      .single();

    if (payoutError || !payoutLine) {
      return NextResponse.json(
        { error: "Payout line not found" },
        { status: 404 }
      );
    }

    // Get event for access check
    const event = (payoutLine.payout_runs as any)?.events;
    if (!event) {
      return NextResponse.json(
        { error: "Event not found" },
        { status: 404 }
      );
    }

    // Check if already paid
    if (payoutLine.payment_status === "paid" || payoutLine.payment_status === "confirmed") {
      return NextResponse.json(
        { error: "Payout is already marked as paid" },
        { status: 400 }
      );
    }

    // Verify access (organizer or venue admin)
    const { data: userRoles } = await serviceSupabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    const roles = userRoles?.map((r) => r.role) || [];
    const isSuperadmin = roles.includes("superadmin");

    let hasAccess = isSuperadmin;

    if (!hasAccess) {
      const { data: organizer } = await serviceSupabase
        .from("organizers")
        .select("id")
        .eq("created_by", userId)
        .single();

      if (organizer && event.organizer_id === organizer.id) {
        hasAccess = true;
      }

      if (!hasAccess && event.venue_id) {
        const { data: venue } = await serviceSupabase
          .from("venues")
          .select("id, created_by")
          .eq("id", event.venue_id)
          .single();

        if (venue && venue.created_by === userId) {
          hasAccess = true;
        }
      }
    }

    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Upload proof file if provided
    let proofPath: string | null = null;
    if (proofFile && proofFile.size > 0) {
      try {
        const arrayBuffer = await proofFile.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const fileName = `payment-proof-${params.payoutLineId}-${Date.now()}.${proofFile.name.split('.').pop()}`;
        const path = `payout-proofs/${fileName}`;
        
        // Upload returns public URL, but we store the path
        await uploadToStorage("statements", path, buffer, proofFile.type);
        proofPath = path;
      } catch (uploadError: any) {
        console.error("[Mark Paid] Error uploading proof:", uploadError);
        return NextResponse.json(
          { error: "Failed to upload proof file" },
          { status: 500 }
        );
      }
    }

    // Update payout line
    const { data: updated, error: updateError } = await serviceSupabase
      .from("payout_lines")
      .update({
        payment_status: "paid",
        payment_marked_by: userId,
        payment_marked_at: new Date().toISOString(),
        payment_proof_path: proofPath,
        payment_notes: paymentNotes || null,
      })
      .eq("id", params.payoutLineId)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      success: true,
      payout_line: updated,
    });
  } catch (error: any) {
    console.error("[Mark Paid API] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to mark payout as paid" },
      { status: 500 }
    );
  }
}

