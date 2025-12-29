# DJ Feature QA Checklist

This checklist covers the DJ Profiles + Lineups + Mixes + Follows feature implementation.

## Database & Schema

- [ ] Run all migrations (071-077) successfully
- [ ] Verify DJ role exists in `user_role` enum
- [ ] Verify `djs` table exists with all required fields
- [ ] Verify `mixes` table exists with SoundCloud fields
- [ ] Verify `dj_follows` table exists
- [ ] Verify `event_lineups` table exists
- [ ] Verify `mix_plays` table exists (optional analytics)
- [ ] Verify `dj-images` storage bucket exists and is public
- [ ] Test RLS policies (DJs can edit own profiles, public can view, etc.)

## DJ Profile Creation

- [ ] User can access "Create DJ Profile" from navigation dropdown
- [ ] Multi-step form works (Basic Info → Social Links → Review)
- [ ] Handle generation works (auto-generates if not provided)
- [ ] Handle uniqueness validation works
- [ ] DJ profile is created successfully
- [ ] DJ role is assigned automatically
- [ ] User is redirected to DJ dashboard after creation
- [ ] "Create DJ Profile" link disappears after profile is created

## DJ Dashboard

- [ ] DJ dashboard loads at `/app/dj`
- [ ] Stats display correctly (mixes, plays, followers, events)
- [ ] Quick action cards work (Edit Profile, Manage Mixes, Your Events)
- [ ] Navigation to sub-pages works (Profile, Mixes, Events, Analytics)

## DJ Profile Editor (`/app/dj/profile`)

- [ ] Profile loads existing data
- [ ] All fields can be edited (name, handle, bio, location, genres, social links)
- [ ] Genre tags can be added and removed
- [ ] Changes save successfully
- [ ] Handle uniqueness validation works on edit
- [ ] Image upload endpoints exist (avatar, cover) - functionality can be tested separately

## Mixes Manager (`/app/dj/mixes`)

- [ ] List of mixes displays (draft and published)
- [ ] Add mix form works
- [ ] SoundCloud URL validation works
- [ ] Mix creation works
- [ ] Mix editing works
- [ ] Mix deletion works (with confirmation)
- [ ] Feature/unfeature toggle works
- [ ] Status (draft/published) can be changed
- [ ] Mix cover image upload works (if implemented in UI)

## DJ Events Page (`/app/dj/events`)

- [ ] Upcoming events display correctly
- [ ] Past events display correctly
- [ ] Events link to public event pages
- [ ] Set times display if available
- [ ] Empty state displays when no events

## DJ Analytics Page (`/app/dj/analytics`)

- [ ] Stats display correctly
- [ ] All metrics are accurate (plays, followers, mixes, events)

## Public DJ Profile (`/dj/[handle]`)

- [ ] Public profile page loads
- [ ] Hero section displays (name, image, genres, location, follow button)
- [ ] Bio displays if present
- [ ] Social links display and work
- [ ] Featured mixes section displays
- [ ] All mixes list displays
- [ ] Upcoming events section displays
- [ ] Follow button works (follow/unfollow)
- [ ] Follower count updates
- [ ] SEO metadata is correct
- [ ] Page is shareable

## Follow System

- [ ] Follow button works on DJ profile
- [ ] Unfollow works
- [ ] Follower count updates correctly
- [ ] Follow state persists across page reloads
- [ ] Users must be logged in to follow (redirects to login)
- [ ] `/me/following` page displays followed DJs
- [ ] Unfollow works from following page

## Mix Components

- [ ] MixCard component displays correctly
- [ ] MixEmbed component renders SoundCloud iframe correctly
- [ ] Mix links work (if mix detail pages are created)

## Event Lineup Integration

### Public Event Page

- [ ] Lineup section displays on event page (if lineup exists)
- [ ] DJ cards in lineup link to DJ profiles
- [ ] Set times display if available
- [ ] Lineup is ordered correctly

### Lineup Management (Organizers/Venue Admins)

- [ ] Lineup API endpoints work (GET/POST/DELETE/PATCH)
- [ ] Permission checks work (only event owners can manage)
- [ ] DJ search works (`/api/djs/search`)
- [ ] DJs can be added to lineup
- [ ] DJs can be removed from lineup
- [ ] Lineup order can be updated
- [ ] Set times can be set/updated

## Image Uploads

- [ ] Profile avatar upload works (`/api/dj/profile/avatar`)
- [ ] Cover image upload works (`/api/dj/profile/cover`)
- [ ] Mix cover upload works (`/api/dj/mixes/[mixId]/cover`)
- [ ] Old images are deleted when new ones are uploaded
- [ ] Image validation works (type, size)

## Navigation & Routing

- [ ] DJ dashboard accessible at `/app/dj`
- [ ] Public DJ profile accessible at `/dj/[handle]`
- [ ] All DJ dashboard sub-pages accessible
- [ ] Navigation menus show "Create DJ Profile" when appropriate
- [ ] Navigation menus hide "Create DJ Profile" after profile is created

## Permissions & Security

- [ ] Only DJ owners can edit their profiles
- [ ] Only DJ owners can manage their mixes
- [ ] Public can view published DJ profiles and mixes
- [ ] Public can view event lineups
- [ ] Only event owners (organizers/venue admins) can manage lineups
- [ ] RLS policies enforce all security rules
- [ ] Superadmins can manage everything

## Mobile Responsiveness

- [ ] DJ dashboard works on mobile
- [ ] DJ profile editor works on mobile
- [ ] Mixes manager works on mobile
- [ ] Public DJ profile page works on mobile
- [ ] Event lineup displays correctly on mobile
- [ ] Follow button works on mobile

## Performance

- [ ] Dashboard loads quickly
- [ ] Mix lists scroll smoothly
- [ ] Images load efficiently
- [ ] No unnecessary API calls

## Edge Cases

- [ ] Handle with special characters is handled correctly
- [ ] Very long bios/text don't break layout
- [ ] Empty states display correctly
- [ ] Error states handle gracefully
- [ ] Multiple mixes with same title are handled
- [ ] DJs with no mixes display correctly
- [ ] DJs with no events display correctly
- [ ] Events with no lineup don't show lineup section



