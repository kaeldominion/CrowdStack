# Attendee Data Access Model

## Philosophy

CrowdStack maintains a **global attendee identity** while enforcing strict access controls. Attendee data is valuable, and access is granted only via legitimate relationships. This protects both attendee privacy and CrowdStack's data moat.

**Core Principles:**
- No user may see attendee data outside their relationship scope
- Contact information is masked in API responses
- All messaging happens through CrowdStack (no raw exports)
- Defense-in-depth: RLS policies + server-side validation + API masking

---

## Access Rules

### Venue Access

A venue user may only access attendee records that are linked to:
- Events hosted at **that venue**
- Where the attendee registered and/or checked in

**Venue users must NOT see:**
- Attendees from other venues
- Attendee activity at other venues

**Implementation:**
- RLS Policy: `venue_attendee_access`
- Server-side: `getVenueAttendees()` filters by `venue_id` via `events.venue_id`
- API: `/api/venue/attendees`

---

### Organizer Access

An organizer user may only access attendee records that are linked to:
- Events created or managed by **that organizer**

**Organizer users must NOT see:**
- Attendees from other organizers' events
- Venue-wide history unless the event belongs to them

**Implementation:**
- RLS Policy: `organizer_attendee_access`
- Server-side: `getOrganizerAttendees()` filters by `organizer_id` via `events.organizer_id`
- API: `/api/organizer/attendees`

---

### Promoter Access

A promoter user may only access attendee records that are linked to:
- Registrations attributed to **that promoter** (via `referral_promoter_id`)

**Promoters must NOT see:**
- Other promoters' attendees
- Venue-wide or organizer-wide attendee lists
- All attendees from events they promote (only their referrals)

**Implementation:**
- RLS Policy: `promoter_referral_access` (stricter than before)
- Server-side: `getPromoterAttendees()` filters by `referral_promoter_id`
- API: `/api/promoter/attendees`

**Note:** This is stricter than the previous implementation. Promoters now see ONLY their direct referrals, not all event attendees.

---

### CrowdStack Internal Access

CrowdStack superadmin roles may access the full attendee graph.

**Implementation:**
- `user_is_superadmin()` function checks for `superadmin` role
- All RLS policies include superadmin bypass
- API: `/api/admin/attendees` (uses service role client)

---

## Attendee Identity

**Assumptions:**
- An attendee may exist without a login account (`user_id` is nullable)
- An attendee may later be linked to a user account
- Attendee identity is deduplicated best-effort (phone/email uniqueness), but not perfect
- No aggressive deduplication implemented yet (future work)

**Schema:**
```sql
CREATE TABLE attendees (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,  -- nullable, unique when not null
  phone TEXT NOT NULL,  -- unique
  user_id UUID REFERENCES auth.users(id),  -- nullable
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

---

## Contact Information Masking

To protect PII while preserving usability, contact details are masked in API responses:

**Email Masking:**
- Format: `j***@example.com`
- Shows first character + domain
- Example: `john.doe@example.com` → `j***@example.com`

**Phone Masking:**
- Format: `+1***1234`
- Shows last 4 digits only
- Example: `+15551234567` → `+1***4567`

**Implementation:**
- Utility functions: `maskEmail()`, `maskPhone()` in `lib/data/mask-pii.ts`
- Applied in all audience query functions before returning data

**Note:** Full contact details are never exposed via API. Server-side code uses service role client internally, but masks before returning to client.

---

## Messaging System

Messaging must be done through CrowdStack, not via raw exports.

**Requirements:**
- Messages are scoped to a specific audience (venue/event/organizer/promoter)
- Messages are queued server-side
- All messages are logged
- Rate limiting and abuse protection possible later

**MVP Constraints:**
- Email only (WhatsApp later)
- No bulk export of attendee data
- No direct access to raw email/phone lists

**Schema:**
```sql
CREATE TABLE audience_messages (
  id UUID PRIMARY KEY,
  sender_id UUID NOT NULL,
  audience_type TEXT CHECK (IN ('venue', 'organizer', 'promoter', 'event')),
  audience_id UUID NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  recipient_count INTEGER NOT NULL,
  status TEXT CHECK (IN ('queued', 'processing', 'sent', 'failed')),
  sent_at TIMESTAMP,
  created_at TIMESTAMP
);
```

**API:**
- `POST /api/audience/message` - Queue a message to an audience
- `GET /api/audience/message` - List messages sent by current user

**Validation:**
1. User must have access to the specified audience
2. Recipient count is calculated server-side
3. Message is queued (not sent immediately)
4. Logged to both `audience_messages` and `message_logs`

---

## Not Implemented (Yet)

**Explicitly DO NOT implement:**
- CSV or raw data export
- Cross-venue attendee sharing
- Attendee "marketplace"
- Global marketing blasts
- Advanced consent management
- WhatsApp messaging (email only for MVP)
- Aggressive deduplication across venues

If an export button exists in UI, it should be disabled with a placeholder.

---

## Technical Implementation

### Defense-in-Depth Layers

1. **Database Layer (RLS Policies)**
   - Migration: `020_attendee_access_policies.sql`
   - Separate policies for venue, organizer, promoter access
   - Superadmin bypass included
   - Policies on `attendees`, `registrations`, and `checkins` tables

2. **Server-Side Query Scoping**
   - Data functions: `getVenueAttendees()`, `getOrganizerAttendees()`, `getPromoterAttendees()`
   - Uses service role client internally (bypasses RLS for performance)
   - But scopes queries correctly based on user's entity relationships
   - Validates access before querying

3. **API Response Masking**
   - All contact information masked before returning to client
   - Applied in data layer functions
   - Prevents PII leakage even if other controls fail

### Access Validation Flow

```
User Request → API Route → Validate User Role → Get User Entity ID
    ↓
Check Access to Audience → Server-side Query (Scoped)
    ↓
Apply Masking → Return Response
```

### Files Modified/Created

**Migrations:**
- `supabase/migrations/020_attendee_access_policies.sql` - RLS policy updates
- `supabase/migrations/021_audience_messaging.sql` - Messaging queue table

**Data Layer:**
- `apps/unified/src/lib/data/mask-pii.ts` - Masking utilities (NEW)
- `apps/unified/src/lib/data/attendees-venue.ts` - Added masking
- `apps/unified/src/lib/data/attendees-organizer.ts` - Added masking
- `apps/unified/src/lib/data/attendees-promoter.ts` - Added masking

**API:**
- `apps/unified/src/app/api/audience/message/route.ts` - Messaging API (NEW)

**UI:**
- `apps/unified/src/app/app/venue/attendees/page.tsx` - Disabled export, added explanation
- `apps/unified/src/app/app/organizer/attendees/page.tsx` - Disabled export, added explanation
- `apps/unified/src/app/app/promoter/attendees/page.tsx` - Disabled export, added explanation

**Types:**
- `packages/shared/src/types/index.ts` - Added `AudienceMessage` type

---

## Future Roadmap

**Planned (Not MVP):**
- WhatsApp messaging integration
- Advanced consent management (opt-in/opt-out per communication type)
- Rate limiting on messaging (per sender, per audience)
- Message templates
- A/B testing for messages
- Analytics on message engagement

**Under Consideration:**
- Aggressive deduplication across venues (with user consent)
- Attendee data portability (GDPR compliance)
- Cross-venue insights (aggregated, anonymized)

---

## Quality Bar

This system must:
- ✅ Prevent competitor data leakage
- ✅ Feel fair to venues, organizers, and promoters
- ✅ Preserve CrowdStack's long-term data moat
- ✅ Be extensible without rewrites

**Least Privilege Principle:**
When in doubt, prefer least privilege and document the decision. All access is granted explicitly via relationships, never by default.

---

## Questions or Issues

If you encounter ambiguity in access rules:
1. Prefer least privilege
2. Document the decision
3. Add a comment explaining the reasoning
4. Update this document if the decision affects the model

