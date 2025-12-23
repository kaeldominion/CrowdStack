# CrowdStack Features

This document tracks all features implemented in the CrowdStack platform. Features are categorized and marked as **Free** or **Paid** tier subscriptions.

---

## User Registration & Authentication

### Progressive Signup Flow
- **Description**: Incremental profile data collection based on registration count
  - First registration: Email, First Name, Last Name, Gender, Instagram
  - Second registration: Instagram (if missing)
  - Third+ registration: WhatsApp (skippable)
- **Tier**: **Free**
- **Status**: ✅ Implemented

### Email Verification
- **Description**: Magic link and OTP-based email verification for secure authentication
- **Tier**: **Free**
- **Status**: ✅ Implemented

### Profile Management
- **Description**: User dashboard for managing profile, viewing event history, and upcoming events
- **Tier**: **Free**
- **Status**: ✅ Implemented

---

## Event Registration

### Event Registration System
- **Description**: Full event registration flow with Typeform-style multi-step form
- **Tier**: **Free**
- **Status**: ✅ Implemented

### Registration Success Page
- **Description**: Post-registration success page with QR pass, share functionality, and navigation options
  - "My Dashboard" navigation button
  - "Share with Friends & Get XP" button with referral tracking
  - "Back to Event" button
- **Tier**: **Free**
- **Status**: ✅ Implemented

### Deregistration / Remove Registration
- **Description**: Ability to remove event registrations
  - Attendees can deregister themselves from events
  - Organizers/Venues can remove attendee registrations
- **Tier**: **Free**
- **Status**: ✅ Implemented

### QR Pass Generation
- **Description**: Unique QR code passes for event entry
- **Tier**: **Free**
- **Status**: ✅ Implemented

---

## Referral & Sharing

### Referral Tracking System
- **Description**: Track referrals via `?ref=` parameter and sessionStorage
- **Tier**: **Free**
- **Status**: ✅ Implemented

### Share with Friends & Get XP
- **Description**: Social sharing functionality with referral links for earning XP
- **Tier**: **Free**
- **Status**: ✅ Implemented

### Universal Referral Tracking
- **Description**: Support for promoter referrals, user referrals, and attribution tracking
- **Tier**: **Free** (with potential paid analytics features)
- **Status**: ✅ Implemented

---

## Event Management

### Event Creation & Publishing
- **Description**: Create and publish events with details, venues, and scheduling
- **Tier**: **Paid** (Organizer/Venue subscription required)
- **Status**: ✅ Implemented

### Attendee Management
- **Description**: View and manage event attendees with filtering and search
  - View all registered attendees
  - Filter by check-in status, source, promoter
  - Remove attendee registrations
- **Tier**: **Paid** (Organizer/Venue subscription required)
- **Status**: ✅ Implemented

### Check-in System
- **Description**: QR code scanning and check-in functionality for door staff
- **Tier**: **Paid** (Venue/Organizer subscription required)
- **Status**: ✅ Implemented

### Event Analytics
- **Description**: Registration counts, check-in stats, referral source breakdown
- **Tier**: **Paid** (Organizer/Venue subscription required)
- **Status**: ✅ Implemented

---

## Venue & Organizer Features

### Venue Management
- **Description**: Venue profile management, event hosting, organizer partnerships
- **Tier**: **Paid** (Venue subscription required)
- **Status**: ✅ Implemented

### Organizer Management
- **Description**: Organizer profile, event creation, team management
- **Tier**: **Paid** (Organizer subscription required)
- **Status**: ✅ Implemented

### Venue-Organizer Partnerships
- **Description**: Partnership system with auto-approval and pre-approval features
- **Tier**: **Paid** (Venue/Organizer subscription required)
- **Status**: ✅ Implemented

### Attendee Detail Modal
- **Description**: Detailed attendee information view with event history and registration management
  - View attendee profile and contact information
  - View event history and check-in status
  - Remove registrations (Organizer/Venue only)
- **Tier**: **Paid** (Organizer/Venue subscription required)
- **Status**: ✅ Implemented

---

## Promoter Features

### Promoter Dashboard
- **Description**: View referred attendees and track referral performance
- **Tier**: **Free** (Promoter role)
- **Status**: ✅ Implemented

### Promoter Event Browsing
- **Description**: Browse and promote events for commission
- **Tier**: **Free** (Promoter role)
- **Status**: ✅ Implemented

---

## Admin Features

### Super Admin Dashboard
- **Description**: Platform-wide administration and management
- **Tier**: **Paid** (Admin access only)
- **Status**: ✅ Implemented

### User Role Management
- **Description**: Assign and manage user roles (admin, organizer, venue, promoter)
- **Tier**: **Paid** (Admin access only)
- **Status**: ✅ Implemented

### Attendee Import
- **Description**: CSV import functionality for bulk attendee management
- **Tier**: **Paid** (Admin/Organizer/Venue subscription required)
- **Status**: ✅ Implemented

---

## Platform Features

### Multi-tenancy Support
- **Description**: Support for multiple venues, organizers, and events
- **Tier**: **Free** (Infrastructure)
- **Status**: ✅ Implemented

### Role-Based Access Control (RBAC)
- **Description**: Granular permissions based on user roles
- **Tier**: **Free** (Infrastructure)
- **Status**: ✅ Implemented

### Responsive Design
- **Description**: Mobile-first responsive design for all features
- **Tier**: **Free**
- **Status**: ✅ Implemented

---

## Notes

- **Free Tier**: Features available to all users without subscription
- **Paid Tier**: Features requiring Organizer, Venue, or Admin subscription
- **Status**: ✅ Implemented | 🚧 In Progress | 📋 Planned

---

*Last Updated: 2025-01-27*

