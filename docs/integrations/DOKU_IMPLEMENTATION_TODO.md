# DOKU Implementation - Technical TODO

## Current Status: Core Integration Complete

### What's Built
- [x] Database schema (`venue_payment_settings`, `payment_transactions`)
- [x] Settings API (GET/PUT)
- [x] Admin UI component for configuration
- [x] Test connection endpoint (real DOKU API calls in sandbox)
- [x] Manual payment fallback option
- [x] DOKU Service Layer (`lib/services/doku.ts`)
  - [x] HMAC-SHA256 signature generation
  - [x] Checkout session creation
  - [x] Webhook signature verification
- [x] Payment checkout endpoint (`/api/payments/checkout`)
- [x] Webhook endpoint (`/api/webhooks/doku`)
- [x] Booking status API (`/api/booking/[id]`)
- [x] Guest payment pages:
  - [x] Booking status page (`/booking/[id]`)
  - [x] Payment complete page (`/booking/[id]/payment-complete`)
  - [x] Payment cancelled page (`/booking/[id]/payment-cancelled`)

### What's Remaining (Optional Enhancements)

---

## Phase 2: Core DOKU API Integration

### Task 2.1: Create DOKU Service Layer

**File:** `apps/unified/src/lib/services/doku.ts`

```typescript
// Service needed to handle:
// 1. HMAC-SHA256 signature generation
// 2. API request formatting
// 3. Checkout session creation
// 4. Webhook signature validation
```

**Signature Generation Formula:**
```
Digest = Base64(SHA256(requestBody))
SignatureComponent =
  "Client-Id:" + clientId + "\n" +
  "Request-Id:" + requestId + "\n" +
  "Request-Timestamp:" + timestamp + "\n" +
  "Request-Target:" + "/checkout/v1/payment" + "\n" +
  "Digest:" + digest

Signature = Base64(HMAC-SHA256(SignatureComponent, secretKey))
```

### Task 2.2: Update Test Connection

**File:** `apps/unified/src/app/api/venue/settings/payments/test/route.ts`

Replace the mock with actual DOKU API health check call.

### Task 2.3: Create Checkout Endpoint

**File:** `apps/unified/src/app/api/payments/create-checkout/route.ts`

```typescript
// POST /api/payments/create-checkout
// Body: { booking_id: UUID }
//
// 1. Fetch booking details
// 2. Get venue payment settings (with credentials)
// 3. Call DOKU API to create checkout
// 4. Store payment_transaction record
// 5. Return payment URL
```

**DOKU Request Format:**
```json
{
  "order": {
    "amount": 5000000,
    "invoice_number": "INV-BOOKING-{uuid}",
    "callback_url": "https://crowdstack.com/booking/{id}/payment-complete",
    "callback_url_cancel": "https://crowdstack.com/booking/{id}/payment-cancelled"
  },
  "payment": {
    "payment_due_date": 1440
  },
  "customer": {
    "name": "Guest Name",
    "email": "guest@email.com",
    "phone": "+628123456789"
  }
}
```

---

## Phase 3: Webhook Handler

### Task 3.1: Create Webhook Endpoint

**File:** `apps/unified/src/app/api/webhooks/doku/route.ts`

```typescript
// POST /api/webhooks/doku
//
// 1. Verify signature from DOKU
// 2. Parse notification payload
// 3. Find matching payment_transaction by invoice_id
// 4. Update transaction status
// 5. If successful and auto_confirm enabled:
//    - Update table_booking.payment_status = 'paid'
//    - Update table_booking.status = 'confirmed' (if auto_confirm)
//    - Send confirmation email
// 6. Return 200 OK to DOKU
```

**Important:** Per DOKU docs, ignore `transaction.status = 'FAILED'` and implement our own expiry logic based on `payment.expired_date`.

### Task 3.2: Handle Payment Statuses

Map DOKU statuses to CrowdStack:
- `SUCCESS` → `completed`
- `PENDING` → `processing`
- `EXPIRED` → `expired`
- Ignore `FAILED` (use our own expiry)

---

## Phase 4: Table Booking Integration

### Task 4.1: Modify Booking Creation Flow

**File:** `apps/unified/src/app/api/events/[eventId]/tables/book/route.ts`

After creating booking:
1. Check if venue has DOKU enabled
2. If deposit_required > 0 and DOKU enabled:
   - Create payment_transaction (pending)
   - Call DOKU to get payment URL
   - Update transaction with DOKU response
   - Set booking.payment_status = 'pending'
3. Include payment URL in confirmation email

### Task 4.2: Update Email Templates

Add payment link to `table_booking_request` email template when DOKU payment is pending.

---

## Phase 5: Guest Experience

### Task 5.1: Payment Status Page

**File:** `apps/unified/src/app/booking/[id]/payment/page.tsx`

- Show payment status
- If pending, show payment link/button
- If expired, show retry option
- If paid, show confirmation

### Task 5.2: Callback Pages

**Files:**
- `apps/unified/src/app/booking/[id]/payment-complete/page.tsx`
- `apps/unified/src/app/booking/[id]/payment-cancelled/page.tsx`

Handle return from DOKU payment page.

---

## Phase 6: Admin Features

### Task 6.1: Payment Transactions View

Admin page to view all payment transactions for a venue:
- Status, amount, date
- Link to DOKU invoice
- Retry/cancel options

### Task 6.2: Manual Payment Recording

Allow venue admin to manually mark a booking as paid (for bank transfers verified outside DOKU).

---

## Testing Checklist

### Sandbox Testing
- [ ] Create checkout session successfully
- [ ] Receive webhook for successful payment
- [ ] Auto-confirm booking on payment
- [ ] Handle expired payments
- [ ] Handle cancelled payments

### Payment Methods to Test
- [ ] Virtual Account (Bank Transfer)
- [ ] E-Wallet (OVO, GoPay)
- [ ] QRIS

### Edge Cases
- [ ] Double webhook delivery (idempotency)
- [ ] Payment after booking cancelled
- [ ] Multiple payment attempts for same booking
- [ ] Webhook timeout handling

---

## Environment Variables (Optional)

If we want global DOKU settings (e.g., for platform fees later):

```env
# Not needed currently - credentials are per-venue in database
# DOKU_WEBHOOK_SECRET=xxx  # For additional webhook verification
```

---

## API Reference

### DOKU Endpoints

| Environment | Base URL |
|-------------|----------|
| Sandbox | `https://api-sandbox.doku.com` |
| Production | `https://api.doku.com` |

### Key Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/checkout/v1/payment` | Create checkout session |

### Response Example

```json
{
  "message": [
    "SUCCESS"
  ],
  "response": {
    "order": {
      "invoice_number": "INV-BOOKING-xxx",
      "amount": 5000000
    },
    "payment": {
      "url": "https://sandbox.doku.com/checkout/link/xxx",
      "token_id": "xxx",
      "expired_date": "2024-01-15T12:00:00Z"
    }
  }
}
```

---

## File Locations Reference

| Purpose | Path |
|---------|------|
| DB Schema | `supabase/migrations/159_payment_integration.sql` |
| DOKU Service | `apps/unified/src/lib/services/doku.ts` |
| Settings API | `apps/unified/src/app/api/venue/settings/payments/route.ts` |
| Test API | `apps/unified/src/app/api/venue/settings/payments/test/route.ts` |
| Checkout API | `apps/unified/src/app/api/payments/checkout/route.ts` |
| Webhook Handler | `apps/unified/src/app/api/webhooks/doku/route.ts` |
| Booking Status API | `apps/unified/src/app/api/booking/[id]/route.ts` |
| UI Component | `apps/unified/src/components/VenuePaymentSettings.tsx` |
| Booking Page | `apps/unified/src/app/booking/[id]/page.tsx` |
| Payment Complete | `apps/unified/src/app/booking/[id]/payment-complete/page.tsx` |
| Payment Cancelled | `apps/unified/src/app/booking/[id]/payment-cancelled/page.tsx` |
| Booking API | `apps/unified/src/app/api/events/[eventId]/tables/book/route.ts` |
