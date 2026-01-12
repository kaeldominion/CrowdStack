# Email Logging Audit & Testing Guide

## Overview
This document outlines all email sending mechanisms in the system and how to verify that **every single email** is logged to `email_send_logs`.

## Email Sending Mechanisms

### ✅ 1. Template Emails (via `sendTemplateEmail`)
**Status**: ✅ **LOGGED**
- **Function**: `packages/shared/src/email/template-renderer.ts::sendTemplateEmail()`
- **Logging**: Creates log entry BEFORE sending, updates after with Postmark message ID
- **Used by**:
  - Venue approval requests
  - Event approval results
  - Promoter assignments
  - Photo notifications
  - Bonus notifications
  - Payout notifications
  - Table booking emails
  - Welcome emails
  - All email templates in database

**Verification**: Check `email_send_logs` where `email_type = 'template'` and `template_id IS NOT NULL`

---

### ✅ 2. Direct Postmark Emails (via `sendEmail`)
**Status**: ✅ **LOGGED**
- **Function**: `packages/shared/src/email/postmark.ts::sendEmail()`
- **Logging**: Automatically logs unless `skipLogging: true` (only used by template-renderer)
- **Used by**:
  - Contact form emails (`sendContactFormEmail`)
  - Any direct email sends via Postmark API

**Verification**: Check `email_send_logs` where `email_type IN ('direct', 'contact_form', 'system')` and `postmark_message_id IS NOT NULL`

---

### ✅ 3. Supabase Auth Magic Links (Login/OTP)
**Status**: ✅ **LOGGED** (Server-side), ⚠️ **PARTIALLY LOGGED** (Client-side)
- **Function**: `supabase.auth.signInWithOtp()`
- **Current State**: 
  - `sendMagicLink()` wrapper logs ✅
  - `/api/auth/magic-link` route now logs ✅ (FIXED)
  - Client-side `signInWithOtp()` calls may not log ⚠️
- **Used by**:
  - Login page magic links (via `/api/auth/magic-link` - ✅ logged)
  - Photo gallery magic links (via `sendMagicLink` wrapper - ✅ logged)
  - Client-side direct calls (⚠️ may not log)

**Gap**: Client-side `signInWithOtp()` calls in:
  - `/app/login/page.tsx`
  - `/app/e/[eventSlug]/register/page.tsx`
  - `/app/join-table/[inviteToken]/page.tsx`

**Verification**: Check `email_send_logs` where `email_type = 'magic_link'` - server-side calls should be logged

---

### ✅ 4. Supabase Auth Password Reset
**Status**: ✅ **LOGGED** (Server-side), ⚠️ **PARTIALLY LOGGED** (Client-side)
- **Function**: `supabase.auth.resetPasswordForEmail()`
- **Current State**: 
  - `/api/auth/forgot-password` route now logs ✅ (FIXED)
  - Client-side `resetPasswordForEmail()` may not log ⚠️
- **Used by**: 
  - `/api/auth/forgot-password/route.ts` (✅ logged)
  - `/app/me/settings/page.tsx` (⚠️ client-side, may not log)

**Gap**: Client-side `resetPasswordForEmail()` call in `/app/me/settings/page.tsx`

**Verification**: Check `email_send_logs` where `email_type = 'system'` and `template_slug = 'password_reset'`

---

### ✅ 5. Audience Messages (Bulk Emails)
**Status**: ✅ **LOGGED**
- **Function**: Queued in `audience_messages` table, then sent via template system
- **Logging**: Logs queue event, then individual emails logged when sent
- **Used by**: Venue/Organizer bulk messaging

**Verification**: Check `email_send_logs` where `email_type = 'system'` and `metadata->>'message_id'` exists

---

## Testing Strategy

### 1. Manual Testing Checklist

#### Template Emails
- [ ] Send venue approval request email
- [ ] Send event approval email
- [ ] Send promoter assignment email
- [ ] Send photo notification email
- [ ] Send table booking confirmation email
- [ ] Send welcome email
- **Verify**: All appear in `/admin/communications` → Email Logs tab

#### Direct Postmark Emails
- [ ] Submit contact form
- **Verify**: Contact form email appears in logs

#### Magic Links
- [ ] Request magic link from login page
- [ ] Request magic link for photo gallery
- **Verify**: Photo gallery magic link appears (via `sendMagicLink` wrapper)
- **Gap**: Login page magic link may NOT appear

#### Password Reset
- [ ] Request password reset
- **Verify**: Currently NOT logged - this is a gap

---

### 2. Automated Testing Script

Create a test endpoint that:
1. Sends a test email via each mechanism
2. Verifies it appears in `email_send_logs` within 5 seconds
3. Reports any missing logs

---

### 3. Postmark Webhook Verification

**Postmark sends webhooks** for:
- Email sent
- Email opened
- Email clicked
- Email bounced

**Webhook Handler**: `/api/webhooks/postmark/route.ts`
- Updates `email_send_logs` with open/click/bounce data
- **Requires**: `postmark_message_id` in metadata to match

**Verification**: 
- Check Postmark dashboard for sent emails
- Compare count with `email_send_logs` where `status = 'sent'`
- Any discrepancy indicates unlogged emails

---

### 4. Supabase Auth Email Verification

**Challenge**: Supabase Auth emails (OTP, password reset) are sent by Supabase, not Postmark.

**Options**:
1. **Use Supabase Auth webhooks** (if available) to log emails
2. **Wrap all Supabase Auth calls** with logging
3. **Query Supabase Auth logs** (if accessible) and sync to `email_send_logs`

**Current State**: Only `sendMagicLink()` wrapper logs Supabase Auth emails

---

## Gaps Identified

### ❌ Gap 1: Login Page Magic Links
**File**: `apps/unified/src/app/api/auth/magic-link/route.ts`
**Issue**: Calls `signInWithOtp()` directly without logging
**Fix**: Add `logEmail()` call after successful `signInWithOtp()`

### ❌ Gap 2: Password Reset Emails
**File**: `apps/unified/src/app/api/auth/forgot-password/route.ts`
**Issue**: Calls `resetPasswordForEmail()` directly without logging
**Fix**: Add `logEmail()` call after successful `resetPasswordForEmail()`

### ⚠️ Gap 3: Other Direct Supabase Auth Calls
**Issue**: Any other direct `signInWithOtp()`, `resetPasswordForEmail()`, or `inviteUserByEmail()` calls may not be logged
**Fix**: Audit all Supabase Auth email calls and wrap with logging

---

## Recommended Fixes

1. ✅ **Add logging to `/api/auth/magic-link`** - **FIXED**
2. ✅ **Add logging to `/api/auth/forgot-password`** - **FIXED**
3. ⚠️ **Client-side Supabase Auth calls** - These are harder to log (client-side)
   - `/app/login/page.tsx` - Uses `signInWithOtp()` client-side
   - `/app/e/[eventSlug]/register/page.tsx` - Uses `signInWithOtp()` client-side
   - `/app/join-table/[inviteToken]/page.tsx` - Uses `signInWithOtp()` client-side
   - `/app/me/settings/page.tsx` - Uses `resetPasswordForEmail()` client-side
   - **Recommendation**: These should use API routes that log, or create a client-side logging wrapper
4. ✅ **Add automated tests** - Test endpoint created at `/api/test/email-logging-verification`
5. **Set up monitoring** to alert if Postmark email count > logged email count

---

## Verification Queries

### Count emails by type
```sql
SELECT 
  email_type,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE status = 'sent') as sent,
  COUNT(*) FILTER (WHERE status = 'failed') as failed,
  COUNT(*) FILTER (WHERE status = 'pending') as pending
FROM email_send_logs
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY email_type
ORDER BY total DESC;
```

### Compare Postmark vs Logged (requires Postmark API)
```sql
-- Get logged emails with Postmark message IDs
SELECT COUNT(*) 
FROM email_send_logs 
WHERE postmark_message_id IS NOT NULL 
  AND created_at > NOW() - INTERVAL '24 hours';

-- Compare with Postmark API: GET /messages/outbound
-- Any discrepancy indicates unlogged emails
```

### Find unlogged Supabase Auth emails
```sql
-- This is harder - Supabase Auth doesn't provide message IDs
-- We can only verify by checking if expected emails are missing
-- Compare expected email count (from user actions) vs logged count
```

---

## Monitoring & Alerts

1. **Daily Check**: Compare Postmark sent count vs `email_send_logs` count
2. **Alert**: If discrepancy > 5%, investigate
3. **Weekly Audit**: Manually test each email type and verify it appears in logs

---

## Next Steps

1. Fix identified gaps (magic-link and forgot-password logging)
2. Create automated test suite
3. Set up monitoring dashboard
4. Document all email sending entry points
