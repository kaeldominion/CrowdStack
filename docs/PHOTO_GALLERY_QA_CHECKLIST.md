# Photo Gallery QA Checklist

This document provides test steps for the event photo gallery system features.

---

## Prerequisites

1. Run the database migration:
   ```bash
   # Apply migration 067_photo_gallery_enhancements.sql to your local/staging database
   ```

2. Ensure you have:
   - A test event with registrations
   - At least one registration with a check-in (for "attended" mode testing)
   - Postmark API token configured (for email testing)
   - A user account for testing (organizer role)

---

## 1. Photo Upload (Existing Feature - Verify Still Works)

### Test Steps:
1. Log in as an organizer
2. Navigate to `/app/organizer/events/[eventId]/photos`
3. Upload 3-5 test photos using the upload component
4. Verify photos appear in the grid
5. Verify thumbnail generation works

### Expected Results:
- [ ] Photos upload successfully
- [ ] Thumbnails display correctly
- [ ] Photos are saved to `event-photos` bucket
- [ ] Photos appear in database `photos` table

---

## 2. Photo Album Publishing

### Test Steps:
1. With unpublished photos, click "Publish Album"
2. Verify the album status changes to "Published"
3. Check if auto-email setting affects behavior

### Expected Results:
- [ ] Album status updates to "published"
- [ ] Published badge appears
- [ ] Share link becomes available
- [ ] If auto-email enabled: notification emails sent

---

## 3. Manual Notification (New Feature)

### Test Steps:
1. With a published album, click "Notify Attendees"
2. Modal should appear with recipient options
3. Test "Send test to me" option first
4. Then test actual batch send

### Test Scenarios:

#### 3a. Test Email
1. Check "Send test to me only"
2. Click "Send Test"
3. Verify email arrives in your inbox

#### 3b. Registered Recipients
1. Select "Registered" mode
2. Click "Send to X"
3. Verify emails sent to registered attendees

#### 3c. Attended Recipients
1. Select "Checked In" mode
2. Click "Send to X"
3. Verify emails sent only to checked-in attendees

### Expected Results:
- [ ] Test email arrives correctly
- [ ] Email content includes event name, date, venue
- [ ] Gallery link in email works
- [ ] Thumbnail previews display (if available)
- [ ] Custom message appears in email (if provided)
- [ ] "Last notified" timestamp updates
- [ ] 5-minute debounce prevents spam

---

## 4. Notification Settings (New Feature)

### Test Steps:
1. On photos page, click Settings gear icon
2. Change default recipient mode
3. Toggle auto-email on publish
4. Save settings
5. Publish a new album to test auto-email

### Expected Results:
- [ ] Settings panel expands/collapses
- [ ] Recipient mode saves correctly
- [ ] Auto-email toggle saves correctly
- [ ] Settings persist on page reload

---

## 5. Public Gallery Page

### Test Scenarios:

#### 5a. No Album
1. Navigate to `/p/[eventSlug]` for event without album
2. Should show "Photos Coming Soon" state

#### 5b. Unpublished Album
1. Navigate to `/p/[eventSlug]` for event with draft album
2. Should show "Photos Coming Soon" state with event info

#### 5c. Published Album with Photos
1. Navigate to `/p/[eventSlug]` for published album
2. Photos should display in masonry grid
3. Click a photo to open lightbox

### Expected Results:
- [ ] Empty states display correctly with event info
- [ ] Masonry grid loads and displays photos
- [ ] Lazy loading works for thumbnails
- [ ] Back to event link works

---

## 6. Photo Lightbox

### Test Steps:
1. Click a photo to open lightbox
2. Test keyboard navigation (left/right arrows, Escape)
3. Test swipe navigation on mobile
4. Test each action button

### Expected Results:
- [ ] Lightbox opens with correct photo
- [ ] Navigation works (keyboard + touch)
- [ ] Photo counter shows "X / Y"
- [ ] Caption displays (if present)

---

## 7. Likes (New Feature)

### Test Steps:
1. Open lightbox (logged in)
2. Click heart icon to like
3. Verify like count increments
4. Click again to unlike
5. Verify like count decrements
6. Test while logged out (should be disabled)

### Expected Results:
- [ ] Like toggles correctly
- [ ] Count updates immediately
- [ ] Heart fills when liked
- [ ] Disabled state when logged out

---

## 8. Comments (New Feature)

### Test Steps:
1. Open lightbox (logged in)
2. Click comments icon to open panel
3. Add a comment
4. Verify comment appears
5. Delete your comment
6. Test while logged out

### Expected Results:
- [ ] Comments panel opens/closes
- [ ] New comments post successfully
- [ ] Comments display with user name/avatar
- [ ] Delete works for own comments
- [ ] Input disabled when logged out
- [ ] Comment count updates

---

## 9. Stats Tracking (New Feature)

### Test Steps:
1. View a photo in lightbox
2. Download a photo
3. Check organizer photos page for stats

### Expected Results:
- [ ] View count increments
- [ ] Download count increments
- [ ] Stats display on organizer page
- [ ] Like/comment counts match actual data

---

## 10. Download

### Test Steps:
1. Click download button in lightbox (logged in)
2. Verify file downloads
3. Test while logged out

### Expected Results:
- [ ] Photo downloads successfully
- [ ] Correct filename format
- [ ] Download count incremented
- [ ] Blocked if logged out (if configured)

---

## 11. Sharing

### Test Steps:
1. Click Share button in lightbox
2. On mobile: native share sheet should appear
3. On desktop: link should copy to clipboard
4. Test Instagram share button

### Expected Results:
- [ ] Share works on mobile (native)
- [ ] Clipboard copy works on desktop
- [ ] Instagram share creates branded image

---

## Database Verification Queries

```sql
-- Check photo_albums settings
SELECT id, event_id, status, 
       photo_email_recipient_mode,
       photo_auto_email_on_publish,
       photo_last_notified_at
FROM photo_albums 
WHERE event_id = '[your-event-id]';

-- Check photo stats
SELECT id, view_count, download_count, like_count, comment_count
FROM photos
WHERE album_id = '[your-album-id]';

-- Check comments
SELECT pc.*, p.storage_path
FROM photo_comments pc
JOIN photos p ON pc.photo_id = p.id
WHERE p.album_id = '[your-album-id]'
ORDER BY pc.created_at DESC;

-- Check likes
SELECT pl.*, p.storage_path
FROM photo_likes pl
JOIN photos p ON pl.photo_id = p.id
WHERE p.album_id = '[your-album-id]';
```

---

## API Endpoints to Test

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/events/[eventId]/photos` | GET | List photos |
| `/api/events/[eventId]/photos` | POST | Upload photos |
| `/api/events/[eventId]/photos/publish` | POST | Publish album |
| `/api/events/[eventId]/photos/notify` | GET | Get notification settings |
| `/api/events/[eventId]/photos/notify` | POST | Send notifications |
| `/api/events/[eventId]/photos/notify` | PATCH | Update settings |
| `/api/photos/[photoId]/comments` | GET | List comments |
| `/api/photos/[photoId]/comments` | POST | Add comment |
| `/api/photos/[photoId]/comments` | DELETE | Delete comment |
| `/api/photos/[photoId]/likes` | GET | Get like status |
| `/api/photos/[photoId]/likes` | POST | Toggle like |
| `/api/photos/[photoId]/view` | POST | Track view |
| `/api/photos/[photoId]/download` | POST | Track download |
| `/api/auth/status` | GET | Check auth status |

---

## Known Limitations

1. **Download All**: Deferred to v2 - only per-photo download available
2. **Gallery Access**: Currently public when published (no gating)
3. **View Tracking**: Simple counter, no rate limiting per user

---

## Troubleshooting

### Emails Not Sending
1. Check Postmark API token is set: `POSTMARK_API_TOKEN`
2. Check message_logs table for errors
3. Verify recipient emails exist in registrations

### Likes/Comments Not Working
1. Check user is authenticated (auth/status endpoint)
2. Verify RLS policies are applied from migration
3. Check browser console for API errors

### Stats Not Updating
1. Verify triggers are created in database
2. Check for unique constraint violations on likes
3. Ensure photo_id is valid

