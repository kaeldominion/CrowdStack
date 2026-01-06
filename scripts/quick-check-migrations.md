# Quick Migration Check for Beta and Prod

## Method 1: Using Supabase SQL Editor (Easiest)

1. **For BETA:**
   - Go to your Beta Supabase dashboard
   - Open SQL Editor
   - Copy and paste the contents of `scripts/check-migrations-sql-both.sql`
   - Run it
   - Note the results

2. **For PROD:**
   - Go to your Prod Supabase dashboard  
   - Open SQL Editor
   - Copy and paste the contents of `scripts/check-migrations-sql-both.sql`
   - Run it
   - Compare with Beta results

## Method 2: Using Supabase CLI

### Check Beta:
```bash
# Link to Beta (you'll need the project ref)
supabase link --project-ref YOUR_BETA_PROJECT_REF

# Check migrations
supabase migration list | grep -E "12[0-9]"

# Check database objects
supabase db remote exec < scripts/verify-migrations-ran.sql
```

### Check Prod:
```bash
# Link to Prod (you'll need the project ref)
supabase link --project-ref YOUR_PROD_PROJECT_REF

# Check migrations
supabase migration list | grep -E "12[0-9]"

# Check database objects
supabase db remote exec < scripts/verify-migrations-ran.sql
```

## What to Look For:

✅ **Good signs:**
- Migrations 124, 125, 126, 127 show in migration list
- Function `sync_promoter_name_from_attendee` exists
- Trigger `trigger_sync_promoter_name_from_attendee` exists
- Trigger `trigger_sync_promoter_name_on_attendee_insert` exists

❌ **Bad signs:**
- Migrations show in list but objects don't exist
- No triggers found
- No functions found

## If Migrations Didn't Run:

If the objects don't exist but migrations are marked as applied, you can:

1. **Option A:** Create a new migration (128) that creates the objects
2. **Option B:** Manually run the SQL from migrations 124 and 127
3. **Option C:** Reset the migration records and re-run

Let me know what you find and I can help fix it!

