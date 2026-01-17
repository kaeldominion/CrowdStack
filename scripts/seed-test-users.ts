/**
 * Seed script for test users - creates accounts for Playwright E2E testing
 *
 * Run with: npx tsx scripts/seed-test-users.ts
 *
 * This creates test users with known credentials for each role type.
 * Credentials should be stored in .env.test.local (gitignored).
 *
 * Test accounts created:
 * - test-attendee-1@crowdstack.app (primary attendee)
 * - test-attendee-2@crowdstack.app (secondary attendee for multi-user tests)
 * - test-attendee-3@crowdstack.app (tertiary attendee for edge cases)
 * - test-promoter@crowdstack.app
 * - test-dj@crowdstack.app
 * - test-organizer@crowdstack.app
 * - test-venue@crowdstack.app
 * - test-superadmin@crowdstack.app
 */

import { createClient } from '@supabase/supabase-js';

// Use service role key for admin operations
const supabaseUrl = process.env.SUPABASE_URL || 'https://aiopjznxnoqgmmqowpxb.supabase.co';
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

// Test password - should match what's in .env.test.local
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD || 'TestPassword123!';

type TestUser = {
  email: string;
  role: 'attendee' | 'promoter' | 'dj' | 'event_organizer' | 'venue_admin' | 'superadmin';
  name: string;
  metadata?: Record<string, unknown>;
};

const testUsers: TestUser[] = [
  // Multiple attendees for edge case testing
  { email: 'test-attendee-1@crowdstack.app', role: 'attendee', name: 'Test Attendee One' },
  { email: 'test-attendee-2@crowdstack.app', role: 'attendee', name: 'Test Attendee Two' },
  { email: 'test-attendee-3@crowdstack.app', role: 'attendee', name: 'Test Attendee Three' },

  // One of each other role
  { email: 'test-promoter@crowdstack.app', role: 'promoter', name: 'Test Promoter' },
  { email: 'test-dj@crowdstack.app', role: 'dj', name: 'Test DJ' },
  { email: 'test-organizer@crowdstack.app', role: 'event_organizer', name: 'Test Organizer' },
  { email: 'test-venue@crowdstack.app', role: 'venue_admin', name: 'Test Venue Admin' },
  { email: 'test-superadmin@crowdstack.app', role: 'superadmin', name: 'Test Superadmin' },
];

async function createOrUpdateUser(user: TestUser): Promise<string | null> {
  const { email, role, name } = user;

  // Check if user already exists
  const { data: existingUsers } = await supabase.auth.admin.listUsers();
  const existingUser = existingUsers?.users?.find(u => u.email === email);

  let userId: string;

  if (existingUser) {
    console.log(`   ℹ️  User ${email} already exists, updating...`);
    userId = existingUser.id;

    // Update password to ensure it matches
    const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
      password: TEST_PASSWORD,
      email_confirm: true,
    });

    if (updateError) {
      console.error(`   ❌ Failed to update ${email}:`, updateError.message);
      return null;
    }
  } else {
    // Create new user
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email,
      password: TEST_PASSWORD,
      email_confirm: true, // Auto-confirm email for test users
      user_metadata: { name },
    });

    if (createError) {
      console.error(`   ❌ Failed to create ${email}:`, createError.message);
      return null;
    }

    userId = newUser.user.id;
    console.log(`   ✅ Created user ${email}`);
  }

  // Check if role already assigned
  const { data: existingRole } = await supabase
    .from('user_roles')
    .select('id')
    .eq('user_id', userId)
    .eq('role', role)
    .single();

  if (!existingRole) {
    // Assign role
    const { error: roleError } = await supabase
      .from('user_roles')
      .insert({
        user_id: userId,
        role,
        metadata: user.metadata || {},
      });

    if (roleError) {
      console.error(`   ❌ Failed to assign role ${role} to ${email}:`, roleError.message);
    } else {
      console.log(`   ✅ Assigned role ${role} to ${email}`);
    }
  } else {
    console.log(`   ℹ️  Role ${role} already assigned to ${email}`);
  }

  return userId;
}

async function linkTestUsersToData() {
  console.log('\n🔗 Linking test users to existing data...\n');

  // Get test venue admin
  const { data: venueAdmin } = await supabase.auth.admin.listUsers();
  const venueUser = venueAdmin?.users?.find(u => u.email === 'test-venue@crowdstack.app');

  if (venueUser) {
    // Link to first venue if not already linked
    const { data: venues } = await supabase
      .from('venues')
      .select('id, name')
      .limit(1);

    if (venues && venues.length > 0) {
      const { data: existingLink } = await supabase
        .from('user_roles')
        .select('id, metadata')
        .eq('user_id', venueUser.id)
        .eq('role', 'venue_admin')
        .single();

      if (existingLink && !existingLink.metadata?.venue_id) {
        await supabase
          .from('user_roles')
          .update({ metadata: { venue_id: venues[0].id } })
          .eq('id', existingLink.id);
        console.log(`   ✅ Linked test-venue to ${venues[0].name}`);
      }
    }
  }

  // Get test organizer
  const organizerUser = venueAdmin?.users?.find(u => u.email === 'test-organizer@crowdstack.app');

  if (organizerUser) {
    // Link to first event if not already linked
    const { data: events } = await supabase
      .from('events')
      .select('id, name')
      .limit(1);

    if (events && events.length > 0) {
      const { data: existingLink } = await supabase
        .from('user_roles')
        .select('id, metadata')
        .eq('user_id', organizerUser.id)
        .eq('role', 'event_organizer')
        .single();

      if (existingLink && !existingLink.metadata?.event_ids) {
        await supabase
          .from('user_roles')
          .update({ metadata: { event_ids: [events[0].id] } })
          .eq('id', existingLink.id);
        console.log(`   ✅ Linked test-organizer to ${events[0].name}`);
      }
    }
  }
}

async function main() {
  console.log('🧪 Seeding test users for Playwright E2E testing...\n');
  console.log(`   Using password: ${TEST_PASSWORD.slice(0, 4)}${'*'.repeat(TEST_PASSWORD.length - 4)}\n`);

  for (const user of testUsers) {
    await createOrUpdateUser(user);
  }

  await linkTestUsersToData();

  console.log('\n✨ Test user seeding complete!');
  console.log('\n📝 Next steps:');
  console.log('   1. Copy .env.test.local.example to .env.test.local');
  console.log('   2. Update TEST_USER_PASSWORD if you used a different password');
  console.log('   3. Run: npx playwright test');
}

main().catch(console.error);
