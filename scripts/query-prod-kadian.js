#!/usr/bin/env node

/**
 * Script to query PRODUCTION database for "Kadian"
 * Usage: PROD_SUPABASE_URL=... PROD_SUPABASE_SERVICE_ROLE_KEY=... node scripts/query-prod-kadian.js
 */

const { createClient } = require('@supabase/supabase-js');

const prodUrl = process.env.PROD_SUPABASE_URL || 'https://fvrjcyscwibrqpsviblx.supabase.co';
const prodKey = process.env.PROD_SUPABASE_SERVICE_ROLE_KEY;

if (!prodKey) {
  console.error('❌ PROD_SUPABASE_SERVICE_ROLE_KEY environment variable required');
  console.error('   Get it from: https://supabase.com/dashboard/project/fvrjcyscwibrqpsviblx/settings/api');
  process.exit(1);
}

const supabase = createClient(prodUrl, prodKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function searchKadian() {
  console.log('🔍 Searching PRODUCTION database for "Kadian"...\n');

  // Search organizers
  console.log('📋 Checking ORGANIZERS table...');
  const { data: organizers, error: orgError } = await supabase
    .from('organizers')
    .select('id, name, created_by, created_at')
    .ilike('name', '%kadian%');
  
  if (orgError) {
    console.error('Error querying organizers:', orgError);
  } else {
    console.log(`Found ${organizers?.length || 0} organizer(s):`);
    organizers?.forEach(org => {
      console.log(`  - ID: ${org.id}`);
      console.log(`    Name: ${org.name}`);
      console.log(`    Created by: ${org.created_by}`);
      console.log(`    Created at: ${org.created_at}`);
      console.log('');
    });
  }

  // Search promoters
  console.log('📋 Checking PROMOTERS table...');
  const { data: promoters, error: promError } = await supabase
    .from('promoters')
    .select('id, name, email, created_by, created_at')
    .ilike('name', '%kadian%');
  
  if (promError) {
    console.error('Error querying promoters:', promError);
  } else {
    console.log(`Found ${promoters?.length || 0} promoter(s):`);
    promoters?.forEach(prom => {
      console.log(`  - ID: ${prom.id}`);
      console.log(`    Name: ${prom.name}`);
      console.log(`    Email: ${prom.email || 'N/A'}`);
      console.log(`    Created by: ${prom.created_by}`);
      console.log(`    Created at: ${prom.created_at}`);
      console.log('');
    });
  }

  // Search attendees
  console.log('📋 Checking ATTENDEES table...');
  const { data: attendees, error: attError } = await supabase
    .from('attendees')
    .select('id, name, email, user_id, created_at')
    .ilike('name', '%kadian%');
  
  if (attError) {
    console.error('Error querying attendees:', attError);
  } else {
    console.log(`Found ${attendees?.length || 0} attendee(s):`);
    attendees?.forEach(att => {
      console.log(`  - ID: ${att.id}`);
      console.log(`    Name: ${att.name}`);
      console.log(`    Email: ${att.email || 'N/A'}`);
      console.log(`    User ID: ${att.user_id || 'N/A'}`);
      console.log(`    Created at: ${att.created_at}`);
      console.log('');
    });
  }

  // Get recent events and their organizer names
  console.log('📋 Checking recent EVENTS and their organizers...');
  const { data: events, error: eventsError } = await supabase
    .from('events')
    .select('id, name, organizer_id, created_at')
    .order('created_at', { ascending: false })
    .limit(20);
  
  if (eventsError) {
    console.error('Error querying events:', eventsError);
  } else {
    console.log(`\nRecent events and their organizer IDs:`);
    for (const event of events || []) {
      if (event.organizer_id) {
        const { data: org } = await supabase
          .from('organizers')
          .select('id, name, created_by')
          .eq('id', event.organizer_id)
          .single();
        
        if (org) {
          // Check organizer owner's promoter profile
          let promoterName = null;
          if (org.created_by) {
            const { data: promoter } = await supabase
              .from('promoters')
              .select('id, name')
              .eq('created_by', org.created_by)
              .maybeSingle();
            promoterName = promoter?.name;
          }
          
          console.log(`  - Event: ${event.name}`);
          console.log(`    Organizer ID: ${event.organizer_id}`);
          console.log(`    Organizer Name: ${org.name}`);
          console.log(`    Organizer Owner: ${org.created_by || 'N/A'}`);
          console.log(`    Owner's Promoter Profile: ${promoterName || 'NONE'}`);
          console.log('');
        }
      }
    }
  }

  // Check auth users
  console.log('📋 Checking AUTH.USERS for email matches...');
  const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();
  
  if (usersError) {
    console.error('Error querying auth users:', usersError);
  } else {
    const kadianUsers = users?.filter(u => 
      u.email?.toLowerCase().includes('kadian') || 
      u.user_metadata?.name?.toLowerCase().includes('kadian')
    ) || [];
    
    console.log(`Found ${kadianUsers.length} auth user(s) with "kadian" in email/name:`);
    kadianUsers.forEach(user => {
      console.log(`  - ID: ${user.id}`);
      console.log(`    Email: ${user.email}`);
      console.log(`    Name: ${user.user_metadata?.name || 'N/A'}`);
      console.log(`    Created: ${user.created_at}`);
      console.log('');
    });
  }
}

searchKadian().catch(console.error);

