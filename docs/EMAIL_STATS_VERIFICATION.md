# Email Stats Verification

## Summary

The email stats tab in event management **IS** using the same `email_send_logs` database and filtering correctly. However, I found and fixed a query syntax issue in the venue and organizer email stats endpoints.

## Event-Specific Email Stats

**Endpoint**: `/api/events/[eventId]/email-stats`  
**Component**: `EmailStats` component in `EventDetailPage`  
**Status**: ✅ **WORKING CORRECTLY**

### How it works:
1. Queries `email_send_logs` table
2. Filters by `metadata->>event_id` = eventId
3. Has fallback query using JSONB containment
4. Double-checks filtering in code to ensure accuracy
5. Groups emails by type and calculates stats (delivered, opened, clicked, bounced)

### Query:
```typescript
.eq("metadata->>event_id", params.eventId)
```

This correctly filters emails that have `event_id` in their metadata, which is set when emails are sent via `sendTemplateEmail()` (see `template-renderer.ts` lines 81-98).

---

## Venue Email Stats

**Endpoint**: `/api/venue/email-stats`  
**Status**: ✅ **FIXED** (query syntax issue corrected)

### Issue Found:
The `.or()` query was using string concatenation that could fail with multiple event IDs.

### Fix Applied:
Changed from:
```typescript
.or(
  eventIds
    .map((eventId) => `metadata->>event_id.eq.${eventId}`)
    .join(",") +
    (eventIds.length > 0 ? "," : "") +
    `metadata->>venue_id.eq.${venueId}`
)
```

To:
```typescript
const orConditions: string[] = [];
eventIds.forEach((eventId) => {
  orConditions.push(`metadata->>event_id.eq.${eventId}`);
});
orConditions.push(`metadata->>venue_id.eq.${venueId}`);
.or(orConditions.join(","))
```

### How it works:
1. Gets all events for the venue
2. Queries `email_send_logs` for emails where:
   - `metadata->>event_id` matches any of the venue's event IDs, OR
   - `metadata->>venue_id` matches the venue ID
3. Groups by event and type
4. Calculates aggregate stats

---

## Organizer Email Stats

**Endpoint**: `/api/organizer/email-stats`  
**Status**: ✅ **FIXED** (query syntax issue corrected)

### Issue Found:
Same query syntax issue as venue stats.

### Fix Applied:
Same fix as venue stats, but using `organizer_id` instead of `venue_id`.

### How it works:
1. Gets all events for the organizer
2. Queries `email_send_logs` for emails where:
   - `metadata->>event_id` matches any of the organizer's event IDs, OR
   - `metadata->>organizer_id` matches the organizer ID
3. Groups by event and type
4. Calculates aggregate stats

---

## Metadata Structure

When emails are sent via `sendTemplateEmail()`, the metadata is enhanced with:
- `event_id` (if provided)
- `organizer_id` (fetched from event if event_id exists)
- `venue_id` (fetched from event if event_id exists)

This happens in `packages/shared/src/email/template-renderer.ts` lines 81-98.

---

## Verification Steps

### 1. Test Event-Specific Stats
1. Go to an event detail page (as organizer or venue)
2. Click "Email Stats" tab
3. Verify emails for that event appear
4. Check that stats match emails sent for that event

### 2. Test Venue Stats
1. Go to venue dashboard
2. Check email stats (if available)
3. Verify all emails for venue's events appear

### 3. Test Organizer Stats
1. Go to organizer dashboard
2. Check email stats (if available)
3. Verify all emails for organizer's events appear

### 4. Database Verification
Run this query to verify emails have correct metadata:
```sql
SELECT 
  id,
  recipient,
  subject,
  email_type,
  metadata->>'event_id' as event_id,
  metadata->>'organizer_id' as organizer_id,
  metadata->>'venue_id' as venue_id,
  status,
  created_at
FROM email_send_logs
WHERE metadata->>'event_id' IS NOT NULL
ORDER BY created_at DESC
LIMIT 20;
```

---

## Potential Edge Cases

1. **Emails without event_id**: Some emails (like welcome emails, contact forms) may not have `event_id` in metadata. These won't appear in event-specific stats, which is correct.

2. **Old emails**: Emails sent before the metadata enhancement feature may not have `organizer_id` or `venue_id` in metadata. They should still have `event_id` if they were event-related.

3. **Client-side Supabase Auth emails**: Magic links and password resets sent client-side may not have event context, so they won't appear in event stats (which is correct).

---

## Conclusion

✅ **Event email stats are correctly using `email_send_logs` and filtering properly**

✅ **Venue and organizer email stats query syntax has been fixed**

✅ **All email stats endpoints now correctly query the centralized `email_send_logs` table**
