# CrowdStack Table Booking & Guest Pass System Test Plan

## Application Overview

This test plan covers the complete table booking and guest pass system for CrowdStack. The system allows guests to book tables at events through direct booking links, invite other guests to join their table party, and receive digital QR passes for entry. The flows tested include: table booking requests with optional deposits, guest party invitations, QR pass generation and viewing, and various error scenarios including invalid codes, expired bookings, and capacity limits.

## Test Scenarios

### 1. Table Booking Flow

**Seed:** `tests/seed.spec.ts`

#### 1.1. Complete table booking with valid link code

**File:** `tests/table-booking/complete-booking-with-link.spec.ts`

**Steps:**
  1. Navigate to /book/VALID_CODE where VALID_CODE is an active booking link for a specific table
  2. Verify the page displays event details including event name, venue name, date/time, and location
  3. Verify the specific table information is shown (table name, zone, capacity, minimum spend, deposit if required)
  4. Verify the 'Reserve a Table' section displays with the TableBookingSection component
  5. Click the 'Request This Table' button for the available table
  6. If not logged in, verify login prompt modal appears with 'Sign In Required' message
  7. If not logged in, sign in using test credentials
  8. After login, if profile is incomplete, verify profile completion modal appears
  9. Fill in required profile fields: WhatsApp number, date of birth (18+ years), gender, Instagram handle
  10. Click 'Save & Continue' to complete profile
  11. Verify booking modal opens with pre-filled user details (name, email from profile)
  12. Enter WhatsApp number in the booking form
  13. Optionally add special requests in the text area
  14. Click 'Submit Request' button
  15. Wait for booking submission to complete

**Expected Results:**
  - Success modal displays with 'Request Received!' message and green checkmark icon
  - Booking details are shown: venue name, event date, table name, max guests, minimum spend
  - If deposit is required and DOKU payment is enabled, payment section displays with amount and 'Pay Now' button
  - If deposit is required but DOKU is not available, 'View Booking & Pay' button is shown
  - Success message confirms email sent to guest email address
  - Booking is created in database with status 'pending'
  - If deposit required, payment_status is 'pending', otherwise 'not_required'
  - Confirmation email is sent to guest with booking details
  - User can navigate to booking page via returned booking_url

#### 1.2. Book table without specific table (any table mode)

**File:** `tests/table-booking/book-any-table.spec.ts`

**Steps:**
  1. Navigate to /book/GENERAL_CODE where GENERAL_CODE is a booking link without specific table_id
  2. Verify event header displays with event information
  3. Verify 'Reserve a Table' section shows multiple zones with tables
  4. Click on a zone header to expand and view available tables
  5. Verify tables are grouped by zones (VIP, General, etc.) with appropriate styling
  6. Select a table that shows as available (not marked 'Reserved')
  7. Verify table shows capacity, minimum spend, and deposit amount if applicable
  8. Complete login and profile steps if required
  9. Fill booking form with guest details and WhatsApp number
  10. Add optional special requests
  11. Submit the booking request

**Expected Results:**
  - Multiple zones are displayed with expandable/collapsible sections
  - Each zone shows table count and description
  - Tables display correct capacity, minimum spend, and deposit information
  - Reserved tables are visually distinct with 'Reserved' badge and reduced opacity
  - Available tables are clickable and open booking modal
  - Booking submission succeeds with confirmation
  - Table selection is saved correctly in booking record

#### 1.3. Booking with deposit payment via DOKU

**File:** `tests/table-booking/booking-with-deposit-payment.spec.ts`

**Steps:**
  1. Navigate to booking link for a table that requires deposit
  2. Complete login and profile requirements
  3. Select table with deposit requirement (e.g., table with deposit_amount > 0)
  4. Verify deposit amount is displayed in booking modal (amber warning box)
  5. Submit booking request
  6. Verify success modal displays payment section prominently
  7. Verify payment section shows: deposit amount, payment expiry time, invoice number
  8. Click 'Pay Now' button
  9. Verify redirect to DOKU checkout page (external URL)
  10. Simulate payment completion (or cancellation) on DOKU
  11. Return to CrowdStack via callback URL

**Expected Results:**
  - Deposit requirement is clearly shown before booking submission
  - After booking, payment section is prominently displayed in success modal
  - Payment URL is generated and stored in payment_transactions table
  - Invoice number follows format: BOOK-{first8chars}-{timestamp}
  - Payment expiry is set based on venue payment settings (default 24 hours)
  - Payment transaction record is created with status 'pending'
  - Booking record links to payment transaction via payment_transaction_id
  - On payment success, booking payment_status updates to 'paid'
  - On payment cancellation, user is returned to booking page with pending payment

#### 1.4. Duplicate booking prevention

**File:** `tests/table-booking/prevent-duplicate-bookings.spec.ts`

**Steps:**
  1. Complete a table booking using specific email address
  2. Wait for booking confirmation
  3. Attempt to book the same table at the same event using the same email
  4. Fill booking form with identical email address
  5. Submit the booking request

**Expected Results:**
  - Error message is displayed before booking is created
  - Error message states: 'You already have a pending request for this table' or 'You already have a confirmed booking for this table'
  - No duplicate booking record is created in database
  - User is prevented from submitting duplicate request

#### 1.5. Booking with promoter referral code

**File:** `tests/table-booking/booking-with-referral.spec.ts`

**Steps:**
  1. Navigate to /book/CODE?ref=PROMOTER_ID where ref is a valid promoter ID or code
  2. Complete booking flow normally
  3. Submit booking request

**Expected Results:**
  - Booking record includes promoter_id field populated with the promoter's ID
  - Referral_code field stores the original ref parameter value
  - Promoter attribution is saved for commission tracking
  - Promoter can view this booking in their referrals list

#### 1.6. Invalid or expired booking link

**File:** `tests/table-booking/invalid-booking-link.spec.ts`

**Steps:**
  1. Navigate to /book/INVALID_CODE where INVALID_CODE is a non-existent code
  2. Verify error state is displayed
  3. Navigate to /book/EXPIRED_CODE where EXPIRED_CODE has is_active=false
  4. Verify appropriate error message
  5. Navigate to /book/CODE_FOR_EXPIRED_LINK where expires_at is in the past
  6. Verify expiration error message

**Expected Results:**
  - For invalid code: Error displays 'Booking Link Invalid' with message 'This booking link could not be found'
  - For deactivated link: Error displays 'Link Deactivated' with message 'This booking link is no longer active'
  - For expired link: Error displays 'Link Expired' with message 'This booking link has expired'
  - Error page shows AlertCircle icon in red
  - Error page includes 'Go Home' button that links to homepage
  - No booking form or table information is displayed
  - HTTP status code is appropriate (404 for not found, 410 for expired)

#### 1.7. Booking for ended event

**File:** `tests/table-booking/booking-for-ended-event.spec.ts`

**Steps:**
  1. Create a booking link for an event where end_time is in the past
  2. Navigate to the booking link URL
  3. Verify error state is shown

**Expected Results:**
  - Error title displays 'Event Ended'
  - Error message states 'This event has already ended'
  - HTTP status code 410 (Gone) is returned
  - No booking form is displayed
  - User cannot proceed with booking

#### 1.8. Table booking with event-specific overrides

**File:** `tests/table-booking/event-specific-overrides.spec.ts`

**Steps:**
  1. Create event with table that has event_table_availability overrides
  2. Set override_minimum_spend, override_deposit, and override_capacity in event_table_availability
  3. Navigate to booking link for this table
  4. Verify displayed values match overrides not base table values
  5. Complete booking

**Expected Results:**
  - Table displays override_minimum_spend if set, otherwise table.minimum_spend
  - Deposit shown is override_deposit if set, otherwise table.deposit_amount
  - Capacity shown is override_capacity if set, otherwise table.capacity
  - Party size in booking record uses effective_capacity value
  - Booking record stores effective values in minimum_spend and deposit_required fields

#### 1.9. Profile completion requirement before booking

**File:** `tests/table-booking/profile-completion-required.spec.ts`

**Steps:**
  1. Log in with account that has incomplete profile (missing whatsapp, date_of_birth, gender, or instagram_handle)
  2. Navigate to valid booking link
  3. Select a table to book
  4. Verify profile completion modal appears instead of booking modal
  5. View list of missing required fields
  6. Attempt to proceed without completing profile (click Cancel)
  7. Verify booking modal does not open
  8. Select table again and complete profile fields
  9. Enter valid WhatsApp number
  10. Enter date of birth (must be 18+ years old)
  11. Select gender (Male or Female)
  12. Enter Instagram handle
  13. Click 'Save & Continue'

**Expected Results:**
  - Profile completion modal appears with 'Complete Your Profile' title
  - Required fields are clearly indicated with amber warning box
  - Missing fields are listed: WhatsApp Number, Date of Birth, Gender, Instagram Handle
  - Date picker enforces minimum age of 18 years
  - Gender selection shows as button toggles (Male/Female)
  - Instagram handle input auto-removes @ symbol prefix
  - After saving profile, modal closes and booking modal opens automatically
  - User details are pre-filled in booking form from updated profile
  - Profile updates are saved to attendees table
  - Subsequent bookings do not require profile completion

#### 1.10. Return to booking after login redirect

**File:** `tests/table-booking/resume-after-login.spec.ts`

**Steps:**
  1. Navigate to booking link while not logged in
  2. Select a table to book
  3. Click sign in when login prompt appears
  4. Verify redirect to /login with redirect parameter
  5. Complete login process
  6. Verify automatic redirect back to booking page
  7. Verify URL includes ?reserveTable=TABLE_ID parameter
  8. Verify booking modal automatically opens for the selected table

**Expected Results:**
  - Login redirect URL is /login?redirect={encoded_booking_url}
  - Booking URL includes reserveTable parameter with selected table ID
  - After login, user is redirected to exact booking page with table parameter
  - Booking modal automatically opens for previously selected table
  - Table selection is preserved through login flow
  - URL parameter is cleaned up after processing (removed from URL)
  - User can complete booking without re-selecting table

### 2. Guest Pass Viewing and Validation

**Seed:** `tests/seed.spec.ts`

#### 2.1. View valid guest pass with QR code

**File:** `tests/guest-pass/view-valid-pass.spec.ts`

**Steps:**
  1. Log in as user who has a confirmed table party guest record
  2. Navigate to /table-pass/GUEST_ID where GUEST_ID is the table_party_guests.id
  3. Wait for pass data to load

**Expected Results:**
  - Pass page displays without errors
  - Event name is shown prominently at top
  - Event date and time are displayed in readable format
  - Venue name is shown in uppercase
  - Guest name displays correctly from attendee record (first + last name)
  - If guest is host, 'Host' badge is visible
  - If table is in VIP zone, 'VIP' badge is displayed with gold styling
  - Table name and zone are shown in table details section
  - Host name is displayed (if current user is not host)
  - QR code is rendered as image using qr_token from registration
  - QR code is displayed with white background and adequate margin
  - Pass ID is shown in format XXXX-XXXX-XXXX below QR code
  - Status shows 'Confirmed' if not checked in, 'Checked In' if checked_in=true
  - QR code is clickable to expand to fullscreen
  - Links to 'View Table Party' and 'View event details' are present
  - Close button (X) in top-right corner links to event page

#### 2.2. Fullscreen QR code display

**File:** `tests/guest-pass/fullscreen-qr-code.spec.ts`

**Steps:**
  1. Navigate to valid guest pass page
  2. Verify QR code shows hover hint 'Tap to enlarge'
  3. Click on the QR code image
  4. Verify fullscreen modal appears
  5. Verify enlarged QR code is displayed
  6. Verify event name and guest details are shown below QR
  7. Click outside the modal to close
  8. Verify modal closes and returns to normal view
  9. Click QR code again and click the X button in modal
  10. Verify modal closes

**Expected Results:**
  - QR code shows hover state with Maximize2 icon and 'Tap to enlarge' text
  - Fullscreen modal appears with dark overlay (bg-black/95)
  - QR code is enlarged (600x600 instead of 300x300)
  - QR code maintains quality with pixelated rendering
  - Event name, guest name, table name, and pass ID are displayed in modal
  - Close button (X) is visible in top-right of modal
  - Clicking outside modal closes it smoothly
  - Clicking X button also closes modal
  - Animations are smooth (framer-motion transitions)
  - 'Tap outside to close' hint is shown below modal

#### 2.3. Guest pass requires authentication

**File:** `tests/guest-pass/authentication-required.spec.ts`

**Steps:**
  1. Log out if currently logged in
  2. Navigate to /table-pass/VALID_GUEST_ID
  3. Attempt to view pass without authentication

**Expected Results:**
  - API returns 401 Unauthorized status
  - Error message displays 'Authentication required'
  - Pass data is not loaded
  - QR code is not displayed
  - User is prompted to log in

#### 2.4. Pass for guest that does not belong to user

**File:** `tests/guest-pass/unauthorized-pass-access.spec.ts`

**Steps:**
  1. Log in as User A
  2. Get guest_id for a pass that belongs to User B (different attendee)
  3. Navigate to /table-pass/{UserB_guest_id}
  4. Attempt to view the pass

**Expected Results:**
  - API returns 403 Forbidden status
  - Error message: 'Unauthorized - this pass belongs to a different account'
  - QR code is not displayed
  - Pass details are not shown
  - No sensitive information about other user's booking is revealed

#### 2.5. Pass for revoked guest (removed status)

**File:** `tests/guest-pass/revoked-guest-pass.spec.ts`

**Steps:**
  1. Host removes a guest from table party (status='removed')
  2. Log in as the removed guest
  3. Navigate to /table-pass/REMOVED_GUEST_ID

**Expected Results:**
  - API returns 400 Bad Request
  - Error message: 'This pass has been revoked'
  - Pass is not displayed
  - QR code is not accessible
  - Guest cannot check in with revoked pass

#### 2.6. Pass for declined invitation

**File:** `tests/guest-pass/declined-invitation-pass.spec.ts`

**Steps:**
  1. Guest declines table party invitation (status='declined')
  2. Log in as the declined guest
  3. Navigate to /table-pass/DECLINED_GUEST_ID

**Expected Results:**
  - API returns 400 Bad Request
  - Error message: 'You declined this invitation. Contact the host if you changed your mind.'
  - Pass is not displayed
  - Helpful message suggests contacting host to rejoin

#### 2.7. Pass requires joined status

**File:** `tests/guest-pass/invited-but-not-joined.spec.ts`

**Steps:**
  1. Guest receives invitation (status='invited') but has not accepted yet
  2. Log in as invited guest
  3. Navigate to /table-pass/INVITED_GUEST_ID

**Expected Results:**
  - API returns 400 Bad Request
  - Error message: 'Please accept your invitation first to get your pass'
  - Pass is not accessible until guest joins party
  - Guest must complete join flow to get pass

#### 2.8. Pass for cancelled booking

**File:** `tests/guest-pass/cancelled-booking-pass.spec.ts`

**Steps:**
  1. Table booking is cancelled by host or venue (status='cancelled')
  2. Guest with joined status attempts to view pass
  3. Navigate to /table-pass/GUEST_ID

**Expected Results:**
  - API returns 400 Bad Request
  - Error message: 'This booking has been cancelled'
  - Pass is not displayed
  - QR code is not accessible for cancelled bookings

#### 2.9. Pass displays checked-in status correctly

**File:** `tests/guest-pass/checked-in-status-display.spec.ts`

**Steps:**
  1. Create guest record with checked_in=false
  2. View pass and verify status shows 'Confirmed'
  3. Simulate check-in (update checked_in=true, checked_in_at=NOW)
  4. Refresh pass page
  5. Verify status updates to 'Checked In'

**Expected Results:**
  - Before check-in: Status shows green checkmark with 'Confirmed' text
  - After check-in: Status shows green checkmark with 'Checked In' text
  - checked_in_at timestamp is displayed in appropriate format
  - Status indicator uses accent-success color (green)
  - Pass remains valid and QR code remains accessible after check-in

#### 2.10. Pass auto-links attendee to user on first view

**File:** `tests/guest-pass/auto-link-attendee.spec.ts`

**Steps:**
  1. Create guest record with guest_email but no attendee_id
  2. Create user account with matching email
  3. Log in with matching email account
  4. Navigate to /table-pass/GUEST_ID
  5. Verify pass loads successfully

**Expected Results:**
  - API checks if logged-in user email matches guest_email
  - If match found, API searches for existing attendee with that email
  - If attendee exists, guest record is linked via attendee_id update
  - If no attendee exists, new attendee is created with user_id link
  - Guest record is updated with correct attendee_id
  - Pass displays correctly after auto-linking
  - Subsequent views use the linked attendee_id directly
  - Auto-linking only works if emails match exactly (case-insensitive)

### 3. Table Party Guest Invitation Flow

**Seed:** `tests/seed.spec.ts`

#### 3.1. View table party invitation (GET)

**File:** `tests/guest-invitation/view-invitation.spec.ts`

**Steps:**
  1. Navigate to /table-party/join/INVITE_TOKEN (no auth required)
  2. Wait for invitation data to load

**Expected Results:**
  - Invitation page loads without authentication
  - Event name, date, and time are displayed
  - Venue name and address are shown
  - Host name is displayed
  - Table name and zone are shown
  - Party size and current joined count are visible
  - Spots remaining calculation is correct (party_size - joined_count)
  - List of joined guests is displayed with names and initials
  - Host is marked with 'Host' indicator in guest list
  - If invitation is for host, indicates this is an open invite
  - If invitation is for specific guest, shows guest email
  - Guest status is shown (invited, joined, declined, removed)
  - If already joined, shows 'has_joined: true'
  - Event cover image or flier is displayed if available

#### 3.2. Accept invitation and join party (authenticated)

**File:** `tests/guest-invitation/accept-invitation.spec.ts`

**Steps:**
  1. Navigate to /table-party/join/INVITE_TOKEN
  2. Review invitation details
  3. Click 'Join Party' or 'Accept Invitation' button
  4. If not logged in, sign in or create account
  5. Complete profile form with required fields: name, surname, phone/WhatsApp, date of birth, gender, Instagram handle
  6. Submit join request
  7. Wait for success confirmation

**Expected Results:**
  - Authentication is required to join party (401 if not logged in)
  - Profile form appears if user has no attendee record or incomplete profile
  - Required fields are validated before submission
  - Attendee record is created or updated with user profile data
  - Event registration is created with source='table_booking'
  - Guest record status updates from 'invited' to 'joined'
  - joined_at timestamp is set to current time
  - attendee_id is linked to guest record
  - QR pass token is generated from registration (not table party token)
  - Success message displays: 'Successfully joined the party! Check your email for your QR pass'
  - Response includes guest_id, registration_id, and qr_token
  - Confirmation email is sent to guest with QR pass link
  - Host receives email notification that guest joined
  - Host email includes updated guest count (X/Y spots filled)

#### 3.3. Join party via host open invite

**File:** `tests/guest-invitation/join-via-host-invite.spec.ts`

**Steps:**
  1. Host creates table booking and receives invite_token
  2. Share host's invite_token with another user
  3. New user (not pre-invited) navigates to /table-party/join/HOST_INVITE_TOKEN
  4. New user logs in and fills profile
  5. Submit join request

**Expected Results:**
  - Host invite allows any user to join (is_open_invite: true)
  - Email verification is NOT required (anyone with link can join)
  - New guest record is created for the joining user
  - is_host is set to false for new guest
  - Guest is automatically added to party guest list
  - Party count increments correctly
  - Join succeeds as long as party is not full

#### 3.4. Join party via specific guest invite

**File:** `tests/guest-invitation/join-via-specific-invite.spec.ts`

**Steps:**
  1. Host invites specific guest with email address
  2. Guest receives invite_token for their specific guest record
  3. Guest navigates to /table-party/join/GUEST_INVITE_TOKEN
  4. Guest logs in with DIFFERENT email than invitation was sent to
  5. Attempt to join party

**Expected Results:**
  - If guest record has is_host=false, it's a specific person invite
  - Email verification is enforced for specific invites
  - If logged-in email does not match guest_email, join is rejected with 403
  - Error message: 'This invitation was sent to a different email address'
  - Guest must log in with the email that received invitation
  - If emails match, join proceeds normally
  - This prevents random users from joining via specific guest invites

#### 3.5. Prevent joining full party

**File:** `tests/guest-invitation/prevent-join-full-party.spec.ts`

**Steps:**
  1. Create table booking with party_size=4
  2. Have 4 guests join the party (status='joined')
  3. 5th guest attempts to join using valid invite token
  4. Submit join request

**Expected Results:**
  - Before joining, API counts current joined guests
  - If joined count >= party_size, join is rejected
  - Error response: 400 Bad Request
  - Error message: 'This party is full. Contact the host to request additional spots.'
  - No guest record is created or updated
  - Helpful message directs user to contact host for capacity increase

#### 3.6. Handle already joined guest

**File:** `tests/guest-invitation/already-joined.spec.ts`

**Steps:**
  1. Guest successfully joins party (status='joined')
  2. Same guest attempts to join again using same or different invite token
  3. Submit join request

**Expected Results:**
  - API detects guest already has joined status for this booking
  - Instead of error, returns success with already_joined flag
  - Response includes existing guest_id and qr_token
  - Message: 'You've already joined this party'
  - No duplicate guest records are created
  - Existing registration and QR token are returned
  - Guest can access their pass immediately

#### 3.7. Invitation for removed guest

**File:** `tests/guest-invitation/removed-guest-invitation.spec.ts`

**Steps:**
  1. Host removes guest from party (status='removed')
  2. Removed guest attempts to view invitation
  3. Removed guest attempts to join

**Expected Results:**
  - GET request returns 400 with 'This invitation has been revoked'
  - POST request returns 400 with 'Your invitation has been revoked'
  - Guest cannot rejoin party without new invitation from host
  - Previous guest record remains with removed status

#### 3.8. Invitation that was declined

**File:** `tests/guest-invitation/declined-invitation.spec.ts`

**Steps:**
  1. Guest declines invitation (status='declined')
  2. Guest later changes mind and attempts to join using same token

**Expected Results:**
  - GET request returns 400 with 'This invitation was declined'
  - POST request returns 400 with 'You previously declined this invitation'
  - Guest cannot rejoin without host re-inviting or changing status
  - Clear communication that they need to contact host to rejoin

#### 3.9. Guest profile auto-population from existing attendee

**File:** `tests/guest-invitation/profile-auto-population.spec.ts`

**Steps:**
  1. User with existing attendee record (complete profile) receives invitation
  2. Navigate to invitation page
  3. Click join and log in
  4. Verify profile form behavior

**Expected Results:**
  - If user has existing attendee with complete profile, data is pre-filled
  - Name, surname, phone, WhatsApp, DOB, gender, Instagram are populated
  - User can modify any pre-filled values before joining
  - Existing attendee record is updated with any changes
  - Guest name uses attendee.name + attendee.surname instead of guest_name
  - User identity is properly linked through attendee system

#### 3.10. Multiple users joining same party concurrently

**File:** `tests/guest-invitation/concurrent-joins.spec.ts`

**Steps:**
  1. Create party with capacity=5 and 3 spots remaining
  2. Have 4 users attempt to join simultaneously
  3. Submit all join requests at nearly the same time

**Expected Results:**
  - First 3 join requests succeed
  - 4th request fails with party full error
  - No race condition allows more guests than capacity
  - Database constraints prevent over-booking
  - Joined count is accurately maintained
  - All successful joins create proper registrations and send emails

#### 3.11. Email notifications on guest join

**File:** `tests/guest-invitation/join-email-notifications.spec.ts`

**Steps:**
  1. Guest joins table party successfully
  2. Check email delivery for guest and host

**Expected Results:**
  - Guest receives 'table_party_joined' email template
  - Guest email includes: event name, date, table name, venue name, QR pass URL
  - QR URL format: {baseUrl}/e/{event.slug}/pass?token={qr_token}
  - Host receives 'table_party_guest_joined_host' email template
  - Host email includes: guest name, event name, table name, updated count (X/Y)
  - Host email includes link to booking management page (/me)
  - Both emails sent via sendTemplateEmail function
  - Email failure does not prevent successful join (logged but not thrown)

### 4. Edge Cases and Error Handling

**Seed:** `tests/seed.spec.ts`

#### 4.1. Invalid guest ID in pass URL

**File:** `tests/edge-cases/invalid-guest-id.spec.ts`

**Steps:**
  1. Navigate to /table-pass/00000000-0000-0000-0000-000000000000
  2. Navigate to /table-pass/invalid-uuid-format
  3. Navigate to /table-pass/nonexistent-but-valid-uuid

**Expected Results:**
  - API returns 404 Not Found
  - Error message: 'Pass not found'
  - Error page displays with X icon and red styling
  - 'Go Home' button is available
  - No sensitive information is leaked in error response

#### 4.2. Invalid invite token

**File:** `tests/edge-cases/invalid-invite-token.spec.ts`

**Steps:**
  1. Navigate to /table-party/join/00000000-0000-0000-0000-000000000000
  2. Navigate to /table-party/join/invalid-format
  3. Navigate to /table-party/join/nonexistent-valid-uuid

**Expected Results:**
  - GET returns 404 with 'Invalid or expired invitation'
  - POST returns 404 with 'Invalid or expired invitation'
  - No party or event information is leaked
  - Error handling is consistent across endpoints

#### 4.3. Booking link for event without venue

**File:** `tests/edge-cases/event-without-venue.spec.ts`

**Steps:**
  1. Create event without venue_id
  2. Create booking link for this event
  3. Navigate to /book/CODE

**Expected Results:**
  - API returns 500 Internal Server Error
  - Error message: 'Event venue configuration error. Please contact support.'
  - Error is logged on server side with event details
  - Proper error handling prevents crash
  - User sees appropriate error page

#### 4.4. Table availability toggle during booking

**File:** `tests/edge-cases/availability-toggle-during-booking.spec.ts`

**Steps:**
  1. Load booking page with available table
  2. While user fills booking form, venue admin marks table as unavailable (is_available=false in event_table_availability)
  3. User submits booking request

**Expected Results:**
  - Booking submission fails with appropriate error
  - Error message: 'This table is not available for this event'
  - User is notified before booking is created
  - Race condition is handled gracefully

#### 4.5. Special characters in booking form

**File:** `tests/edge-cases/special-characters-in-form.spec.ts`

**Steps:**
  1. Fill booking form with special characters in name: "O'Brien", "José García"
  2. Use email with plus addressing: "user+test@example.com"
  3. Include international WhatsApp number: "+62 812 3456 7890"
  4. Add special requests with emojis and multi-line text
  5. Submit booking

**Expected Results:**
  - All Unicode characters are properly stored
  - Name fields support apostrophes, accents, and diacritics
  - Email validation accepts plus addressing
  - International phone numbers are accepted
  - Multi-line text in special_requests is preserved
  - Emojis in text fields are stored and displayed correctly
  - No SQL injection or XSS vulnerabilities

#### 4.6. Network timeout during booking submission

**File:** `tests/edge-cases/network-timeout.spec.ts`

**Steps:**
  1. Start booking submission
  2. Simulate network disconnect or slow connection (timeout)
  3. Observe error handling and retry behavior

**Expected Results:**
  - Loading spinner is displayed during submission
  - Timeout error is caught and handled gracefully
  - User sees appropriate error message
  - Submit button is re-enabled after error
  - User can retry submission
  - No partial booking is created in database
  - Transaction rollback prevents data corruption

#### 4.7. Browser back button during booking flow

**File:** `tests/edge-cases/browser-back-navigation.spec.ts`

**Steps:**
  1. Navigate to booking page
  2. Select table and open booking modal
  3. Fill form partially
  4. Click browser back button
  5. Navigate forward again
  6. Verify state is handled properly

**Expected Results:**
  - Modal closes when navigating back
  - Form data may be lost (expected behavior)
  - Page reloads cleanly when navigating forward
  - No JavaScript errors occur
  - User can start booking process again
  - URL parameters are preserved correctly

#### 4.8. Expired DOKU payment link

**File:** `tests/edge-cases/expired-payment-link.spec.ts`

**Steps:**
  1. Create booking with deposit requirement
  2. Wait for payment expiry time to pass (or modify expires_at)
  3. Attempt to access payment URL from booking confirmation

**Expected Results:**
  - DOKU payment page shows expiry message
  - User is redirected to booking page
  - Booking shows payment still pending
  - Option to request new payment link is provided
  - Expired transaction is marked appropriately
  - New payment transaction can be created if needed

#### 4.9. QR code generation failure

**File:** `tests/edge-cases/qr-code-generation-failure.spec.ts`

**Steps:**
  1. Simulate QR code service unavailability
  2. Navigate to guest pass page
  3. Attempt to generate or view QR code

**Expected Results:**
  - If QR service fails, fallback message is shown: 'QR code not available'
  - Pass page still loads with all other information
  - Guest can still see booking details, event info, table assignment
  - Error is logged for debugging
  - User can try refreshing to regenerate QR
  - Core functionality is not blocked by QR failure

#### 4.10. Table booking mode restrictions

**File:** `tests/edge-cases/booking-mode-restrictions.spec.ts`

**Steps:**
  1. Set event table_booking_mode to 'disabled'
  2. Attempt to book without booking link (direct access)
  3. Set mode to 'promoter_only'
  4. Attempt to book without ref parameter
  5. Book with valid ref parameter
  6. Set mode to 'direct' and verify open access

**Expected Results:**
  - When mode='disabled': Booking rejected unless using valid booking link code
  - When mode='promoter_only' without ref: Error 'Table booking requires a promoter referral link'
  - When mode='promoter_only' with valid ref: Booking proceeds normally
  - When mode='direct': Anyone can book without restrictions
  - Booking link code bypasses mode restrictions (always allowed)
  - Proper error messages guide users on requirements

#### 4.11. Minimum age validation on profile

**File:** `tests/edge-cases/minimum-age-validation.spec.ts`

**Steps:**
  1. Complete profile form with date_of_birth that is less than 18 years ago
  2. Attempt to save profile
  3. Try birth date exactly 18 years ago
  4. Try birth date 17 years 364 days ago

**Expected Results:**
  - Users under 18 years old are rejected
  - Error message: 'You must be at least 18 years old'
  - Date picker max date is set to 18 years ago from current date
  - Edge case of exactly 18 years is accepted
  - One day under 18 years is rejected
  - Validation happens on both client and server side

#### 4.12. Instagram handle formatting

**File:** `tests/edge-cases/instagram-handle-formatting.spec.ts`

**Steps:**
  1. Enter Instagram handle with @ symbol: '@username'
  2. Enter without @: 'username'
  3. Enter with multiple @: '@@username'
  4. Enter with spaces: '@ user name'
  5. Submit profile/join form

**Expected Results:**
  - @ symbol is automatically stripped before saving
  - '@username' becomes 'username' in database
  - Multiple @ symbols are removed
  - Spaces are handled appropriately (may be trimmed)
  - Display shows @ prefix but storage does not include it
  - Consistent handling across profile and join flows
