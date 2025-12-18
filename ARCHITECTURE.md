# CrowdStack Architecture & User Flows

## Overview

CrowdStack is a dual-app monorepo with distinct user experiences:

- **`apps/web`** (crowdstack.app) - Public marketing site + attendee-facing experience
- **`apps/app`** (app.crowdstack.app) - B2B dashboards + door scanner

## User Roles & Access

### 1. **Venue Admin** (`venue_admin`)
- **Who**: Venue owners/managers
- **Signup**: Invite-only via token
- **Dashboard**: `app.crowdstack.app/app/venue`
- **Access**: Full venue data, events, promoters, organizers, reports, guest flags

### 2. **Event Organizer** (`event_organizer`)
- **Who**: Independent event organizers
- **Signup**: Invite-only via token
- **Dashboard**: `app.crowdstack.app/app/organizer`
- **Access**: Create/manage events, assign promoters, handle payouts, publish photos

### 3. **Promoter** (`promoter`)
- **Who**: Marketing/sales people driving ticket sales
- **Signup**: Invite-only via token (from organizer or venue)
- **Dashboard**: `app.crowdstack.app/app/promoter`
- **Access**: View assigned events, track referrals, earnings, generate links/QR codes

### 4. **Door Staff** (`door_staff`)
- **Who**: Event check-in staff
- **Signup**: Invite-only via token
- **Dashboard**: `app.crowdstack.app/door/[eventId]`
- **Access**: Scan QR codes, check-in attendees, quick-add at door

### 5. **Attendee** (`attendee`)
- **Who**: Event-goers/consumers
- **Signup**: No password required - register for events, claim account later
- **Dashboard**: `crowdstack.app/me`
- **Access**: View events, QR passes, photos, XP, profile

## Current Architecture

### apps/web (Public + Attendee)
**Domain**: `crowdstack.app` (prod) / `beta.crowdstack.app` (preview)

**Public Routes:**
- `/` - Landing page (should focus on venue signups)
- `/pricing` - Pricing page
- `/contact` - Contact form
- `/login` - Generic login (magic link for all users)
- `/legal` - Terms & Privacy

**Auth Routes:**
- `/invite/[token]` - Accept invite token (B2B roles)
- `/auth/magic` - Magic link callback
- `/auth/set-password` - Claim account / set password

**Attendee Routes:**
- `/e/[eventSlug]` - Event landing page
- `/e/[eventSlug]/register` - Register for event (no password)
- `/e/[eventSlug]/pass` - QR pass viewer
- `/checkin/[eventId]` - Quick-add link (fallback)
- `/p/[eventSlug]` - Photo gallery
- `/me` - Attendee dashboard (XP, upcoming, history)
- `/me/events` - My events
- `/me/profile` - Profile settings

### apps/app (B2B Dashboards)
**Domain**: `app.crowdstack.app` (prod) / `app-beta.crowdstack.app` (preview)

**Venue Dashboard** (`/app/venue`):
- KPIs overview
- Events list & detail
- Promoters management
- Organizers management
- Guest flags/bans
- Reports & analytics
- Settings

**Organizer Dashboard** (`/app/organizer`):
- Dashboard overview
- Events (list, new, detail)
- Promoters management
- Payouts
- Event photos
- Settings

**Promoter Portal** (`/app/promoter`):
- Dashboard
- Event stats
- Tools (links/QR codes)
- Earnings
- Profile

**Door Scanner** (`/door/[eventId]`):
- Scan QR codes
- Search attendees
- Check-in
- Quick-add modal

**Admin** (`/admin`):
- Fix promoter attribution
- Merge duplicate attendees
- Resolve disputes

## Current Signup Flow Issues

### ❌ Problem: No Clear Venue Signup Path

**Current State:**
1. Landing page (`/`) has generic "Get Started" → `/login`
2. `/login` is generic magic link (works for all, but confusing)
3. Venues must get invite token manually (SQL/admin)
4. No clear "Sign up as a venue" CTA

**What Should Happen:**
1. Landing page should prominently feature venue signup
2. "Request Demo" or "Contact Sales" for venues
3. Admin generates invite token
4. Venue clicks invite link → `/invite/[token]` → login → accept → dashboard

### ✅ Recommended Flow

**For Venues:**
1. Visit `crowdstack.app` → See venue-focused landing
2. Click "Request Demo" or "Get Started" → Contact form or waitlist
3. Admin creates venue + generates invite token
4. Venue receives email with invite link: `crowdstack.app/invite/[token]`
5. Click link → If not logged in → `/login?redirect=/invite/[token]`
6. Login with magic link → Accept invite → Redirected to `app.crowdstack.app/app/venue`

**For Attendees:**
1. Visit event landing: `crowdstack.app/e/[eventSlug]`
2. Click "Register" → `/e/[eventSlug]/register`
3. Enter name/email/phone (no password)
4. Get QR pass → `/e/[eventSlug]/pass`
5. Later: Photos published → Receive magic link → Claim account → `/me`

## Login Page Purpose

The `/login` page in `apps/web` is currently **generic** and serves:
- **Attendees**: Magic link login (after claiming account)
- **B2B Users**: Magic link login (before accepting invite or after)

**Better Approach:**
- Keep `/login` generic (it works)
- OR create role-aware login that detects context
- Landing page should route venues to contact/demo, not login

## Middleware & Routing

### apps/app middleware
- Protects all routes except `/health`
- Redirects unauthenticated users to `/login` (in apps/web)
- Role-based redirects:
  - `venue_admin` → `/app/venue`
  - `event_organizer` → `/app/organizer`
  - `promoter` → `/app/promoter`
  - `door_staff` → `/door`
  - `attendee` → `/me` (redirects to web app)

### apps/web middleware
- Currently minimal (should protect `/me` routes)
- Public routes: `/`, `/pricing`, `/contact`, `/login`, `/legal`, `/e/*`, `/p/*`
- Protected routes: `/me/*`, `/invite/*` (requires auth)

## Recommended Improvements

1. **Update Landing Page** (`apps/web/src/app/page.tsx`):
   - Hero: "Event Management for Venues"
   - Primary CTA: "Request Demo" or "Contact Sales"
   - Secondary: "View Pricing"
   - Remove generic "Get Started" → `/login`

2. **Add Contact/Demo Form** (`apps/web/src/app/contact/page.tsx`):
   - Venue name, contact info, use case
   - Submit → Admin notification (or outbox event)

3. **Improve Login Context**:
   - Show different messaging based on redirect param
   - If `?redirect=/invite/*` → "Sign in to accept your invite"
   - If no redirect → "Sign in to your account"

4. **Add Venue Signup Flow** (Future):
   - Self-service venue signup (optional)
   - Or keep invite-only but make it clearer

## Environment Variables

### apps/web
- `NEXT_PUBLIC_WEB_URL` - Web app URL
- `NEXT_PUBLIC_APP_URL` - B2B app URL (for redirects)

### apps/app
- `NEXT_PUBLIC_APP_URL` - B2B app URL
- `NEXT_PUBLIC_WEB_URL` - Web app URL (for redirects)

## Summary

**Current State:**
- ✅ Architecture is sound (dual-app separation)
- ✅ Role-based access works
- ✅ Invite system works
- ❌ Landing page doesn't focus on venue signups
- ❌ No clear venue onboarding path
- ❌ Login is generic (works but not ideal)

**Next Steps:**
1. Update landing page to focus on venues
2. Add "Request Demo" CTA
3. Improve login context awareness
4. Document venue onboarding process

