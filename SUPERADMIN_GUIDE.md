# Superadmin Guide - What You Can Access

## Overview

As a **superadmin**, you have access to everything in the system. Here's what's available:

## Your Dashboards

### 1. **Admin Panel** (`/admin`)
- **URL**: `http://localhost:3006/admin`
- **Purpose**: Manage the entire platform
- **Features**:
  - User management
  - Venue management
  - Event management
  - Promoter management
  - Attendee management
  - System-wide settings

### 2. **Unified Dashboard** (`/app`)
- **URL**: `http://localhost:3006/app`
- **Purpose**: Role-aware dashboard for B2B users
- **Features**: 
  - See the unified dashboard interface
  - Switch between different role perspectives (venue, organizer, promoter)
  - Access all B2B features

## How to Impersonate Other Roles

As superadmin, you can **impersonate** other roles to see the system from their perspective:

### Step 1: Go to Unified Dashboard
- Visit: `http://localhost:3006/app`

### Step 2: Use the Role Switcher
- Look for the **"Switch Role"** dropdown in the top navigation (usually near your profile)
- This is the `EntitySwitcher` component

### Step 3: Select a Role
- Choose a role:
  - **Venue Admin** - See venue dashboard
  - **Event Organizer** - See organizer dashboard  
  - **Promoter** - See promoter dashboard
  - **Attendee** - See attendee view

### Step 4: Select a Specific Entity
- After selecting a role, you'll see a list of venues/organizers/promoters
- Select a specific one to impersonate that entity
- The system will set cookies to make you "be" that role/entity

### Step 5: Navigate
- Once impersonating, navigate to role-specific routes:
  - `/app/venue` - Venue dashboard
  - `/app/organizer` - Organizer dashboard
  - `/app/promoter` - Promoter dashboard

## What's Actually Built

### 1. **Unified App Shell** (`/app/*`)
- Single layout for all B2B roles
- Role-aware navigation (shows/hides items based on role)
- Works for: Venue Admin, Organizer, Promoter, Superadmin

### 2. **Admin Panel** (`/admin/*`)
- Separate admin interface
- Only accessible to superadmin
- Full system management

### 3. **Role Impersonation**
- Superadmin can switch roles via `EntitySwitcher`
- Uses cookies to temporarily "become" another role
- Allows testing from different perspectives

### 4. **Individual Role Dashboards**
- `/app/venue` - Venue management
- `/app/organizer` - Event management
- `/app/promoter` - Promoter tools
- `/admin` - System admin

## Common Issues

### "Can't access /app"
- **Fix**: Make sure you're logged in as superadmin
- The `/app` route should allow superadmin access now (just fixed)

### "Can't see role switcher"
- **Fix**: Make sure you're on `/app` (unified dashboard)
- The switcher is in the `AppLayout` top navigation

### "Want to act as a specific venue"
1. Go to `/app`
2. Click role switcher → Select "Venue Admin"
3. Select the specific venue from the list
4. Navigate to `/app/venue` to see that venue's dashboard

## Quick Navigation

| What You Want | URL |
|--------------|-----|
| Admin Panel | `/admin` |
| Unified Dashboard | `/app` |
| Act as Venue | `/app` → Switch Role → Venue Admin → Select Venue |
| Act as Organizer | `/app` → Switch Role → Event Organizer → Select Organizer |
| Act as Promoter | `/app` → Switch Role → Promoter → Select Promoter |

## Architecture Summary

```
Superadmin User
├── Admin Panel (/admin) - Full system management
└── Unified Dashboard (/app)
    ├── Can view as superadmin
    └── Can impersonate other roles via EntitySwitcher
        ├── Venue Admin → /app/venue
        ├── Event Organizer → /app/organizer
        └── Promoter → /app/promoter
```

## Testing Different Roles

To test as a venue:
1. `/app` → Switch to "Venue Admin" → Select a venue
2. Navigate to `/app/venue` 
3. You'll see that venue's dashboard, events, attendees, etc.

To test as an organizer:
1. `/app` → Switch to "Event Organizer" → Select an organizer
2. Navigate to `/app/organizer`
3. You'll see that organizer's events, promoters, analytics, etc.

The impersonation uses cookies (`cs-impersonate-role` and `cs-impersonate-entity-id`) to temporarily override your actual role when fetching data.

