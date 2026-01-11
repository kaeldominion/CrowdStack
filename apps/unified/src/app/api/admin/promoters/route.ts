import { NextResponse } from "next/server";
import { createClient } from "@crowdstack/shared/supabase/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { userHasRole } from "@crowdstack/shared/auth/roles";


// Force dynamic rendering since this route uses cookies() or createClient()
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const search = searchParams.get("search") || "";

    const safeLimit = Math.min(Math.max(limit, 1), 100);
    const safePage = Math.max(page, 1);
    const offset = (safePage - 1) * safeLimit;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!(await userHasRole("superadmin"))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const serviceSupabase = createServiceRoleClient();

    // Build query with optional search
    let query = serviceSupabase
      .from("promoters")
      .select(`*, parent:promoters!parent_promoter_id(name)`, { count: "exact" });

    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
    }

    const { data: promoters, error, count } = await query
      .order("created_at", { ascending: false })
      .range(offset, offset + safeLimit - 1);

    if (error) throw error;

    const totalCount = count || 0;
    const totalPages = Math.ceil(totalCount / safeLimit);
    const hasMore = safePage < totalPages;

    // Batch fetch counts
    const promoterIds = (promoters || []).map((p: any) => p.id);
    const eventCountMap = new Map<string, number>();
    const referralCountMap = new Map<string, number>();

    if (promoterIds.length > 0) {
      const { data: eventPromoters } = await serviceSupabase
        .from("event_promoters")
        .select("promoter_id")
        .in("promoter_id", promoterIds);

      (eventPromoters || []).forEach((ep: any) => {
        eventCountMap.set(ep.promoter_id, (eventCountMap.get(ep.promoter_id) || 0) + 1);
      });

      const { data: referrals } = await serviceSupabase
        .from("registrations")
        .select("referral_promoter_id")
        .in("referral_promoter_id", promoterIds);

      (referrals || []).forEach((r: any) => {
        referralCountMap.set(r.referral_promoter_id, (referralCountMap.get(r.referral_promoter_id) || 0) + 1);
      });
    }

    const promotersWithCounts = (promoters || []).map((promoter: any) => ({
      ...promoter,
      parent: promoter.parent,
      events_count: eventCountMap.get(promoter.id) || 0,
      total_referrals: referralCountMap.get(promoter.id) || 0,
    }));

    return NextResponse.json({
      promoters: promotersWithCounts,
      pagination: { page: safePage, limit: safeLimit, total: totalCount, totalPages, hasMore }
    });
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

