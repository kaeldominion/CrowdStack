import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@crowdstack/shared/supabase/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { userHasRole } from "@crowdstack/shared/auth/roles";
import { assignUserRole } from "@crowdstack/shared/auth/roles";

export async function POST(request: NextRequest) {
  try {
    // Verify admin access
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
    const { email: inputEmail, attendeeId } = body;

    if (!inputEmail && !attendeeId) {
      return NextResponse.json(
        { error: "Either email or attendeeId must be provided" },
        { status: 400 }
      );
    }

    const serviceSupabase = createServiceRoleClient();
    let targetUserId: string | null = null;
    let attendeeData: any = null;
    let userData: any = null;

    // Find user by email or attendee ID
    if (inputEmail) {
      // Find user by email
      const { data: authUsers, error: userError } = await serviceSupabase.auth.admin.listUsers();
      if (userError) {
        throw userError;
      }
      const matchingUser = authUsers.users.find((u) => u.email?.toLowerCase() === inputEmail.toLowerCase());
      
      if (matchingUser) {
        targetUserId = matchingUser.id;
        userData = matchingUser;
      }

      // Also try to find attendee by email
      const { data: attendeeByEmail } = await serviceSupabase
        .from("attendees")
        .select("*")
        .eq("email", inputEmail)
        .maybeSingle();

      if (attendeeByEmail && !targetUserId && attendeeByEmail.user_id) {
        targetUserId = attendeeByEmail.user_id;
        attendeeData = attendeeByEmail;
      } else if (attendeeByEmail) {
        attendeeData = attendeeByEmail;
      }
    } else if (attendeeId) {
      // Find attendee by ID
      const { data: attendee, error: attendeeError } = await serviceSupabase
        .from("attendees")
        .select("*")
        .eq("id", attendeeId)
        .single();

      if (attendeeError) {
        return NextResponse.json(
          { error: `Attendee not found: ${attendeeError.message}` },
          { status: 404 }
        );
      }

      attendeeData = attendee;
      targetUserId = attendee.user_id || null;

      // If attendee has no user_id but has email, try to find user
      if (!targetUserId && attendee.email) {
        const { data: authUsers } = await serviceSupabase.auth.admin.listUsers();
        const matchingUser = authUsers?.users.find(
          (u) => u.email?.toLowerCase() === attendee.email?.toLowerCase()
        );
        if (matchingUser) {
          targetUserId = matchingUser.id;
          userData = matchingUser;
        }
      }
    }

    // Check if user already has promoter role
    if (targetUserId) {
      const { data: existingRoles } = await serviceSupabase
        .from("user_roles")
        .select("role")
        .eq("user_id", targetUserId)
        .eq("role", "promoter");

      if (existingRoles && existingRoles.length > 0) {
        // Check if promoter profile exists
        const { data: existingPromoter } = await serviceSupabase
          .from("promoters")
          .select("*")
          .eq("created_by", targetUserId)
          .maybeSingle();

        if (existingPromoter) {
          return NextResponse.json({
            success: true,
            message: "User is already a promoter",
            promoter: existingPromoter,
            alreadyPromoter: true,
          });
        }
      }
    }

    // Determine name, email, phone from available data
    let name = "";
    let promoterEmail = "";
    let phone = "";

    if (attendeeData) {
      name = attendeeData.name || "";
      promoterEmail = attendeeData.email || inputEmail || "";
      phone = attendeeData.phone || "";
    }

    if (userData) {
      name = name || userData.user_metadata?.full_name || userData.email?.split("@")[0] || "";
      promoterEmail = promoterEmail || userData.email || inputEmail || "";
    }

    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { error: "Cannot determine name. Please ensure the user or attendee has a name." },
        { status: 400 }
      );
    }

    if (!promoterEmail && !phone) {
      return NextResponse.json(
        { error: "Cannot determine contact info. Email or phone is required." },
        { status: 400 }
      );
    }

    // Create promoter profile
    const promoterData: any = {
      name,
      email: promoterEmail || null,
      phone: phone || null,
      created_by: targetUserId || adminUser.id,
    };

    // Check if promoter with same email or phone already exists
    let existingPromoter: any = null;
    
    if (promoterEmail) {
      const { data: promoterByEmail } = await serviceSupabase
        .from("promoters")
        .select("*")
        .eq("email", promoterEmail)
        .maybeSingle();
      
      if (promoterByEmail) {
        existingPromoter = promoterByEmail;
      }
    }

    // Also check by phone if we have phone and haven't found by email
    if (!existingPromoter && phone) {
      const { data: promoterByPhone } = await serviceSupabase
        .from("promoters")
        .select("*")
        .eq("phone", phone)
        .maybeSingle();
      
      if (promoterByPhone) {
        existingPromoter = promoterByPhone;
      }
    }

    if (existingPromoter) {
      // If promoter exists but not linked to user, link it
      if (!existingPromoter.created_by && targetUserId) {
        const { data: updatedPromoter, error: updateError } = await serviceSupabase
          .from("promoters")
          .update({ created_by: targetUserId })
          .eq("id", existingPromoter.id)
          .select()
          .single();

        if (updateError) {
          throw updateError;
        }

        // Assign promoter role if user exists and doesn't have it
        if (targetUserId) {
          const { data: existingRoles } = await serviceSupabase
            .from("user_roles")
            .select("role")
            .eq("user_id", targetUserId)
            .eq("role", "promoter");

          if (!existingRoles || existingRoles.length === 0) {
            try {
              await assignUserRole(targetUserId, "promoter", {
                assigned_by: adminUser.id,
                assigned_via: "admin_conversion",
                converted_from: attendeeData ? "attendee" : "user",
                promoter_id: updatedPromoter.id,
              });
            } catch (roleError: any) {
              console.warn("Failed to assign promoter role:", roleError.message);
            }
          }
        }

        return NextResponse.json({
          success: true,
          message: "Promoter profile linked to user and role assigned",
          promoter: updatedPromoter,
          alreadyPromoter: false,
        });
      }

      // Promoter exists and is already linked (or no user to link)
      return NextResponse.json({
        success: true,
        message: existingPromoter.created_by
          ? "Promoter already exists and is linked to a user"
          : "Promoter profile already exists (no user account to link)",
        promoter: existingPromoter,
        alreadyPromoter: true,
      });
    }

    // Create new promoter
    const { data: newPromoter, error: promoterError } = await serviceSupabase
      .from("promoters")
      .insert(promoterData)
      .select()
      .single();

    if (promoterError) {
      throw promoterError;
    }

    // Assign promoter role if user exists
    if (targetUserId) {
      try {
        await assignUserRole(targetUserId, "promoter", {
          assigned_by: adminUser.id,
          assigned_via: "admin_conversion",
          converted_from: attendeeData ? "attendee" : "user",
          promoter_id: newPromoter.id,
        });
      } catch (roleError: any) {
        console.warn("Failed to assign promoter role:", roleError.message);
        // Don't fail the request if role assignment fails - promoter profile was created
      }
    }

    return NextResponse.json({
      success: true,
      message: targetUserId
        ? "User successfully converted to promoter"
        : "Promoter profile created (no user account found)",
      promoter: newPromoter,
      alreadyPromoter: false,
    });
  } catch (error: any) {
    console.error("Error converting user to promoter:", error);
    return NextResponse.json(
      { error: error.message || "Failed to convert user to promoter" },
      { status: 500 }
    );
  }
}

