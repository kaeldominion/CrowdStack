import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing Supabase environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function setPassword() {
  const email = "spencertarring@gmail.com";
  const password = "spenceriscool!23";

  try {
    // Get user by email
    const { data: users, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      throw listError;
    }

    const user = users.users.find(u => u.email === email);

    if (!user) {
      console.error(`User with email ${email} not found`);
      process.exit(1);
    }

    // Update password using admin API
    const { data, error } = await supabase.auth.admin.updateUserById(user.id, {
      password: password,
    });

    if (error) {
      throw error;
    }

    console.log(`✅ Password set successfully for ${email}`);
    console.log(`User ID: ${user.id}`);
  } catch (error: any) {
    console.error("❌ Error setting password:", error.message);
    process.exit(1);
  }
}

setPassword();







