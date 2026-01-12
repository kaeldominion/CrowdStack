#!/usr/bin/env node

/**
 * Script to check promoter profile status for a user
 * Usage: node scripts/check-promoter-status.js promoter@crowdstack.app
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const email = process.argv[2] || 'promoter@crowdstack.app';

if (!email) {
  console.error('Usage: node scripts/check-promoter-status.js <email>');
  process.exit(1);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function checkPromoterStatus() {
  console.log(`\n🔍 Checking promoter status for: ${email}\n`);
  console.log('=' .repeat(60));

  try {
    // 1. Find the user
    console.log('\n1. Finding user...');
    const { data: users, error: userError } = await supabase.auth.admin.listUsers();
    const user = users?.users?.find(u => u.email === email);
    
    if (!user) {
      console.log('❌ User not found in auth.users');
      return;
    }
    
    console.log(`✅ User found: ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Created: ${user.created_at}`);

    // 2. Check user roles
    console.log('\n2. Checking user roles...');
    const { data: roles, error: rolesError } = await supabase
      .from('user_roles')
      .select('role, created_at')
      .eq('user_id', user.id);
    
    if (rolesError) {
      console.error('❌ Error checking roles:', rolesError.message);
    } else {
      const promoterRole = roles?.find(r => r.role === 'promoter');
      if (promoterRole) {
        console.log('✅ Promoter role found');
        console.log(`   Assigned at: ${promoterRole.created_at}`);
      } else {
        console.log('❌ No promoter role found');
        console.log(`   User has ${roles?.length || 0} role(s):`, roles?.map(r => r.role).join(', ') || 'none');
      }
    }

    // 3. Check promoter profile by user_id
    console.log('\n3. Checking promoter profile (by user_id)...');
    const { data: promoterByUserId, error: promoterError1 } = await supabase
      .from('promoters')
      .select('id, name, email, phone, status, user_id, created_by, created_at')
      .eq('user_id', user.id)
      .maybeSingle();
    
    if (promoterError1) {
      console.error('❌ Error checking promoter profile:', promoterError1.message);
    } else if (promoterByUserId) {
      console.log('✅ Promoter profile found (by user_id)');
      console.log(`   ID: ${promoterByUserId.id}`);
      console.log(`   Name: ${promoterByUserId.name}`);
      console.log(`   Email: ${promoterByUserId.email || 'N/A'}`);
      console.log(`   Status: ${promoterByUserId.status || 'N/A'}`);
      console.log(`   Created: ${promoterByUserId.created_at}`);
    } else {
      console.log('❌ No promoter profile found (by user_id)');
    }

    // 4. Check promoter profile by created_by (legacy)
    console.log('\n4. Checking promoter profile (by created_by - legacy)...');
    const { data: promoterByCreated, error: promoterError2 } = await supabase
      .from('promoters')
      .select('id, name, email, phone, status, user_id, created_by, created_at')
      .eq('created_by', user.id)
      .maybeSingle();
    
    if (promoterError2) {
      console.error('❌ Error checking promoter profile (created_by):', promoterError2.message);
    } else if (promoterByCreated) {
      console.log('✅ Promoter profile found (by created_by)');
      console.log(`   ID: ${promoterByCreated.id}`);
      console.log(`   Name: ${promoterByCreated.name}`);
      console.log(`   User ID set: ${promoterByCreated.user_id ? 'Yes' : 'No (needs update!)'}`);
      console.log(`   Created: ${promoterByCreated.created_at}`);
    } else {
      console.log('❌ No promoter profile found (by created_by)');
    }

    // 5. Summary and recommendations
    console.log('\n' + '='.repeat(60));
    console.log('\n📋 SUMMARY:\n');
    
    const hasRole = roles?.some(r => r.role === 'promoter');
    const hasProfile = !!(promoterByUserId || promoterByCreated);
    
    if (hasRole && hasProfile) {
      console.log('✅ User has both promoter role and profile');
      if (promoterByCreated && !promoterByCreated.user_id) {
        console.log('⚠️  WARNING: Profile exists but user_id is not set (using created_by)');
        console.log('   Recommendation: Update promoter profile to set user_id');
      }
    } else if (hasRole && !hasProfile) {
      console.log('❌ User has promoter role BUT NO profile');
      console.log('   Recommendation: Create promoter profile via /api/promoter/profile/ensure or admin interface');
    } else if (!hasRole && hasProfile) {
      console.log('❌ User has promoter profile BUT NO role');
      console.log('   Recommendation: Add promoter role to user_roles table');
    } else {
      console.log('❌ User has neither promoter role nor profile');
      console.log('   Recommendation: Add promoter role and create profile');
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
  }
}

checkPromoterStatus();
