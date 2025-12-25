# Event Organizer Workflow

This document explains the current workflow for inviting a user to become an event organizer and adding them to an organizer entity.

## Current Workflow Overview

### Option 1: Invite New User (Pre-assign to Specific Organizer)

**Step 1: Admin Creates Organizer**
- Go to Admin → Organizers (`/admin/organizers`)
- Click "Create Organizer"
- Fill in organizer details (name, email, phone, company_name)
- Save the organizer and note its `organizer_id` (UUID)

**Step 2: Create Invite Token with Organizer ID**
- Create an invite token with `event_organizer` role and include the `organizer_id` in metadata
- **Via SQL:**
  ```sql
  SELECT public.create_invite_token(
    'event_organizer'::user_role, 
    '{"organizer_id": "YOUR_ORGANIZER_ID_HERE"}'::jsonb,
    'YOUR_ADMIN_USER_ID'::uuid  -- Optional, can be NULL
  );
  ```
- **Via Code (if you have access):**
  ```typescript
  import { createInviteToken } from "@crowdstack/shared/auth/invites";
  const token = await createInviteToken(
    "event_organizer",
    { organizer_id: "YOUR_ORGANIZER_ID_HERE" },
    adminUserId
  );
  ```

**Step 3: User Signs Up and Accepts Invite**
- Share the invite URL: `https://crowdstack.app/invite/{token}` (or `beta.crowdstack.app` for staging)
- User clicks the link
- If not logged in, they're redirected to login/signup
- User signs up with email (magic link)
- After signup, they accept the invite
- **What happens automatically:**
  1. User gets `event_organizer` role in `user_roles` table
  2. User is linked to the organizer in `organizer_users` table (if `organizer_id` was in token metadata)
  3. User is redirected to `/app/organizer`

### Option 2: Add Existing User to Organizer (Current Manual Process)

**Step 1: Admin Creates Organizer**
- Go to Admin → Organizers (`/admin/organizers`)
- Click "Create Organizer"
- Fill in organizer details
- Save the organizer

**Step 2: Admin Assigns User to Organizer**
- Go to Admin → Users (`/admin/users`)
- Click on the user you want to assign
- This opens the user detail modal
- Use the "Assign to Organizer" option to select an organizer
- **What happens:**
  1. Creates entry in `organizer_users` table linking user to organizer
  2. Automatically grants `event_organizer` role if user doesn't have it
  3. User can now access the organizer dashboard

## Database Schema

### Key Tables

1. **`organizers`** - Organizer entities
   - `id` (UUID) - Primary key
   - `name`, `email`, `phone`, `company_name`
   - `created_by` (UUID) - User who created it

2. **`organizer_users`** - Junction table linking users to organizers
   - `organizer_id` (UUID) → `organizers.id`
   - `user_id` (UUID) → `auth.users.id`
   - `role` (TEXT) - Usually "admin"
   - `assigned_by` (UUID) - User who made the assignment
   - **Constraint:** One user can only be assigned to one organizer (enforced by unique constraint on `user_id`)

3. **`user_roles`** - User roles (separate from organizer assignment)
   - `user_id` (UUID) → `auth.users.id`
   - `role` (enum) - One of: `event_organizer`, `venue_admin`, `promoter`, `door_staff`, `attendee`
   - User must have `event_organizer` role to access organizer features

4. **`invite_tokens`** - Invite tokens for B2B roles
   - `token` (TEXT) - Unique invite token
   - `role` (enum) - Role to assign
   - `metadata` (JSONB) - Can include `organizer_id` to pre-assign user
   - `used_at` (TIMESTAMP) - When token was used (single-use)

## Important Notes

1. **One Organizer Per User:** The system enforces that each user can only be assigned to one organizer profile. This is a business rule enforced at the database level.

2. **Two-Step Process:** Currently, the typical workflow is:
   - Create the organizer first
   - Then assign a user to it (either via invite token with metadata, or manually via admin UI)

3. **Role vs Assignment:**
   - Having `event_organizer` role gives user access to organizer features
   - Being assigned to a specific organizer (via `organizer_users`) determines which organizer's data they can access
   - Both are needed for a user to manage a specific organizer

4. **Invite Token Metadata:**
   - If you create an invite token with `organizer_id` in metadata, the user will be automatically linked when they accept
   - If metadata is empty or missing `organizer_id`, user gets the role but no organizer assignment (you'd need to assign manually later)

## API Endpoints

### Create Organizer
- **POST** `/api/admin/organizers/create`
- Body: `{ name, email?, phone?, company_name? }`
- Requires: `superadmin` role

### Update Organizer
- **PATCH** `/api/admin/organizers/[organizerId]`
- Body: `{ name, email?, phone?, company_name? }`
- Requires: `superadmin` role

### Assign User to Organizer
- **POST** `/api/admin/users/[userId]/assign`
- Body: `{ entityId: organizerId, entityType: "organizer", action: "assign" }`
- Requires: `superadmin` role
- Automatically grants `event_organizer` role if user doesn't have it

### Accept Invite Token
- **POST** `/api/invites/[token]/accept`
- Requires: Authenticated user
- Automatically handles role assignment and organizer linking (if metadata includes `organizer_id`)

## Summary

**Current Recommended Workflow:**
1. Admin creates organizer in Admin UI
2. Admin creates invite token with `organizer_id` in metadata (via SQL or future API endpoint)
3. User receives invite link, signs up, accepts invite
4. User is automatically assigned to the organizer and can access the organizer dashboard

**Alternative Workflow (for existing users):**
1. Admin creates organizer in Admin UI
2. Admin goes to Users page, selects user, assigns to organizer
3. User gets `event_organizer` role and access to that organizer







