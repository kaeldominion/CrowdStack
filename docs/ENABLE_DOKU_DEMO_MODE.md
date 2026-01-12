# Enable DOKU Demo Mode for Live Site

## Overview

DOKU demo mode simulates payment processing without making real API calls to DOKU. This is useful for:
- Testing payment flows without real credentials
- Demonstrations without processing actual payments
- Development/testing on production-like environments

## How to Enable

### Option 1: Via Vercel Dashboard (Recommended)

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your **production project** (`crowdstack-web` or the unified app project)
3. Navigate to **Settings** → **Environment Variables**
4. Click **Add New**
5. Add the following:
   - **Key**: `DOKU_DEMO_MODE`
   - **Value**: `true`
   - **Environment**: Select **Production** (and optionally Preview if you want it there too)
6. Click **Save**
7. **Redeploy** the application:
   - Go to **Deployments** tab
   - Click **"..."** on the latest deployment
   - Select **"Redeploy"**

### Option 2: Via Vercel CLI

```bash
# Set environment variable for production
vercel env add DOKU_DEMO_MODE production
# When prompted, enter: true

# Redeploy
vercel --prod
```

## What Happens in Demo Mode

When `DOKU_DEMO_MODE=true`:

1. **Checkout Creation**: 
   - Instead of calling DOKU API, returns a simulated response
   - Redirects users to `/demo/payment` page (simulated DOKU checkout)

2. **Payment Processing**:
   - Users can "complete" payment on the demo page
   - Simulates webhook call to `/api/demo/simulate-doku-webhook`
   - Updates booking/transaction status as if payment succeeded

3. **Test Connection**:
   - Always succeeds with message: "DEMO MODE: Connected to simulated DOKU..."
   - No real API calls made

## Important Notes

⚠️ **Warning**: When demo mode is enabled:
- **No real payments will be processed**
- All DOKU checkouts redirect to demo payment page
- Real DOKU credentials are ignored
- Webhooks are simulated, not real

✅ **Safe for Production**: Demo mode is safe to enable on live site for demonstrations, but:
- Users will see "DEMO MODE" banner on payment page
- No actual money will be processed
- All payments are simulated

## How to Disable

To disable demo mode and use real DOKU:

1. Go to Vercel Dashboard → Settings → Environment Variables
2. Find `DOKU_DEMO_MODE`
3. Either:
   - **Delete** the variable, OR
   - **Change value** to `false` or empty
4. **Redeploy** the application

## Verification

After enabling and redeploying:

1. Go to a venue's settings: `/app/venue/settings?venueId=XXX` → Finance tab
2. Click **"Test Connection"** for DOKU
3. Should see: "DEMO MODE: Connected to simulated DOKU..."
4. Create a table booking with deposit
5. Should redirect to `/demo/payment` instead of real DOKU checkout

## Current Status

To check if demo mode is currently enabled:
- Check Vercel Dashboard → Environment Variables for `DOKU_DEMO_MODE`
- Or test a payment flow - if it goes to `/demo/payment`, demo mode is active
