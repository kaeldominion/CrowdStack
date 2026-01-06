/**
 * Script to find and fix users without emails
 * Usage: 
 *   Find users: npx tsx scripts/fix-user-email.ts find
 *   Update email: npx tsx scripts/fix-user-email.ts update <userId> <email>
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("❌ Missing Supabase environment variables");
  console.error("   Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function findUsersWithoutEmail() {
  console.log("🔍 Searching for users without emails...\n");

  try {
    const { data: authUsersData, error } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });

    if (error) {
      throw error;
    }

    const usersWithoutEmail = (authUsersData?.users || []).filter(
      (u) => !u.email || u.email.trim() === ""
    );

    if (usersWithoutEmail.length === 0) {
      console.log("✅ No users without emails found!");
      return;
    }

    console.log(`Found ${usersWithoutEmail.length} user(s) without email:\n`);

    for (const user of usersWithoutEmail) {
      // Get relationships
      const [promoter, attendee, ownedOrganizers, assignedOrganizers] = await Promise.all([
        supabase
          .from("promoters")
          .select("id, name, email")
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase
          .from("attendees")
          .select("id, name, email")
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase
          .from("organizers")
          .select("id, name, email")
          .eq("created_by", user.id),
        supabase
          .from("organizer_users")
          .select("organizer_id, organizers(id, name)")
          .eq("user_id", user.id),
      ]);

      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`User ID: ${user.id}`);
      console.log(`Created: ${user.created_at}`);
      console.log(`Last Sign In: ${user.last_sign_in_at || "Never"}`);

      if (promoter.data) {
        console.log(`\n📢 Promoter Profile:`);
        console.log(`   Name: ${promoter.data.name}`);
        console.log(`   Email: ${promoter.data.email || "None"}`);
      }

      if (attendee.data) {
        console.log(`\n👤 Attendee Profile:`);
        console.log(`   Name: ${attendee.data.name || "N/A"}`);
        console.log(`   Email: ${attendee.data.email || "None"}`);
      }

      if (ownedOrganizers.data && ownedOrganizers.data.length > 0) {
        console.log(`\n🏢 Owns Organizers (${ownedOrganizers.data.length}):`);
        ownedOrganizers.data.forEach((org) => {
          console.log(`   - ${org.name} (${org.id})`);
        });
      }

      if (assignedOrganizers.data && assignedOrganizers.data.length > 0) {
        console.log(`\n👥 Assigned to Organizers (${assignedOrganizers.data.length}):`);
        assignedOrganizers.data.forEach((assignment: any) => {
          const org = Array.isArray(assignment.organizers)
            ? assignment.organizers[0]
            : assignment.organizers;
          if (org) {
            console.log(`   - ${org.name} (${org.id})`);
          }
        });
      }

      console.log(`\n💡 To update email, run:`);
      console.log(
        `   npx tsx scripts/fix-user-email.ts update ${user.id} <new-email@example.com>`
      );
      console.log(``);
    }
  } catch (error: any) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

async function updateUserEmail(userId: string, newEmail: string) {
  console.log(`📧 Updating email for user ${userId}...\n`);

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(newEmail.trim())) {
    console.error("❌ Invalid email format");
    process.exit(1);
  }

  try {
    // Check if user exists
    const { data: authUser, error: getUserError } =
      await supabase.auth.admin.getUserById(userId);

    if (getUserError || !authUser) {
      console.error(`❌ User not found: ${userId}`);
      process.exit(1);
    }

    console.log(`Current user: ${authUser.user.email || "No email"}`);
    console.log(`New email: ${newEmail.trim()}\n`);

    // Check if email is already taken
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const emailTaken = existingUsers?.users.some(
      (u) => u.id !== userId && u.email?.toLowerCase() === newEmail.trim().toLowerCase()
    );

    if (emailTaken) {
      console.error(`❌ Email ${newEmail} is already in use by another user`);
      process.exit(1);
    }

    // Get relationships
    const [promoter, attendee] = await Promise.all([
      supabase
        .from("promoters")
        .select("id, name, email")
        .eq("user_id", userId)
        .maybeSingle(),
      supabase
        .from("attendees")
        .select("id, name, email")
        .eq("user_id", userId)
        .maybeSingle(),
    ]);

    // Update auth user
    const { data: updatedUser, error: updateError } =
      await supabase.auth.admin.updateUserById(userId, {
        email: newEmail.trim(),
        email_confirm: true,
      });

    if (updateError) {
      console.error(`❌ Failed to update email: ${updateError.message}`);
      process.exit(1);
    }

    console.log(`✅ Updated email in auth.users`);

    // Update promoter if exists
    if (promoter.data) {
      const { error: promoterError } = await supabase
        .from("promoters")
        .update({ email: newEmail.trim() })
        .eq("id", promoter.data.id);

      if (promoterError) {
        console.warn(`⚠️  Warning: Could not update promoter email: ${promoterError.message}`);
      } else {
        console.log(`✅ Updated email in promoter profile`);
      }
    }

    // Update attendee if exists
    if (attendee.data) {
      const { error: attendeeError } = await supabase
        .from("attendees")
        .update({ email: newEmail.trim() })
        .eq("id", attendee.data.id);

      if (attendeeError) {
        console.warn(`⚠️  Warning: Could not update attendee email: ${attendeeError.message}`);
      } else {
        console.log(`✅ Updated email in attendee profile`);
      }
    }

    console.log(`\n✅ Successfully updated email to: ${newEmail.trim()}`);
    console.log(`   User ID: ${userId}`);
  } catch (error: any) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

// Main
const command = process.argv[2];

if (command === "find") {
  findUsersWithoutEmail();
} else if (command === "update") {
  const userId = process.argv[3];
  const email = process.argv[4];

  if (!userId || !email) {
    console.error("❌ Usage: npx tsx scripts/fix-user-email.ts update <userId> <email>");
    process.exit(1);
  }

  updateUserEmail(userId, email);
} else {
  console.error("❌ Usage:");
  console.error("   Find users: npx tsx scripts/fix-user-email.ts find");
  console.error("   Update email: npx tsx scripts/fix-user-email.ts update <userId> <email>");
  process.exit(1);
}

