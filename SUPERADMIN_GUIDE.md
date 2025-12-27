# Superadmin Guide - What You Can Access

## Overview

As a **superadmin**, you have access to everything in the system. Here's what's available:

## Your Dashboards

### 1. **Admin Panel** (`/admin`)
- **URL**: `http://localhost:3006/admin`
- **Purpose**: Manage the entire platform
- **Features**:
  - User management
  - Venue management
  - Event management
  - Promoter management
  - Attendee management
  - System-wide settings

### 2. **Unified Dashboard** (`/app`)
- **URL**: `http://localhost:3006/app`
- **Purpose**: Role-aware dashboard for B2B users
- **Features**: 
  - See the unified dashboard interface
  - Access all B2B features
  - Quick link to Admin Panel

## What's Built

### 1. **Unified App Shell** (`/app/*`)
- Single layout for all B2B roles
- Role-aware navigation (shows/hides items based on role)
- Works for: Venue Admin, Organizer, Promoter, Superadmin

### 2. **Admin Panel** (`/admin/*`)
- Separate admin interface
- Only accessible to superadmin
- Full system management

### 3. **Individual Role Dashboards**
- `/app/venue` - Venue management
- `/app/organizer` - Event management
- `/app/promoter` - Promoter tools
- `/admin` - System admin

## Common Issues

### "Can't access /app"
- **Fix**: Make sure you're logged in as superadmin
- The `/app` route allows superadmin access

## Quick Navigation

| What You Want | URL |
|--------------|-----|
| Admin Panel | `/admin` |
| Unified Dashboard | `/app` |

## Architecture Summary

```
Superadmin User
├── Admin Panel (/admin) - Full system management
└── Unified Dashboard (/app)
    ├── Dashboard overview
    └── Link to Admin Panel for management
```

## Testing

To test as a specific venue/organizer/promoter, create a test user with those roles and log in as that user.
