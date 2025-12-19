# Local Development Routing Guide

## Unified App: Everything on `localhost:3000`

In local development, **all routes are accessed via `http://localhost:3000`**. The unified app (`apps/unified`) serves all routes from a single Next.js application - no proxying needed.

## Available Routes

### Public Routes
- `http://localhost:3000/` - Homepage
- `http://localhost:3000/login` - Login page
- `http://localhost:3000/pricing` - Pricing page
- `http://localhost:3000/contact` - Contact page
- `http://localhost:3000/e/[eventSlug]` - Public event page
- `http://localhost:3000/me` - Attendee dashboard

### B2B App Routes
- `http://localhost:3000/app` - Unified dashboard (for all B2B roles)
- `http://localhost:3000/app/venue` - Venue dashboard
- `http://localhost:3000/app/organizer` - Organizer dashboard
- `http://localhost:3000/app/promoter` - Promoter dashboard

### Admin Routes
- `http://localhost:3000/admin` - Admin dashboard (superadmin only)
- `http://localhost:3000/admin/venues` - Venue management
- `http://localhost:3000/admin/events` - Event management
- `http://localhost:3000/admin/users` - User management
- `http://localhost:3000/admin/promoters` - Promoter management
- `http://localhost:3000/admin/attendees` - Attendee management

### Door Scanner
- `http://localhost:3000/door` - Door scanner landing
- `http://localhost:3000/door/[eventId]` - Event-specific scanner

## Role-Based Access

### Superadmin
- Can access both `/app` (unified dashboard) and `/admin` (admin panel)
- Has access to all features

### Venue Admin
- Access: `/app/venue/*`
- Can create events, manage attendees, view reports

### Event Organizer
- Access: `/app/organizer/*`
- Can create events, manage promoters, view analytics

### Promoter
- Access: `/app/promoter/*`
- Can view assigned events, earnings, generate QR codes

### Door Staff
- Access: `/door/*`
- Can scan QR codes and check-in attendees

### Attendee
- Access: `/me`
- Can view their events, XP points, profile

## Quick Links

- **Login**: `http://localhost:3000/login`
- **Unified Dashboard**: `http://localhost:3000/app`
- **Admin Panel**: `http://localhost:3000/admin` (superadmin only)
- **Door Scanner**: `http://localhost:3000/door`
- **My Profile**: `http://localhost:3000/me`

## Important Notes

1. **Single unified app** - All routes served from `apps/unified` on port 3000
2. **No proxying needed** - Everything runs on the same origin
3. **Authentication is unified** - Cookies work automatically across all routes
4. **Production**: Same unified app runs on `crowdstack.app` (single domain)

