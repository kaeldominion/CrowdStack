# Local Development Routing Guide

## Unified Origin: Everything on `localhost:3006`

In local development, **all routes are accessed via `http://localhost:3006`**. The apps/app server runs on port 3007 internally but is proxied through port 3006.

## Available Routes

### Web App Routes (direct)
- `http://localhost:3006/` - Homepage
- `http://localhost:3006/login` - Login page
- `http://localhost:3006/me` - Attendee dashboard
- `http://localhost:3006/e/[eventSlug]` - Public event page

### B2B App Routes (proxied to apps/app)
- `http://localhost:3006/app` - Unified dashboard (for all B2B roles)
- `http://localhost:3006/app/venue` - Venue dashboard
- `http://localhost:3006/app/organizer` - Organizer dashboard
- `http://localhost:3006/app/promoter` - Promoter dashboard

### Admin Routes (proxied to apps/app)
- `http://localhost:3006/admin` - Admin dashboard (superadmin only)
- `http://localhost:3006/admin/venues` - Venue management
- `http://localhost:3006/admin/events` - Event management
- `http://localhost:3006/admin/users` - User management
- `http://localhost:3006/admin/promoters` - Promoter management
- `http://localhost:3006/admin/attendees` - Attendee management

### Door Scanner (proxied to apps/app)
- `http://localhost:3006/door` - Door scanner landing
- `http://localhost:3006/door/[eventId]` - Event-specific scanner

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

- **Login**: `http://localhost:3006/login`
- **Unified Dashboard**: `http://localhost:3006/app`
- **Admin Panel**: `http://localhost:3006/admin` (superadmin only)
- **Door Scanner**: `http://localhost:3006/door`
- **My Profile**: `http://localhost:3006/me`

## Important Notes

1. **Always use `localhost:3006`** - don't access port 3007 directly
2. **Routes are automatically proxied** - no need to worry about which app serves what
3. **Authentication is shared** - cookies work across all routes on 3006
4. **Production is different** - this unified origin is LOCAL DEV ONLY

