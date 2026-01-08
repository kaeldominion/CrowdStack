import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { userHasRole } from "@crowdstack/shared/auth/roles";


// Force dynamic rendering since this route uses cookies() or createClient()
export const dynamic = 'force-dynamic';
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check for superadmin role
    if (!(await userHasRole("superadmin"))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const text = await file.text();
    const lines = text.split("\n").filter((line) => line.trim());
    
    if (lines.length < 2) {
      return NextResponse.json({ error: "CSV must have at least a header and one data row" }, { status: 400 });
    }

    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
    const nameIdx = headers.indexOf("name");
    const emailIdx = headers.indexOf("email");
    const phoneIdx = headers.indexOf("phone");

    if (nameIdx === -1 || phoneIdx === -1) {
      return NextResponse.json({ error: "CSV must have 'name' and 'phone' columns" }, { status: 400 });
    }

    const serviceSupabase = createServiceRoleClient();
    const attendees = [];
    let imported = 0;
    let skipped = 0;

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map((v) => v.trim());
      const name = values[nameIdx];
      const email = emailIdx >= 0 ? values[emailIdx] : "";
      const phone = values[phoneIdx];

      if (!name || !phone) {
        skipped++;
        continue;
      }

      // Check if exists
      const { data: existing } = await serviceSupabase
        .from("attendees")
        .select("id")
        .or(`phone.eq.${phone}${email ? ",email.eq." + email : ""}`)
        .single();

      if (existing) {
        skipped++;
        continue;
      }

      attendees.push({
        name,
        email: email || null,
        phone,
      });
    }

    if (attendees.length > 0) {
      const { error } = await serviceSupabase.from("attendees").insert(attendees);
      if (error) {
        throw error;
      }
      imported = attendees.length;
    }

    return NextResponse.json({ imported, skipped, total: lines.length - 1 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to import CSV" },
      { status: 500 }
    );
  }
}

