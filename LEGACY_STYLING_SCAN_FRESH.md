# Legacy Styling Usage Scan Report (Fresh Scan)

Generated: Current state after initial globals.css change

## Summary

- **bg-background**: 63 occurrences across 34 files
- **bg-surface**: 47 occurrences across 25 files  
- **text-foreground**: 874 occurrences across 78 files
- **CSS variables (--background, --foreground, --surface)**: 0 occurrences ✅
- **Tailwind primary.DEFAULT/primary.hover**: 0 occurrences ✅
- **Surface variants** (elevated/secondary/hover): 22 occurrences across 7 files

---

## 1. bg-background Pattern (63 occurrences)

### apps/unified/src/components/MobileScrollExperience.tsx
- Line 281: `bg-background` (fixed inset container)

### apps/unified/src/components/AppLayout.tsx
- Line 55: `bg-background` (min-h-screen)

### apps/unified/src/app/v/[venueSlug]/page.tsx
- Line 180: `bg-background` (min-h-screen)

### apps/unified/src/app/app/venue/settings/page.tsx
- Line 942: `bg-background` (scrollable container)
- Line 630: `bg-surface-secondary` (variant)
- Line 771: `bg-surface` (variant)

### apps/unified/src/app/app/organizer/events/[eventId]/photos/page.tsx
- Line 227: `bg-background` (min-h-screen)

### apps/unified/src/app/i/[code]/page.tsx
- Lines 71, 79, 92: `bg-background` (min-h-screen, multiple instances)

### apps/unified/src/components/EventDetailPage.tsx
- Line 1145: `bg-background-secondary` (tooltip)
- Line 1322: `bg-background/60` (with opacity)
- Line 1417: `bg-background/60` (with opacity)
- Line 1540: `bg-background` (border container)
- Line 1607: `bg-background` (border container)
- Line 1632: `bg-background/60` (with opacity)
- Line 1666: `bg-background/60` (with opacity)
- Line 1976: `bg-background` (rounded container)
- Line 2130: `bg-background/60` (with opacity)
- Line 2139: `bg-background` (aspect container)
- Line 2275: `bg-background-secondary` (aspect square)
- Line 2344: `bg-background/60` (with opacity)
- Line 3049: `bg-background` (border rounded container)

### apps/unified/src/app/app/venue/events/new/page.tsx
- Line 288: `bg-background` (input border)

### apps/unified/src/app/app/organizer/events/new/page.tsx
- Lines 299, 327, 444: `bg-background` (input borders, multiple instances)

### apps/unified/src/app/admin/venues/page.tsx
- Line 99: `bg-background` (min-h-screen)

### apps/unified/src/app/app/venue/users/page.tsx
- Line 200: `bg-background` (min-h-screen)

### apps/unified/src/app/app/organizer/settings/page.tsx
- Line 530: `bg-background-secondary` (variant)

### apps/unified/src/app/invite/[token]/page.tsx
- Line 82: `bg-background` (min-h-screen)

### apps/unified/src/app/admin/tools/xp-ledger/page.tsx
- Line 134: `bg-background` (min-h-screen)

### apps/unified/src/components/MobileFlierExperience.tsx
- Line 301: `bg-background/80` (with opacity and backdrop-blur)

### apps/unified/src/components/UserAssignmentModal.tsx
- Line 176: `hover:bg-background` (hover state)

### apps/unified/src/components/PromoterManagementModal.tsx
- Line 319: `bg-background` (input border)
- Line 373: `hover:bg-background-secondary` (hover variant)

### apps/unified/src/components/ImprovedEntitySwitcher.tsx
- Line 333: `hover:bg-background` (hover state)

### apps/unified/src/components/EntitySwitcher.tsx
- Line 235: `bg-background` (input border)
- Line 253: `hover:bg-background` (hover state)

### apps/unified/src/app/not-found.tsx
- Line 8: `bg-background` (min-h-screen)

### apps/unified/src/app/error.tsx
- Line 19: `bg-background` (min-h-screen)

### apps/unified/src/app/admin/promoters/page.tsx
- Line 200: `bg-background` (min-h-screen)

### apps/unified/src/app/admin/events/page.tsx
- Line 140: `bg-background` (min-h-screen)
- Line 172: `bg-background` (input border)

### apps/unified/src/components/PromoterProfileModal.tsx
- Lines 118, 125, 134, 143, 157: `bg-background-secondary` (multiple containers)

### apps/unified/src/components/OrganizerProfileModal.tsx
- Lines 160, 167, 176: `bg-background-secondary` (containers)
- Line 205: `bg-background-secondary` and `hover:bg-background-tertiary` (button states)
- Line 223: `bg-background-secondary` and `hover:bg-background-tertiary` (button)

### apps/unified/src/components/NotificationBell.tsx
- Line 162: `bg-background/50` (with opacity)
- Line 186: `hover:bg-background` (hover state)

### apps/unified/src/components/AddPromoterModal.tsx
- Line 164: `hover:bg-background-secondary` (hover variant)
- Line 213: `bg-background-secondary` (border container)

### apps/unified/src/app/app/venue/promoters/page.tsx
- Line 99: `bg-background` (min-h-screen)

### apps/unified/src/app/app/venue/organizers/page.tsx
- Line 115: `bg-background` (min-h-screen)

### apps/unified/src/app/app/organizer/promoters/page.tsx
- Line 103: `bg-background` (min-h-screen)
- Line 246: `bg-background-secondary` (container)

### apps/unified/src/app/admin/users/page.tsx
- Line 74: `bg-background` (min-h-screen)

### apps/unified/src/app/admin/organizers/page.tsx
- Line 75: `bg-background` (min-h-screen)

### apps/unified/src/app/admin/attendees/page.tsx
- Line 89: `bg-background` (min-h-screen)

**Variants found:**
- `bg-background` (base)
- `bg-background/50`, `bg-background/60`, `bg-background/80` (with opacity)
- `bg-background-secondary` (variant)
- `bg-background-tertiary` (variant in hover states)
- `hover:bg-background` (hover state)

---

## 2. bg-surface Pattern (47 occurrences)

### apps/unified/src/app/e/[eventSlug]/EventPageContent.tsx
- Line 310: `bg-surface` (progress bar)

### apps/unified/src/app/app/venue/settings/page.tsx
- Line 630: `bg-surface-secondary` (variant)
- Line 771: `bg-surface` (tag button)

### apps/unified/src/app/app/organizer/live/[eventId]/page.tsx
- Line 724: `bg-surface` (table row)

### apps/unified/src/components/ShareButton.tsx
- Line 282: `bg-surface` (button)

### apps/unified/src/app/app/organizer/events/[eventId]/photos/page.tsx
- Line 294: `bg-surface` (photo container)
- Line 421: `bg-surface` (input)

### apps/unified/src/components/PhotoUploader.tsx
- Line 219: `bg-surface` (photo container)

### apps/unified/src/components/EventImageUpload.tsx
- Line 138: `bg-surface` (image container)

### apps/unified/src/components/EventDetailPage.tsx
- Line 3085: `bg-surface` (info box)

### apps/unified/src/components/venue/MapPreview.tsx
- Lines 94, 110: `bg-surface` (map placeholders)

### apps/unified/src/components/AttendeeDetailModal.tsx
- Line 223: `bg-surface/50` (with opacity)

### apps/unified/src/components/DoorStaffModal.tsx
- Lines 289, 313, 355, 389, 489, 543, 561: `bg-surface-secondary` (multiple containers)

### apps/unified/src/app/app/organizer/events/page.tsx
- Line 220: `hover:bg-surface-elevated` (hover variant)

### apps/unified/src/components/PermanentDoorStaffSection.tsx
- Lines 241, 326, 327: `bg-surface-secondary` (containers)

### apps/unified/src/app/admin/tools/xp-ledger/page.tsx
- Line 338: `bg-surface` (code block)

### apps/unified/src/app/admin/page.tsx
- Line 238: `bg-surface-elevated` (progress bar)

### apps/unified/src/app/admin/tools/brand-assets/page.tsx
- Lines 287, 290, 297, 304, 331: `bg-surface-elevated`, `bg-surface`, `hover:bg-surface-hover` (multiple instances)

### apps/unified/src/components/PhotoGalleryPreview.tsx
- Line 99: `bg-surface` (gallery item)

### apps/unified/src/app/admin/analytics/page.tsx
- Lines 472, 504, 536, 568: `hover:bg-surface-elevated` (hover variants)

### apps/unified/src/components/ImprovedEntitySwitcher.tsx
- Line 244: `bg-surface` (trigger button)
- Line 244: `hover:bg-surface/80` (hover with opacity)

### apps/unified/src/components/FlierGallery.tsx
- Line 58: `bg-surface` (flier card)
- Line 137: `bg-surface` (button)
- Line 137: `hover:bg-surface/80` (hover with opacity)

### apps/unified/src/components/CalendarButtons.tsx
- Line 170: `bg-surface` (button)
- Line 198: `hover:bg-surface/50` (hover with opacity)

### apps/unified/src/components/venue/VenueMapCard.tsx
- Line 84: `bg-surface` (map placeholder)
- Line 96: `bg-surface` (button)
- Line 96: `hover:bg-surface/80` (hover with opacity)

### apps/unified/src/components/events/VenuePreview.tsx
- Line 44: `bg-surface` (logo container)

### apps/unified/src/components/NotificationBell.tsx
- Line 144: `hover:bg-surface` (hover state)
- Line 160: `bg-surface` (dropdown)

### apps/unified/src/app/app/venue/organizers/preapproved/page.tsx
- Line 271: `hover:bg-surface` (hover state)

**Variants found:**
- `bg-surface` (base)
- `bg-surface/50`, `bg-surface/80` (with opacity)
- `bg-surface-secondary` (variant)
- `bg-surface-elevated` (variant)
- `bg-surface-hover` (variant)
- `hover:bg-surface` (hover state)
- `hover:bg-surface-elevated` (hover variant)
- `hover:bg-surface-hover` (hover variant)

---

## 3. text-foreground Pattern (874 occurrences across 78 files)

**Most affected files:**

### apps/unified/src/components/EventDetailPage.tsx
- **25+ occurrences** of `text-foreground`, `text-foreground-muted`

### apps/unified/src/app/app/venue/settings/page.tsx
- **30+ occurrences** of `text-foreground`, `text-foreground-muted`

### apps/unified/src/app/e/[eventSlug]/EventPageContent.tsx
- **30+ occurrences** of `text-foreground`, `text-foreground-muted`

### apps/unified/src/components/UnifiedDashboard.tsx
- **6+ occurrences** of `text-foreground-muted`

### All files with text-foreground usage:

**Components:**
- `apps/unified/src/components/venue/VenueHeader.tsx`
- `apps/unified/src/components/venue/VenueMapEmbed.tsx`
- `apps/unified/src/components/venue/VenueCard.tsx`
- `apps/unified/src/components/venue/MapPreview.tsx`
- `apps/unified/src/components/venue/EventRow.tsx`
- `apps/unified/src/components/venue/PastEventRow.tsx`
- `apps/unified/src/components/UnifiedDashboard.tsx`
- `apps/unified/src/components/TypeformSignup.tsx`
- `apps/unified/src/components/RegistrationSuccess.tsx`
- `apps/unified/src/components/ShareButton.tsx`
- `apps/unified/src/components/PhotoUploader.tsx`
- `apps/unified/src/components/EventImageUpload.tsx`
- `apps/unified/src/components/EventDetailPage.tsx`
- `apps/unified/src/components/AttendeeDetailModal.tsx`
- `apps/unified/src/components/DoorStaffModal.tsx`
- `apps/unified/src/components/PermanentDoorStaffSection.tsx`
- `apps/unified/src/components/PromoterRequestButton.tsx`
- `apps/unified/src/components/events/EventCard.tsx`
- `apps/unified/src/components/FlierGallery.tsx`
- `apps/unified/src/components/CalendarButtons.tsx`
- `apps/unified/src/components/venue/VenueGallery.tsx`
- `apps/unified/src/components/venue/UpcomingEventsList.tsx`
- `apps/unified/src/components/PhotoGalleryPreview.tsx`
- `apps/unified/src/components/ImprovedEntitySwitcher.tsx`
- `apps/unified/src/components/NotificationBell.tsx`
- `apps/unified/src/components/UserAssignmentModal.tsx`
- `apps/unified/src/components/PromoterProfileModal.tsx`
- `apps/unified/src/components/OrganizerProfileModal.tsx`
- `apps/unified/src/components/UserProfileModal.tsx`
- `apps/unified/src/components/venue/VenueMapCard.tsx`
- `apps/unified/src/components/events/VenuePreview.tsx`
- `apps/unified/src/components/EventQRCode.tsx`
- ... and many more

**App Routes:**
- `apps/unified/src/app/v/[venueSlug]/page.tsx`
- `apps/unified/src/app/e/[eventSlug]/EventPageContent.tsx`
- `apps/unified/src/app/app/venue/settings/page.tsx`
- `apps/unified/src/app/app/organizer/live/[eventId]/page.tsx`
- `apps/unified/src/app/app/organizer/events/[eventId]/photos/page.tsx`
- `apps/unified/src/app/app/organizer/events/page.tsx`
- `apps/unified/src/app/app/organizer/events/new/page.tsx`
- `apps/unified/src/app/app/venue/organizers/preapproved/page.tsx`
- `apps/unified/src/app/app/venue/events/pending/page.tsx`
- `apps/unified/src/app/app/venue/events/page.tsx`
- `apps/unified/src/app/app/promoter/live/[eventId]/page.tsx`
- `apps/unified/src/app/app/promoter/events/page.tsx`
- `apps/unified/src/app/app/organizer/promoter-requests/page.tsx`
- `apps/unified/src/app/door/[eventId]/page.tsx`
- `apps/unified/src/app/i/[code]/page.tsx`
- `apps/unified/src/app/me/page.tsx`
- `apps/unified/src/app/me/profile/page.tsx`
- ... and many more

**Variants found:**
- `text-foreground` (base)
- `text-foreground-muted` (muted variant)
- `hover:text-foreground` (hover state)

---

## 4. CSS Variables (--background, --foreground, --surface)

**Status**: ✅ **No occurrences found**

All legacy CSS variables have been successfully removed. The codebase now uses the new token system.

---

## 5. Tailwind Color References (primary.DEFAULT, primary.hover)

**Status**: ✅ **No occurrences found**

No legacy patterns of `primary.DEFAULT` or `primary.hover` found in the codebase.

---

## 6. Surface Variant Patterns (22 occurrences)

### apps/unified/src/app/app/venue/settings/page.tsx
- Line 630: `bg-surface-secondary`

### apps/unified/src/components/DoorStaffModal.tsx
- Lines 289, 313, 355, 389, 489, 543, 561: `bg-surface-secondary` (7 occurrences)

### apps/unified/src/app/app/organizer/events/page.tsx
- Line 220: `hover:bg-surface-elevated`

### apps/unified/src/components/PermanentDoorStaffSection.tsx
- Lines 241, 326, 327: `bg-surface-secondary` (3 occurrences)

### apps/unified/src/app/admin/page.tsx
- Line 238: `bg-surface-elevated`

### apps/unified/src/app/admin/tools/brand-assets/page.tsx
- Lines 287, 290, 297, 304, 331: `bg-surface-elevated`, `hover:bg-surface-hover` (5 occurrences)

### apps/unified/src/app/admin/analytics/page.tsx
- Lines 472, 504, 536, 568: `hover:bg-surface-elevated` (4 occurrences)

**Variants found:**
- `bg-surface-secondary`
- `bg-surface-elevated`
- `bg-surface-hover`
- `hover:bg-surface-elevated`
- `hover:bg-surface-hover`

---

## Migration Mapping

Based on the new design tokens in `styles/tokens.css`:

| Legacy Pattern | New Pattern | Notes |
|---------------|-------------|-------|
| `bg-background` | `bg-void` | Main background |
| `bg-background/50`, `bg-background/60`, `bg-background/80` | `bg-void/50`, `bg-void/60`, `bg-void/80` | With opacity |
| `bg-background-secondary` | `bg-raised` or `bg-active` | Secondary/elevated surfaces |
| `bg-background-tertiary` | `bg-active` | Tertiary/hover states |
| `bg-surface` | `bg-glass` | Cards/panels |
| `bg-surface/50`, `bg-surface/80` | `bg-glass/50`, `bg-glass/80` | With opacity |
| `bg-surface-secondary` | `bg-raised` or `bg-active` | Secondary surfaces |
| `bg-surface-elevated` | `bg-raised` | Elevated surfaces |
| `bg-surface-hover` | `bg-active` | Hover states |
| `hover:bg-surface` | `hover:bg-glass` | Hover state |
| `hover:bg-surface-elevated` | `hover:bg-raised` | Hover variant |
| `hover:bg-surface-hover` | `hover:bg-active` | Hover variant |
| `text-foreground` | `text-primary` | Primary text |
| `text-foreground-muted` | `text-secondary` | Muted text (Slate 400) |
| `hover:text-foreground` | `hover:text-primary` | Hover state |

---

## Files Requiring Migration

**Total files to modify**: ~90 files

**High Priority (Core Components):**
1. `apps/unified/src/components/UnifiedDashboard.tsx`
2. `apps/unified/src/components/EventDetailPage.tsx`
3. `apps/unified/src/app/app/venue/settings/page.tsx`
4. `apps/unified/src/app/e/[eventSlug]/EventPageContent.tsx`

**Medium Priority (Common Components):**
- All component files in `apps/unified/src/components/`
- Event and venue pages

**Note**: The `design-bible` page was not found in this scan, suggesting it may have been removed or the patterns changed.

