import { NextResponse } from "next/server";
import { createClient } from "@crowdstack/shared/supabase/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { userHasRole } from "@crowdstack/shared/auth/roles";


// Force dynamic rendering since this route uses cookies() or createClient()
export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!(await userHasRole("superadmin"))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const serviceSupabase = createServiceRoleClient();

    const { data: promoters, error } = await serviceSupabase
      .from("promoters")
      .select(`
        *,
        parent:promoters!parent_promoter_id(name)
      `)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    // Get counts for each promoter
    const promotersWithCounts = await Promise.all(
      (promoters || []).map(async (promoter: any) => {
        const { count: eventsCount } = await serviceSupabase
          .from("event_promoters")
          .select("*", { count: "exact", head: true })
          .eq("promoter_id", promoter.id);

        const { count: referralsCount } = await serviceSupabase
          .from("registrations")
          .select("*", { count: "exact", head: true })
          .eq("referral_promoter_id", promoter.id);

        return {
          ...promoter,
          parent: promoter.parent,
          events_count: eventsCount || 0,
          total_referrals: referralsCount || 0,
        };
      })
    );

    return NextResponse.json({ promoters: promotersWithCounts });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch promoters" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user: adminUser },
    } = await supabase.auth.getUser();

    if (!adminUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!(await userHasRole("superadmin"))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { name, email, phone, parent_promoter_id } = body;

    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    if (!email && !phone) {
      return NextResponse.json(
        { error: "Either email or phone is required" },
        { status: 400 }
      );
    }

    const serviceSupabase = createServiceRoleClient();

    // Check if promoter with same email already exists
    if (email) {
      const { data: existingPromoter } = await serviceSupabase
        .from("promoters")
        .select("id, name, email")
        .eq("email", email)
        .maybeSingle();

      if (existingPromoter) {
        return NextResponse.json(
          { error: `Promoter with email ${email} already exists` },
          { status: 409 }
        );
      }
    }

    // Check if promoter with same phone already exists
    if (phone) {
      const { data: existingPromoter } = await serviceSupabase
        .from("promoters")
        .select("id, name, phone")
        .eq("phone", phone)
        .maybeSingle();

      if (existingPromoter) {
        return NextResponse.json(
          { error: `Promoter with phone ${phone} already exists` },
          { status: 409 }
        );
      }
    }

    // Validate parent promoter if provided
    if (parent_promoter_id) {
      const { data: parentPromoter } = await serviceSupabase
        .from("promoters")
        .select("id")
        .eq("id", parent_promoter_id)
        .single();

      if (!parentPromoter) {
        return NextResponse.json(
          { error: "Parent promoter not found" },
          { status: 404 }
        );
      }
    }

    // Create promoter
    const { data: newPromoter, error: promoterError } = await serviceSupabase
      .from("promoters")
      .insert({
        name: name.trim(),
        email: email?.trim() || null,
        phone: phone?.trim() || null,
        parent_promoter_id: parent_promoter_id || null,
        created_by: adminUser.id,
      })
      .select()
      .single();

    if (promoterError) {
      throw promoterError;
    }

    return NextResponse.json({
      success: true,
      promoter: newPromoter,
    });
  } catch (error: any) {
    console.error("Error creating promoter:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create promoter" },
      { status: 500 }
    );
  }
}

