/**
 * Seed script for testing the feedback cron job
 *
 * Run with: npx tsx scripts/seed-feedback-test-data.ts
 *
 * This creates:
 * - A test event linked to the test venue
 * - Attendee records for test users
 * - Registrations and check-ins
 * - Enables feedback settings for the venue
 * - Closes the event to trigger feedback request creation
 *
 * After running, you can test the cron with:
 * curl -X GET "http://localhost:3000/api/cron/process-feedback-requests" -H "x-vercel-cron: 1"
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables from .env.local
config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY is required');
  console.log('   Set it in your environment or .env.local file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function main() {
  console.log('🧪 Seeding feedback test data...\n');

  // 1. Find the test venue user and their venue
  console.log('1️⃣  Finding test venue...');
  const { data: users } = await supabase.auth.admin.listUsers();
  const venueUser = users?.users?.find(u => u.email === 'test-venue@crowdstack.app');

  if (!venueUser) {
    console.error('❌ test-venue@crowdstack.app user not found. Run seed-test-users.ts first.');
    process.exit(1);
  }

  // Get the venue linked to this user
  const { data: venues } = await supabase
    .from('venues')
    .select('id, name')
    .eq('created_by', venueUser.id)
    .limit(1);

  let venueId: string;
  let venueName: string;

  if (venues && venues.length > 0) {
    venueId = venues[0].id;
    venueName = venues[0].name;
    console.log(`   ✅ Found venue: ${venueName}`);
  } else {
    // Create a test venue
    const { data: newVenue, error: venueError } = await supabase
      .from('venues')
      .insert({
        name: 'Test Venue for Feedback',
        slug: 'test-venue-feedback',
        city: 'London',
        country: 'UK',
        created_by: venueUser.id,
      })
      .select()
      .single();

    if (venueError) {
      console.error('❌ Failed to create venue:', venueError.message);
      process.exit(1);
    }

    venueId = newVenue.id;
    venueName = newVenue.name;
    console.log(`   ✅ Created venue: ${venueName}`);
  }

  // 2. Enable feedback settings for the venue
  console.log('\n2️⃣  Enabling feedback settings...');

  // Check if settings exist first
  const { data: existingSettings } = await supabase
    .from('event_feedback_settings')
    .select('id')
    .eq('venue_id', venueId)
    .single();

  if (existingSettings) {
    // Update existing
    const { error: updateError } = await supabase
      .from('event_feedback_settings')
      .update({ delay_hours: 0, enabled: true })
      .eq('id', existingSettings.id);

    if (updateError) {
      console.error('❌ Failed to update feedback settings:', updateError.message);
    } else {
      console.log('   ✅ Updated feedback settings (0 hour delay)');
    }
  } else {
    // Insert new
    const { error: insertError } = await supabase
      .from('event_feedback_settings')
      .insert({
        venue_id: venueId,
        delay_hours: 0,
        enabled: true,
      });

    if (insertError) {
      console.error('❌ Failed to create feedback settings:', insertError.message);
    } else {
      console.log('   ✅ Created feedback settings (0 hour delay)');
    }
  }

  // 3. Find or create an organizer for the event
  console.log('\n3️⃣  Setting up organizer...');
  let organizerId: string;

  // Check if an organizer exists for the venue
  const { data: existingOrg } = await supabase
    .from('organizers')
    .select('id, name')
    .limit(1)
    .single();

  if (existingOrg) {
    organizerId = existingOrg.id;
    console.log(`   ✅ Using existing organizer: ${existingOrg.name}`);
  } else {
    // Create a test organizer
    const { data: newOrg, error: orgError } = await supabase
      .from('organizers')
      .insert({
        name: 'Test Organizer',
        slug: 'test-organizer-feedback',
        created_by: venueUser.id,
      })
      .select()
      .single();

    if (orgError) {
      console.error('❌ Failed to create organizer:', orgError.message);
      process.exit(1);
    }
    organizerId = newOrg.id;
    console.log(`   ✅ Created organizer: ${newOrg.name}`);
  }

  // 4. Create a test event (in the past, so it can be closed)
  console.log('\n4️⃣  Creating test event...');
  const pastDate = new Date();
  pastDate.setDate(pastDate.getDate() - 1); // Yesterday

  const eventSlug = `feedback-test-event-${Date.now()}`;
  const { data: event, error: eventError } = await supabase
    .from('events')
    .insert({
      name: 'Feedback Test Event',
      slug: eventSlug,
      venue_id: venueId,
      organizer_id: organizerId,
      start_time: pastDate.toISOString(),
      end_time: new Date(pastDate.getTime() + 4 * 60 * 60 * 1000).toISOString(), // 4 hours later
      status: 'published',
    })
    .select()
    .single();

  if (eventError) {
    console.error('❌ Failed to create event:', eventError.message);
    process.exit(1);
  }

  console.log(`   ✅ Created event: ${event.name} (${event.id})`);

  // 5. Find test attendee users and create attendee records
  console.log('\n5️⃣  Setting up test attendees...');
  const testAttendeeEmails = [
    'test-attendee-1@crowdstack.app',
    'test-attendee-2@crowdstack.app',
  ];

  const attendeeData: Array<{ attendeeId: string; userId: string; email: string; name: string }> = [];

  for (const email of testAttendeeEmails) {
    const attendeeUser = users?.users?.find(u => u.email === email);
    if (!attendeeUser) {
      console.log(`   ⚠️  ${email} not found, skipping...`);
      continue;
    }

    // Check if attendee record exists
    let { data: attendee } = await supabase
      .from('attendees')
      .select('id, name, email')
      .eq('user_id', attendeeUser.id)
      .single();

    if (!attendee) {
      // Create attendee record
      const { data: newAttendee, error: attendeeError } = await supabase
        .from('attendees')
        .insert({
          user_id: attendeeUser.id,
          email: email,
          name: attendeeUser.user_metadata?.name || email.split('@')[0],
        })
        .select()
        .single();

      if (attendeeError) {
        console.error(`   ❌ Failed to create attendee for ${email}:`, attendeeError.message);
        continue;
      }
      attendee = newAttendee;
      console.log(`   ✅ Created attendee record for ${email}`);
    } else {
      console.log(`   ℹ️  Attendee record exists for ${email}`);
    }

    attendeeData.push({
      attendeeId: attendee.id,
      userId: attendeeUser.id,
      email: email,
      name: attendee.name,
    });
  }

  if (attendeeData.length === 0) {
    console.error('❌ No test attendees found. Run seed-test-users.ts first.');
    process.exit(1);
  }

  // 6. Create registrations for the event
  console.log('\n6️⃣  Creating registrations...');
  const registrationIds: string[] = [];

  for (const att of attendeeData) {
    // Check if registration exists
    const { data: existingReg } = await supabase
      .from('registrations')
      .select('id')
      .eq('event_id', event.id)
      .eq('attendee_id', att.attendeeId)
      .single();

    if (existingReg) {
      registrationIds.push(existingReg.id);
      console.log(`   ℹ️  Registration exists for ${att.email}`);
      continue;
    }

    const { data: registration, error: regError } = await supabase
      .from('registrations')
      .insert({
        event_id: event.id,
        attendee_id: att.attendeeId,
      })
      .select()
      .single();

    if (regError) {
      console.error(`   ❌ Failed to create registration for ${att.email}:`, regError.message);
      continue;
    }

    registrationIds.push(registration.id);
    console.log(`   ✅ Created registration for ${att.email}`);
  }

  // 7. Create check-ins for registrations
  console.log('\n7️⃣  Creating check-ins...');
  for (let i = 0; i < registrationIds.length; i++) {
    const regId = registrationIds[i];
    const att = attendeeData[i];

    // Check if check-in exists
    const { data: existingCheckin } = await supabase
      .from('checkins')
      .select('id')
      .eq('registration_id', regId)
      .is('undo_at', null)
      .single();

    if (existingCheckin) {
      console.log(`   ℹ️  Check-in exists for ${att.email}`);
      continue;
    }

    const { error: checkinError } = await supabase
      .from('checkins')
      .insert({
        registration_id: regId,
        checked_in_by: venueUser.id,
      });

    if (checkinError) {
      console.error(`   ❌ Failed to create check-in for ${att.email}:`, checkinError.message);
      continue;
    }

    console.log(`   ✅ Checked in ${att.email}`);
  }

  // 8. Close the event (this triggers feedback request creation via DB trigger)
  console.log('\n8️⃣  Closing event to trigger feedback requests...');
  const { error: closeError } = await supabase
    .from('events')
    .update({ closed_at: new Date().toISOString() })
    .eq('id', event.id);

  if (closeError) {
    console.error('❌ Failed to close event:', closeError.message);
  } else {
    console.log('   ✅ Event closed - feedback requests should be queued');
  }

  // 9. Check if feedback requests were created
  console.log('\n9️⃣  Checking queued feedback requests...');
  const { data: feedbackRequests, error: frError } = await supabase
    .from('event_feedback_requests')
    .select('id, user_id, notification_id, token')
    .eq('event_id', event.id);

  if (frError) {
    console.error('❌ Error checking feedback requests:', frError.message);
  } else if (!feedbackRequests || feedbackRequests.length === 0) {
    console.log('   ⚠️  No feedback requests created. Check if trigger is working.');
  } else {
    console.log(`   ✅ Found ${feedbackRequests.length} queued feedback request(s)`);
    console.log('   📧 Requests pending email (notification_id is null):',
      feedbackRequests.filter(r => !r.notification_id).length);
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('✨ Feedback test data seeding complete!\n');
  console.log('📝 Next steps:');
  console.log('   1. Run the cron to send feedback emails:');
  console.log('      curl -X GET "http://localhost:3000/api/cron/process-feedback-requests" -H "x-vercel-cron: 1"');
  console.log('\n   2. Check email logs in Supabase:');
  console.log('      SELECT * FROM email_send_logs ORDER BY created_at DESC LIMIT 5;');
  console.log('\n   3. Test the feedback form:');
  if (feedbackRequests && feedbackRequests.length > 0) {
    const token = feedbackRequests[0].token;
    console.log(`      http://localhost:3000/feedback/${event.id}/${registrationIds[0]}?token=${token}`);
  }
  console.log('\n   4. View in Venue Pulse dashboard:');
  console.log('      http://localhost:3000/app/venue/feedback');
  console.log('='.repeat(60));
}

main().catch(console.error);
