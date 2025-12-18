# User Management Structure

## Overview

CrowdStack follows a clear user management model where:
1. **Everyone is a user** - All accounts are in `auth.users` (Supabase Auth)
2. **Roles are separate** - Roles are assigned via `user_roles` table
3. **Profiles are linked** - Venues, Organizers, Promoters are profiles linked to users

## Key Concepts

### 1. Users & Roles

- **Base User**: All accounts exist in `auth.users` (Supabase Auth)
- **Roles**: Assigned via `user_roles` table:
  - `venue_admin` - Can manage venues
  - `event_organizer` - Can create/manage events
  - `promoter` - Can promote events and earn commissions
  - `door_staff` - Can check in attendees
  - `attendee` - Basic user role (optional, can view dashboard)
  - `superadmin` - Platform administrator

### 2. Venues & Organizers (Many-to-Many)

**Old Model**: One user per venue/organizer via `created_by`

**New Model**: Multiple users can manage the same venue/organizer

**Tables**:
- `venues` - Venue profile (keeps `created_by` for history)
- `organizers` - Organizer profile (keeps `created_by` for history)
- `venue_users` - Junction table linking users to venues
- `organizer_users` - Junction table linking users to organizers

**Admin Assignment**:
- Admin can assign any user to any venue/organizer
- Users must have the `venue_admin` or `event_organizer` role
- Multiple users can be assigned (many-to-many)

**Example**:
```sql
-- Assign user to venue
INSERT INTO venue_users (venue_id, user_id, role, assigned_by)
VALUES ('venue-uuid', 'user-uuid', 'admin', 'admin-user-uuid');

-- User can now access that venue's dashboard
```

### 3. Promoters (One-to-One with User)

**Model**: Any user can become a promoter

**Tables**:
- `promoters` - Promoter profile (linked to user via `user_id`)
- `user_roles` - Must have `promoter` role

**Becoming a Promoter**:
1. **Via Admin**: Admin assigns `promoter` role + creates/approves promoter profile
2. **Self-Request**: User requests via dashboard → Admin approves
3. **Event Invite**: Organizer sends "become a promoter" link → User signs up → Auto-approved or pending

**Promoter Status**:
- `pending` - Requested, awaiting approval
- `active` - Approved, can promote events
- `suspended` - Banned/blocked

**Example**:
```sql
-- User requests to become promoter
INSERT INTO user_roles (user_id, role) VALUES ('user-uuid', 'promoter');
INSERT INTO promoters (user_id, name, email, status) 
VALUES ('user-uuid', 'John Doe', 'john@example.com', 'pending');

-- Admin approves
UPDATE promoters 
SET status = 'active', approved_by = 'admin-uuid', approved_at = NOW()
WHERE user_id = 'user-uuid';
```

### 4. Attendees (Email-Based)

**Model**: Attendees can exist before user accounts

**Tables**:
- `attendees` - Person profile (can exist without `user_id`)
- `user_id` - Optional link to `auth.users` (if they create account)

**Import Flow**:
1. Admin/organizer imports CSV of emails/phones
2. Attendee records created (no `user_id` yet)
3. When person registers for event, link to existing attendee by email/phone
4. If they create account later, link `user_id` to attendee

**Example**:
```sql
-- Import attendee (no user account yet)
INSERT INTO attendees (name, email, phone, import_source, imported_by)
VALUES ('Jane Doe', 'jane@example.com', '+1234567890', 'csv_upload', 'admin-uuid');

-- Later, when they create account
UPDATE attendees 
SET user_id = 'user-uuid'
WHERE email = 'jane@example.com';
```

## Database Schema

### Venue Users Junction
```sql
venue_users (
  id UUID PRIMARY KEY,
  venue_id UUID → venues(id),
  user_id UUID → auth.users(id),
  role TEXT ('admin' | 'staff'),
  assigned_by UUID → auth.users(id),
  assigned_at TIMESTAMP
)
```

### Organizer Users Junction
```sql
organizer_users (
  id UUID PRIMARY KEY,
  organizer_id UUID → organizers(id),
  user_id UUID → auth.users(id),
  role TEXT ('admin' | 'staff'),
  assigned_by UUID → auth.users(id),
  assigned_at TIMESTAMP
)
```

### Promoters
```sql
promoters (
  id UUID PRIMARY KEY,
  user_id UUID → auth.users(id) UNIQUE,
  name TEXT,
  email TEXT,
  phone TEXT,
  status TEXT ('pending' | 'active' | 'suspended'),
  requested_at TIMESTAMP,
  approved_by UUID → auth.users(id),
  approved_at TIMESTAMP,
  created_by UUID → auth.users(id), -- Original creator (kept for history)
  ...
)
```

### Attendees
```sql
attendees (
  id UUID PRIMARY KEY,
  name TEXT,
  email TEXT UNIQUE,
  phone TEXT UNIQUE,
  user_id UUID → auth.users(id) NULLABLE,
  import_source TEXT, -- 'csv_upload', 'manual', 'api'
  imported_by UUID → auth.users(id),
  imported_at TIMESTAMP,
  ...
)
```

## Helper Functions

### Get User's Venues
```sql
SELECT * FROM get_user_venue_ids(user_uuid);
-- Returns all venue IDs user has access to (via venue_users OR created_by)
```

### Get User's Organizers
```sql
SELECT * FROM get_user_organizer_ids(user_uuid);
-- Returns all organizer IDs user has access to (via organizer_users OR created_by)
```

### Get User's Promoter Profile
```sql
SELECT * FROM get_user_promoter_id(user_uuid);
-- Returns promoter profile ID if user is a promoter
```

## Admin Functions

### Assign User to Venue
```typescript
await supabase.from('venue_users').insert({
  venue_id: 'venue-uuid',
  user_id: 'user-uuid',
  role: 'admin',
  assigned_by: currentAdminUserId
});
```

### Assign User to Organizer
```typescript
await supabase.from('organizer_users').insert({
  organizer_id: 'organizer-uuid',
  user_id: 'user-uuid',
  role: 'admin',
  assigned_by: currentAdminUserId
});
```

### Approve Promoter Request
```typescript
// Add promoter role
await supabase.from('user_roles').upsert({
  user_id: 'user-uuid',
  role: 'promoter'
});

// Update promoter status
await supabase.from('promoters').update({
  status: 'active',
  approved_by: currentAdminUserId,
  approved_at: new Date().toISOString()
}).eq('user_id', 'user-uuid');
```

## RLS Policies

All tables have Row Level Security enabled. Policies check:
1. Junction tables (`venue_users`, `organizer_users`)
2. `created_by` fields (backward compatibility)
3. `user_id` fields (for promoters, attendees)
4. Superadmin bypass (via service role in practice)

## Migration Path

Migration `012_restructure_user_management.sql`:
- Creates junction tables
- Migrates existing `created_by` relationships
- Adds new columns to promoters
- Updates helper functions

Migration `013_update_rls_for_user_management.sql`:
- Updates RLS policies to check junction tables
- Maintains backward compatibility with `created_by`

