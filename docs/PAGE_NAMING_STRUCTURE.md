# Page Naming Structure

## Overview

CrowdStack uses a clear separation between consumer-facing (attendee) pages and business-facing (B2B) pages.

## Current Structure

### Consumer-Facing Pages (`/me/*`)
**Purpose**: Personal dashboard for event attendees (consumers)

**Routes**:
- `/me` - Main attendee dashboard (XP, upcoming events, stats)
- `/me/history` - Event history (past events)
- `/me/upcoming` - Upcoming events list
- `/me/events` - All events (upcoming + past)
- `/me/profile` - Profile settings
- `/me/settings` - Account settings
- `/me/security` - Security settings
- `/me/billing` - Billing/payment info

**Who uses it**: Users with `attendee` role (or no B2B roles)

**Navigation**: Shows attendee-specific navigation with XP, events, profile links

---

### Business-Facing Pages (`/app/*`)
**Purpose**: Business dashboards for venue admins, organizers, and promoters

**Routes**:
- `/app/venue` - Venue workspace
- `/app/organizer` - Organizer workspace  
- `/app/promoter` - Promoter workspace

**Who uses it**: Users with B2B roles (`venue_admin`, `event_organizer`, `promoter`)

**Navigation**: Shows business-specific navigation with KPIs, events, tools, etc.

---

## Naming Rationale

### Why `/me` for Attendees?
- **Personal/Consumer Context**: `/me` implies a personal, consumer-facing experience
- **Common Pattern**: Many consumer apps use `/me` or `/profile` for personal dashboards
- **Clear Separation**: Distinguishes from business dashboards at `/app/*`

### Why `/app/*` for B2B?
- **Business Context**: `/app` implies a business/application context
- **Role-Based**: Each role has its own sub-route (`/app/venue`, `/app/organizer`, etc.)
- **Professional**: Matches common B2B SaaS patterns

---

## Access Control

### Current Behavior
- **Attendees** → Redirected to `/me` after login
- **B2B Users** → Redirected to `/app/[role]` after login
- **Mixed Roles** → Should be handled by middleware (redirect to primary role)

### Recommended Protection
- Add middleware check: If user has B2B roles and tries to access `/me/*`, redirect to their business dashboard
- Add middleware check: If user is only an attendee and tries to access `/app/*`, redirect to `/me`

---

## Potential Confusion Points

### Issue: Can B2B Users Access `/me`?
**Current**: Technically yes, if they navigate directly
**Recommendation**: 
- Option 1: Allow B2B users to access `/me` if they also have `attendee` role (they can be both)
- Option 2: Redirect B2B users away from `/me` to their business dashboard
- **Decision Needed**: Should organizers/venues be able to view their personal attendee dashboard?

### Issue: What if a user has multiple roles?
**Example**: User is both `event_organizer` AND `attendee`
**Current**: Middleware redirects based on primary role (organizer > promoter > attendee)
**Recommendation**: 
- Show links to both dashboards in navigation
- Allow switching between personal (`/me`) and business (`/app/[role]`) views
- Add a "Switch to Personal View" / "Switch to Business View" toggle

---

## ✅ Implemented Recommendations

### 1. **Formalized Naming** (✅ Complete)
   - `/me` = **"My Dashboard"** (attendee-facing, personal dashboard)
   - `/app/venue` = **"Workspace"** (unified business workspace for venues)
   - `/app/organizer` = **"Workspace"** (unified business workspace for organizers)
   - `/app/promoter` = **"Workspace"** (unified business workspace for promoters)

### 2. **Navigation Access** (✅ Complete)
   - **All users** can access `/me` via avatar dropdown in B2B dashboards
   - Avatar dropdown in `AppLayout` includes "My Dashboard" link to `/me`
   - Available on all B2B dashboards (`/app/venue`, `/app/organizer`, `/app/promoter`, `/admin`)

### 3. **Naming Conventions** (✅ Implemented)
   - **Dropdown Menu**: "My Dashboard" (links to `/me`)
   - **Page Headers**: Use "Dashboard" for `/me`, "[Role] Dashboard" for `/app/[role]`
   - **Back Buttons**: "Back to Dashboard" (links to `/me`)

### 4. **Access Control** (✅ Complete)
   - All authenticated users can access `/me` regardless of role
   - B2B users see "My Dashboard" in avatar dropdown
   - Attendees see "My Dashboard" in their navigation

---

## Current Implementation

### Avatar Dropdown Items (AppLayout)
All B2B dashboards (`/app/*`, `/admin`) show:
- **My Dashboard** → `/me` (personal/attendee dashboard)
- Profile → `/me/profile`
- Settings → `/me/settings`
- Billing → `/me/billing`
- Security → `/me/security`
- Sign out

### Page Structure
- **Personal Dashboard** (`/me`): XP, upcoming events, stats, history
- **Business Dashboards** (`/app/[role]`): Role-specific KPIs, events, tools
- **Both accessible** via avatar dropdown for all users

---

## Naming Standards

### In UI Text
- `/me` → **"My Dashboard"** (in navigation, dropdowns, links)
- `/app/venue` → **"Workspace"** (unified name for all business roles)
- `/app/organizer` → **"Workspace"** (unified name for all business roles)
- `/app/promoter` → **"Workspace"** (unified name for all business roles)

### In Code/Comments
- Use descriptive names: `MyDashboardPage`, `VenueDashboardPage`, etc.
- Route paths: `/me`, `/app/venue`, `/app/organizer`, `/app/promoter`

### User-Facing Labels
- **"My Dashboard"** = Personal/attendee experience
- **"Workspace"** = Unified business/professional experience (same name for all roles)
- Both are accessible to all authenticated users

