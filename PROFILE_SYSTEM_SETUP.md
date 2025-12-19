# Profile System Setup

## Overview
Complete user profile system with avatar upload, social links, and beautiful Typeform-style signup flow.

## Database Migration

Run the migration to add profile fields:
```bash
supabase db push
# Or manually run: supabase/migrations/027_attendee_profile_fields.sql
```

This adds the following fields to the `attendees` table:
- `surname` - Last name
- `date_of_birth` - Date of birth
- `avatar_url` - Profile picture URL
- `bio` - Personal bio
- `instagram_handle` - Instagram username (without @)
- `tiktok_handle` - TikTok username (without @)
- `whatsapp` - WhatsApp phone number (preparing for WhatsApp-first platform)

## Supabase Storage Setup

**IMPORTANT**: Create the `avatars` storage bucket in Supabase:

1. Go to Supabase Dashboard → Storage
2. Create a new bucket named `avatars`
3. Make it **public** (so avatar images can be accessed)
4. Set policies to allow:
   - Authenticated users can upload
   - Public can read

## Features Implemented

### 1. Typeform-Style Signup Form
- Location: `apps/unified/src/components/TypeformSignup.tsx`
- Multi-step form with smooth animations
- Collects: name, surname, DOB, WhatsApp, Instagram
- Email comes from magic link authentication

### 2. Registration Flow
- QR code scan → Magic link login → Typeform signup → Registration
- QR codes include referral tracking (`ref` parameter)
- Venue QR codes default to venue ownership attribution

### 3. Avatar Upload
- API Route: `/api/profile/avatar` (POST & DELETE)
- Component: `apps/unified/src/components/AvatarUpload.tsx`
- Supports: JPEG, PNG, WebP (max 5MB)
- Automatically deletes old avatar when new one is uploaded
- Updates both `attendees` table and user metadata

### 4. Profile Page
- Location: `apps/unified/src/app/me/profile/page.tsx`
- API Route: `/api/profile` (GET & PATCH)
- Allows users to edit all profile fields
- Includes avatar upload component
- Real-time validation and error handling

## API Endpoints

### GET `/api/profile`
Get current user's profile data

### PATCH `/api/profile`
Update profile fields:
```json
{
  "name": "John",
  "surname": "Doe",
  "date_of_birth": "1990-01-01",
  "bio": "About me...",
  "whatsapp": "+1234567890",
  "instagram_handle": "johndoe",
  "tiktok_handle": "johndoe"
}
```

### POST `/api/profile/avatar`
Upload avatar image (FormData with `file` field)

### DELETE `/api/profile/avatar`
Delete current avatar

## Usage Flow

### New User Registration
1. User scans QR code from event/door scanner
2. Redirected to `/e/[eventSlug]/register?ref=...`
3. Enters email for magic link
4. Clicks magic link in email
5. Completes Typeform-style signup form
6. Profile created and registration completed

### Existing User Profile Management
1. Navigate to `/me/profile`
2. Upload/change avatar
3. Edit profile fields
4. Save changes

## Future Enhancements (WhatsApp-First Platform)
- Migration from email magic links to WhatsApp authentication
- WhatsApp message sending for event updates
- WhatsApp as primary contact method
- Profile fields already prepared for this transition

