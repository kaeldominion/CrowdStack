/**
 * Script to sync all promoter names from attendee names
 * This fixes promoters that have names derived from email addresses
 * 
 * Usage: npx tsx scripts/sync-promoter-names.ts
 */

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve } from "path";

// Load environment variables from .env.local if it exists
config({ path: resolve(process.cwd(), ".env.local") });
config(); // Also load from .env

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("❌ Missing Supabase environment variables");
  console.error("   Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  console.error("   You can set these in .env.local or as environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function syncPromoterNames() {
  console.log("🔄 Syncing promoter names from attendee names...\n");

  try {
    // Get all promoters with user_id
    const { data: promoters, error: promotersError } = await supabase
      .from("promoters")
      .select("id, name, user_id, email")
      .not("user_id", "is", null);

    if (promotersError) {
      throw promotersError;
    }

    if (!promoters || promoters.length === 0) {
      console.log("✅ No promoters with user_id found");
      return;
    }

    console.log(`Found ${promoters.length} promoter(s) with user_id\n`);

    let updated = 0;
    let skipped = 0;
    let errors = 0;

    for (const promoter of promoters) {
      if (!promoter.user_id) {
        skipped++;
        continue;
      }

      // Get attendee for this user
      const { data: attendee, error: attendeeError } = await supabase
        .from("attendees")
        .select("name")
        .eq("user_id", promoter.user_id)
        .maybeSingle();

      if (attendeeError) {
        console.error(`❌ Error fetching attendee for promoter ${promoter.id}:`, attendeeError.message);
        errors++;
        continue;
      }

      // Get user email to check if promoter name is derived from email
      const { data: userData, error: userError } = await supabase.auth.admin.getUserById(
        promoter.user_id
      );

      if (userError || !userData?.user) {
        console.error(`❌ Error fetching user ${promoter.user_id}:`, userError?.message);
        errors++;
        continue;
      }

      const userEmail = userData.user.email || "";
      const emailUsername = userEmail.split("@")[0] || "";

      // Check if promoter name needs updating
      const shouldUpdate =
        attendee?.name &&
        attendee.name.trim() !== "" &&
        attendee.name !== emailUsername &&
        (promoter.name === emailUsername ||
          !promoter.name ||
          promoter.name.trim() === "");

      if (shouldUpdate) {
        const { error: updateError } = await supabase
          .from("promoters")
          .update({ name: attendee.name })
          .eq("id", promoter.id);

        if (updateError) {
          console.error(
            `❌ Error updating promoter ${promoter.id}:`,
            updateError.message
          );
          errors++;
        } else {
          console.log(
            `✅ Updated promoter "${promoter.name || "N/A"}" → "${attendee.name}" (ID: ${promoter.id})`
          );
          updated++;
        }
      } else {
        if (!attendee?.name) {
          console.log(
            `⏭️  Skipped promoter "${promoter.name}" (ID: ${promoter.id}) - no attendee name`
          );
        } else {
          console.log(
            `⏭️  Skipped promoter "${promoter.name}" (ID: ${promoter.id}) - name already correct`
          );
        }
        skipped++;
      }
    }

    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`✅ Summary:`);
    console.log(`   Updated: ${updated}`);
    console.log(`   Skipped: ${skipped}`);
    console.log(`   Errors: ${errors}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  } catch (error: any) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

syncPromoterNames();

