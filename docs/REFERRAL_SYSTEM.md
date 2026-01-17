# Referral System Documentation

This document describes how the referral and attribution system works in CrowdStack.

## Overview

The referral system tracks how users discover events and attributes registrations to the person who shared the link. This enables:
- Promoters to track their promotional effectiveness
- Users to earn XP for successful referrals
- Analytics on event discovery channels

## Referral Flow

```
1. Promoter shares event link with ?ref={promoterId}
         ↓
2. Visitor clicks link → ReferralTracker captures ref
         ↓
3. Click tracked via /api/referral/track-click
         ↓
4. Ref stored in sessionStorage ("referral_ref")
         ↓
5. User navigates to registration page
         ↓
6. Registration API receives ref parameter
         ↓
7. Registration attributed to referrer
         ↓
8. XP awarded, click marked as converted
```

## Promoter Profile Pages

**URL Pattern:** `/promoter/{slug}`

Example: `crowdstack.app/promoter/johnny`

### How Promoter Referrals Work

When viewing a promoter's public profile:

1. **Event Links**: All event cards include `?ref={promoterId}` automatically
2. **Share Button**: When a visitor shares an event FROM the promoter's page, the share URL preserves the promoter's referral code
3. **Profile Visibility**: Only visible if `is_public = true` in the promoters table

### Key Files
- `apps/unified/src/app/promoter/[slug]/page.tsx` - Server component
- `apps/unified/src/app/promoter/[slug]/PromoterProfileClient.tsx` - Client component

## Ref Parameter Formats

The system accepts multiple referral code formats:

| Format | Example | Description |
|--------|---------|-------------|
| Raw UUID | `550e8400-e29b-...` | Direct user or promoter ID |
| User prefix | `user_550e8400-...` | Explicit user referral |
| Organizer prefix | `org_550e8400-...` | Organizer referral |
| Invite code | `INV-ABC123` | QR code / invite link |

## ReferralTracker Component

**Location:** `apps/unified/src/components/ReferralTracker.tsx`

Wraps event pages to capture referral parameters early.

```tsx
<ReferralTracker eventId={event.id}>
  <EventPageContent />
</ReferralTracker>
```

**Functionality:**
1. Extracts `ref` from URL query params
2. Stores in sessionStorage as `referral_ref`
3. Calls `/api/referral/track-click` to record the click
4. Provides `useReferralUserId()` hook for child components

## Session Storage Handling

The registration page checks two sources for the referral code:

```typescript
const urlRef = searchParams.get("ref");                    // From current URL
const sessionRef = sessionStorage.getItem("referral_ref"); // From ReferralTracker
const ref = urlRef || sessionRef;                          // URL takes priority
```

This ensures referrals work when:
- User clicks a link with `?ref=` directly
- User navigates from event page (where ReferralTracker stored the ref) to registration

## Registration Attribution

**API Route:** `/api/events/by-slug/[slug]/register`

### Attribution Priority

1. **Explicit referral** - If `?ref=` provided, use it
2. **Organizer's promoter profile** - If organizer has a promoter profile, attribute to them
3. **Venue's promoter profile** - If venue has a promoter profile, attribute to them

### Database Fields

Registrations table stores:
- `referred_by_user_id` - User who referred (any user)
- `referral_promoter_id` - Promoter who referred (if applicable)

## Share Functionality

**Location:** `apps/unified/src/components/ShareButton.tsx`

When users share events:

1. If authenticated, `?ref={currentUserId}` is appended automatically
2. If sharing from a promoter page, the promoter's ref is used instead
3. Share options: Copy Link, Native Share, Instagram Stories, etc.

### Special Case: Sharing from Promoter Page

When viewing a promoter's profile at `/promoter/johnny`:
- All event share buttons use `?ref={promoterId}` (Johnny's ID)
- This ensures anyone who receives the shared link is attributed to Johnny
- Implemented via `shareRef` prop passed to EventCardRow/ShareButton

## Database Schema

### referral_clicks Table
```sql
CREATE TABLE referral_clicks (
  id UUID PRIMARY KEY,
  event_id UUID REFERENCES events(id),
  referrer_user_id UUID REFERENCES auth.users(id),
  visitor_fingerprint TEXT,     -- Anonymous hash (IP + User Agent)
  clicked_at TIMESTAMP,
  converted_at TIMESTAMP,       -- Set when registration occurs
  registration_id UUID,         -- Links to the resulting registration
  created_at TIMESTAMP
);
```

### registrations Table (Referral Columns)
```sql
ALTER TABLE registrations ADD COLUMN
  referred_by_user_id UUID REFERENCES auth.users(id),
  referral_promoter_id UUID REFERENCES promoters(id);
```

### Indexes
```sql
CREATE INDEX idx_referral_clicks_referrer_user_id ON referral_clicks(referrer_user_id);
CREATE INDEX idx_registrations_referred_by_user_id ON registrations(referred_by_user_id);
CREATE INDEX idx_registrations_referral_promoter_id ON registrations(referral_promoter_id);
```

## API Endpoints

### POST /api/referral/track-click
Records a referral click (called by ReferralTracker).

**Body:**
```json
{
  "eventId": "uuid",
  "referrerUserId": "uuid"  // Can be a user ID or promoter ID
}
```

**Note:** The `referrerUserId` parameter accepts both:
- **User IDs** (from `auth.users`) - when a regular user shares
- **Promoter IDs** (from `promoters` table) - when sharing from a promoter profile page

The API automatically detects which type was provided and resolves the actual user ID from the promoter's `created_by` field if needed.

**Response:**
```json
{
  "success": true,
  "clickId": "uuid"
}
```

### GET /api/referral/stats
Returns referral statistics for the authenticated user.

**Response:**
```json
{
  "totalClicks": 150,
  "totalRegistrations": 45,
  "convertedClicks": 42,
  "conversionRate": 28.0,
  "eventBreakdown": [
    {
      "eventId": "uuid",
      "eventName": "Gallery 808",
      "eventSlug": "gallery-808-jan-17",
      "clicks": 50,
      "registrations": 15
    }
  ]
}
```

## XP Awards

| Action | XP Amount | Type |
|--------|-----------|------|
| Referral click tracked | 2 XP | `REFERRAL_CLICK` |
| User referral registration | 15 XP | `USER_REFERRAL_REGISTRATION` |
| Promoter referral registration | 25 XP | `PROMOTER_REFERRAL_REGISTRATION` |

XP is awarded via database triggers when registrations are created.

## Conversion Tracking

When a registration occurs with a referral:

1. System finds most recent unconverted click from the same referrer for that event
2. Updates `referral_clicks.converted_at` with current timestamp
3. Links click to registration via `registration_id`
4. Analytics event fired for tracking

## Key Implementation Files

| File | Purpose |
|------|---------|
| `components/ReferralTracker.tsx` | Captures ref from URL, stores in session |
| `components/ShareButton.tsx` | Appends ref to share URLs |
| `app/promoter/[slug]/PromoterProfileClient.tsx` | Passes promoter ref to event cards |
| `app/e/[eventSlug]/register/page.tsx` | Retrieves ref for registration |
| `app/api/events/by-slug/[slug]/register/route.ts` | Processes referral attribution |
| `app/api/referral/track-click/route.ts` | Records referral clicks |
| `app/api/referral/stats/route.ts` | Returns referral statistics |

## Migrations

- **052**: Added `referral_clicks` table and `referred_by_user_id` to registrations
- **053**: Added XP triggers for referral registrations
- **134**: Added performance indexes for referral queries
- **154**: Added promoter slugs and public profile fields
