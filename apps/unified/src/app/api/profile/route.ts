import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { logActivity } from "@crowdstack/shared/activity/log-activity";

// Helper to check if profile is complete
function isProfileComplete(attendee: any): boolean {
  return !!(
    attendee?.name &&
    attendee?.bio &&
    (attendee?.instagram_handle || attendee?.tiktok_handle)
  );
}

/**
 * GET /api/profile
 * Get current user's profile
 */

// Force dynamic rendering since this route uses cookies() or createClient()
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const serviceSupabase = createServiceRoleClient();

    // Get attendee profile linked to this user
    const { data: attendee, error } = await serviceSupabase
      .from("attendees")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (error && error.code !== "PGRST116") {
      // PGRST116 is "not found" - that's ok, attendee might not exist yet
      throw error;
    }

    // Get registration count for progressive signup logic
    let registrationCount = 0;
    if (attendee?.id) {
      const { count } = await serviceSupabase
        .from("registrations")
        .select("*", { count: "exact", head: true })
        .eq("attendee_id", attendee.id);
      registrationCount = count || 0;
    }

    // Return profile data (or null if attendee doesn't exist yet)
    return NextResponse.json(
      { 
        attendee: attendee || null,
        email: user.email,
        registrationCount,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    );
  } catch (error: any) {
    console.error("Error fetching profile:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch profile" },
      { 
        status: 500,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  }
}

/**
 * PATCH /api/profile
 * Update current user's profile
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      surname,
      date_of_birth,
      gender,
      bio,
      instagram_handle,
      tiktok_handle,
      whatsapp,
    } = body;

    const serviceSupabase = createServiceRoleClient();

    // Check if attendee exists
    const { data: existingAttendee } = await serviceSupabase
      .from("attendees")
      .select("id, phone")
      .eq("user_id", user.id)
      .single();

    // Prepare update data
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (surname !== undefined) updateData.surname = surname;
    if (date_of_birth !== undefined) updateData.date_of_birth = date_of_birth || null;
    if (gender !== undefined) updateData.gender = gender || null;
    if (bio !== undefined) updateData.bio = bio || null;
    if (instagram_handle !== undefined) {
      updateData.instagram_handle = instagram_handle ? instagram_handle.replace("@", "") : null;
    }
    if (tiktok_handle !== undefined) {
      updateData.tiktok_handle = tiktok_handle ? tiktok_handle.replace("@", "") : null;
    }
    if (whatsapp !== undefined) {
      updateData.whatsapp = whatsapp || null;
      // Phone and WhatsApp are the same - set phone to whatsapp value
      // (phone is required NOT NULL, so if whatsapp is empty, preserve existing phone)
      // Only update phone if whatsapp has a value
      if (whatsapp && whatsapp.trim()) {
        updateData.phone = whatsapp;
      }
      // If whatsapp is empty/null, don't update phone (preserve existing)
    }

    if (existingAttendee) {
      // Check if profile was complete BEFORE this update
      const { data: beforeUpdate } = await serviceSupabase
        .from("attendees")
        .select("*")
        .eq("id", existingAttendee.id)
        .single();
      
      const wasCompleteBefore = isProfileComplete(beforeUpdate);

      // Update existing attendee
      const { data: updated, error: updateError } = await serviceSupabase
        .from("attendees")
        .update(updateData)
        .eq("id", existingAttendee.id)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      // Sync promoter name if user is a promoter and name was updated
      // Note: The database trigger will also handle this, but we do it here too for immediate sync
      if (name !== undefined && updated.name) {
        const { data: promoter } = await serviceSupabase
          .from("promoters")
          .select("id")
          .or(`user_id.eq.${user.id},created_by.eq.${user.id}`)
          .maybeSingle();

        if (promoter) {
          // Update promoter name to match attendee name
          await serviceSupabase
            .from("promoters")
            .update({ name: updated.name })
            .eq("id", promoter.id);
        }
      }

      // Check if profile is now complete (and wasn't before)
      const isCompleteNow = isProfileComplete(updated);

      console.log(`[Profile] Completion check for user ${user.id}:`, {
        name: !!updated.name,
        bio: !!updated.bio,
        instagram: !!updated.instagram_handle,
        tiktok: !!updated.tiktok_handle,
        wasCompleteBefore,
        isCompleteNow,
      });

      // Award XP if profile is complete - check even if it was already complete
      // This handles retroactive XP for users who completed profile before XP system
      if (isCompleteNow) {
        // Check if user already received profile completion XP
        const { data: existingXp, error: xpCheckError } = await serviceSupabase
          .from("xp_ledger")
          .select("id")
          .eq("user_id", user.id)
          .eq("source_type", "PROFILE_COMPLETION")
          .limit(1);

        console.log(`[Profile] XP check for user ${user.id}:`, {
          hasExistingXp: existingXp && existingXp.length > 0,
          xpCheckError: xpCheckError?.message || null,
        });

        if (!existingXp || existingXp.length === 0) {
          // Award 50 XP for profile completion
          try {
            const { data: xpResult, error: xpError } = await serviceSupabase.rpc("award_xp", {
              p_user_id: user.id,
              p_amount: 50,
              p_source_type: "PROFILE_COMPLETION",
              p_role_context: "attendee",
              p_description: "Completed profile",
            });
            if (xpError) {
              console.error("[Profile] RPC error awarding XP:", xpError);
            } else {
              console.log(`[Profile] Awarded 50 XP to user ${user.id} for profile completion, ledger_id: ${xpResult}`);
            }
          } catch (xpError) {
            // Don't fail the request if XP awarding fails
            console.error("[Profile] Exception awarding XP:", xpError);
          }
        } else {
          console.log(`[Profile] User ${user.id} already has profile completion XP`);
        }
      }

      return NextResponse.json(
        { attendee: updated },
        {
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
          },
        }
      );
    } else {
      // Create new attendee record
      // Phone and whatsapp are optional now
      const phoneValue = whatsapp || updateData.whatsapp || null;
      
      const insertData = {
        user_id: user.id,
        name: name || user.user_metadata?.name || user.email?.split("@")[0] || "User",
        email: user.email || null,
        phone: phoneValue, // Phone = whatsapp (same thing), optional
        whatsapp: phoneValue, // Also set whatsapp field
        ...updateData,
      };

      const { data: created, error: createError } = await serviceSupabase
        .from("attendees")
        .insert(insertData)
        .select()
        .single();

      if (createError) {
        throw createError;
      }

      // Check if new profile is complete and award XP
      if (isProfileComplete(created)) {
        try {
          await serviceSupabase.rpc("award_xp", {
            p_user_id: user.id,
            p_amount: 50,
            p_source_type: "PROFILE_COMPLETION",
            p_role_context: "attendee",
            p_description: "Completed profile",
          });
          console.log(`[Profile] Awarded 50 XP to user ${user.id} for profile completion`);
        } catch (xpError) {
          console.error("[Profile] Error awarding XP:", xpError);
        }
      }

      return NextResponse.json(
        { attendee: created },
        {
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
          },
        }
      );
    }
  } catch (error: any) {
    console.error("Error updating profile:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update profile" },
      { 
        status: 500,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  }
}

