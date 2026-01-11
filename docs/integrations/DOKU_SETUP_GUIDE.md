# DOKU Payment Integration Guide

## Overview

CrowdStack integrates with DOKU, Indonesia's leading payment gateway, to enable direct payments for table bookings (and future ticket sales). This integration allows money to flow directly from customers to venue bank accounts - CrowdStack does not handle or hold any funds.

## How It Works

```
Customer → Books Table → Pays via DOKU → Money goes to Venue's Bank Account
                              ↑
                    (Using venue's own DOKU merchant account)
```

**Key Point:** Each venue needs their own DOKU merchant account. CrowdStack facilitates the payment process but does not touch the money.

---

## Client Onboarding Checklist

### Step 1: Venue Creates DOKU Merchant Account

1. Visit [doku.com](https://www.doku.com) and sign up for a merchant account
2. Complete DOKU's verification process (typically requires):
   - Business registration documents (SIUP/NIB)
   - Bank account details for settlement
   - Identity verification
3. Once approved, access the DOKU Back Office dashboard

### Step 2: Obtain API Credentials

From the DOKU Back Office dashboard:

1. Navigate to **Settings** > **API Credentials**
2. Copy the following:
   - **Client ID** (format: `BRN-xxxx-xxxxxxxxxx` or `MCH-xxxx-xxxxxxxxxx`)
   - **Secret Key** (format: `SK_xxxxxxxxxxxxxxxxxx`)
3. Note which environment you're using:
   - **Sandbox** - For testing (fake payments)
   - **Production** - For real payments

### Step 3: Configure Payment Settings in CrowdStack

1. Log in to CrowdStack as a venue admin
2. Go to **Settings** > **Payments**
3. In the DOKU Payment Gateway section:
   - Toggle **Enable** to ON
   - Enter your **Client ID**
   - Enter your **Secret Key**
   - Select **Environment** (start with Sandbox for testing)
4. Click **Test Connection** to verify credentials
5. Click **Save Settings**

### Step 4: Configure Webhook in DOKU (Important!)

For CrowdStack to receive payment confirmations, you must configure the notification URL in DOKU:

1. In DOKU Back Office, go to **Settings** > **Notification**
2. Set the **HTTP Notification URL** to:
   ```
   https://your-crowdstack-domain.com/api/webhooks/doku
   ```
3. Enable HTTP notifications

### Step 5: Test the Integration (Sandbox)

1. Keep DOKU environment set to **Sandbox**
2. Create a test table booking that requires a deposit
3. Use DOKU's payment simulator to test payments:
   - Simulator URL: https://sandbox.doku.com/integration/simulator/
4. Verify the payment status updates in CrowdStack

### Step 6: Go Live (Production)

1. Update DOKU environment to **Production** in CrowdStack settings
2. Update your DOKU Client ID and Secret Key to production credentials
3. Test with a small real payment
4. You're live!

---

## Payment Settings Explained

| Setting | Description | Default |
|---------|-------------|---------|
| **DOKU Enabled** | Master switch for DOKU payments | Off |
| **Client ID** | Your DOKU merchant identifier | - |
| **Secret Key** | Your DOKU API secret (stored securely) | - |
| **Environment** | Sandbox (testing) or Production (live) | Sandbox |
| **Auto-confirm on payment** | Automatically confirm bookings when paid | On |
| **Payment expires after** | Hours until payment link expires | 24 hours |
| **Manual Payment Fallback** | Show bank transfer instructions if DOKU unavailable | On |

---

## Supported Payment Methods

When DOKU is enabled, customers can pay using (availability depends on your DOKU merchant configuration):

- **Bank Transfer** (Virtual Account)
  - BCA, Mandiri, BNI, BRI, Permata, CIMB, Danamon
- **E-Wallets**
  - OVO, GoPay, ShopeePay, Dana, LinkAja
- **QRIS** (QR Code payments)
- **Credit/Debit Cards**
  - Visa, Mastercard (if enabled)
- **Convenience Store**
  - Alfamart, Indomaret

---

## Currency

- All payments are processed in **Indonesian Rupiah (IDR)**
- Deposit amounts should be set in IDR on table configurations

---

## Troubleshooting

### "Connection test failed"
- Verify Client ID and Secret Key are correct
- Check you're using the right environment (sandbox credentials won't work in production)
- Ensure your DOKU merchant account is active

### Payments not confirming automatically
- Verify webhook URL is configured in DOKU Back Office
- Check the webhook endpoint is accessible (not blocked by firewall)
- Review payment_transactions table for webhook_payload data

### Customer can't complete payment
- Check if the payment link has expired
- Verify the payment amount is valid (minimum amounts apply per payment method)
- Some payment methods have maximum transaction limits

---

## Technical Details

### Database Tables

- `venue_payment_settings` - Stores DOKU credentials per venue
- `payment_transactions` - Tracks all payment attempts and statuses

### API Endpoints

- `GET /api/venue/settings/payments` - Get venue payment settings
- `PUT /api/venue/settings/payments` - Update settings
- `POST /api/venue/settings/payments/test` - Test DOKU connection
- `POST /api/webhooks/doku` - Receive DOKU notifications (planned)

### Security

- Secret keys are stored in the database and masked in API responses
- HMAC-SHA256 signatures verify all API requests
- Webhook signatures verified to prevent spoofing
- Row-Level Security ensures venues can only access their own data

---

## Support

For DOKU account issues:
- DOKU Support: support@doku.com
- DOKU Documentation: https://dashboard.doku.com/docs

For CrowdStack integration issues:
- Contact CrowdStack support
