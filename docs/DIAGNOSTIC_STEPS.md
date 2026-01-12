# Diagnostic Steps for Resolving Caching/Data Issues

## For Promoter: ayu-paige

### Step 1: Check Public Profile Page
1. Visit: https://crowdstack.app/promoter/ayu-paige
2. Look for the record ID displayed near the promoter name (format: `ID: <uuid> | Slug: ayu-paige`)
3. **Write down the ID** you see on the public profile page
4. Note what data is currently displayed (bio, profile image, etc.)

### Step 2: Check Dashboard/Edit View
1. Log in as the promoter (or as admin)
2. Go to the promoter's profile edit page: `/app/promoter/profile`
3. Look for the record ID displayed near the "Profile" heading (format: `ID: <uuid> | Slug: ayu-paige`)
4. **Write down this ID**
5. Note what data is shown in the edit form (bio, profile image, etc.)

### Step 3: Compare the IDs
- **If IDs MATCH**: The issue is likely caching - both pages are looking at the same database record, but the public page is showing stale cached data
- **If IDs DON'T MATCH**: The issue is data lookup - the public page and edit page are querying different database records

### Step 4: Use Diagnostic Tool
1. Go to Admin Dashboard: `/admin`
2. Click on "Database Diagnostics" in the Admin Tools section
3. Select "Promoter" as the type
4. Enter the slug: `ayu-paige`
5. Click "Query"

### Step 5: Analyze Diagnostic Results

#### Scenario A: Single Record Found
- The tool shows **1 record** with slug `ayu-paige`
- Check the database record's data (bio, profile_image_url, etc.)
- Compare with what you see on:
  - Public profile page
  - Dashboard edit page
- If database data matches dashboard but NOT public profile → **Caching issue**
- If database data doesn't match either → **Update issue**

#### Scenario B: Multiple Records Found
- The tool shows **WARNING: X records with this slug!**
- This is the problem! Multiple promoter records share the same slug
- The public profile might be showing a different record than the edit page
- **Solution**: Identify which record is the "correct" one, then:
  - Update the other record(s) to have a different slug (or delete if duplicates)
  - Or merge the records if they represent the same promoter

#### Scenario C: Record Not Found
- The tool shows "Record Not Found"
- Check if the slug is correct
- The promoter profile might have been deleted or slug changed

### Step 6: Check for Duplicate Records (if needed)
If multiple records were found, you'll need to:
1. Note all the record IDs shown
2. Check which one matches the ID from Step 2 (dashboard/edit view) - this is likely the "active" record
3. For the other duplicate records:
   - Check their `updated_at` timestamp (most recent is likely the current one)
   - Check if they have different `user_id` or `created_by` values
   - Decide which record to keep and which to modify/delete

### Step 7: Verify After Fix
After making any changes:
1. Wait 2-3 minutes for any cache invalidation
2. Hard refresh the public profile page (Cmd+Shift+R on Mac, Ctrl+Shift+R on Windows)
3. Check the record ID on the public profile again
4. Verify the data matches what you see in the dashboard

## Common Issues and Solutions

### Issue: IDs Match, But Data Doesn't
**Problem**: Caching layer (Next.js/Vercel Edge Cache) showing stale data
**Possible Solutions**:
1. Check if `Cache-Control` headers are properly set (already implemented)
2. Clear Vercel Edge Cache (if you have access)
3. Verify the database was actually updated (check `updated_at` timestamp)
4. Check if there's a data transformation happening in the API route

### Issue: IDs Don't Match
**Problem**: Different records being queried
**Possible Solutions**:
1. Check the query logic in `/api/promoters/by-slug/[slug]/route.ts`
2. Check the query logic in `/api/promoter/profile/route.ts`
3. Verify which record the dashboard is using (`user_id` vs `created_by` lookup)
4. Fix the lookup logic to ensure both use the same record

### Issue: Multiple Records with Same Slug
**Problem**: Data integrity issue - duplicate slugs in database
**Solution**:
1. Identify the correct record (usually the one with the latest `updated_at` or matching `user_id`)
2. Update other records to have unique slugs or delete duplicates
3. Add database constraint to prevent duplicate slugs (if not already present)
