# CrowdStack Unified Dashboard - Performance Optimization Test Plan

## Application Overview

The CrowdStack Unified Dashboard is a centralized interface for users with multiple roles (venue admin, event organizer, promoter, DJ). The dashboard was recently optimized to reduce API calls by consolidating multiple endpoints into a single `/api/dashboard/unified` request. This test plan covers functional verification, performance validation, role-based access, real-time polling behavior, caching mechanisms, and error handling scenarios.

## Test Scenarios

### 1. Unified API Loading & Performance

**Seed:** `tests/seed/dashboard-setup.spec.ts`

#### 1.1. Single API request on initial dashboard load

**File:** `tests/unified-dashboard/api-consolidation.spec.ts`

**Steps:**
  1. Navigate to http://localhost:3000/login
  2. Log in with credentials for a user who has ALL roles (venue_admin, event_organizer, promoter, dj)
  3. Open browser DevTools Network tab and clear network log
  4. Navigate to /app/organizer (or any dashboard route)
  5. Wait for dashboard to fully load

**Expected Results:**
  - Network log shows exactly ONE request to /api/dashboard/unified
  - No separate requests to /api/organizer/dashboard-stats, /api/venue/dashboard-stats, /api/promoter/dashboard-stats, or /api/dj/dashboard-stats
  - Dashboard displays all role-specific sections simultaneously
  - Total network requests reduced compared to legacy implementation

#### 1.2. Dashboard loads within acceptable time

**File:** `tests/unified-dashboard/performance-metrics.spec.ts`

**Steps:**
  1. Log in as a multi-role user (has 2+ roles)
  2. Clear browser cache
  3. Start performance measurement
  4. Navigate to /app/venue
  5. Measure time until all skeleton loaders disappear and content is visible

**Expected Results:**
  - Dashboard completes loading within 2 seconds on good network conditions
  - /api/dashboard/unified response time is under 1.5 seconds
  - All sections render without flickering or layout shifts
  - Page is interactive (not blocking) during data load

#### 1.3. React Query cache prevents redundant API calls

**File:** `tests/unified-dashboard/react-query-caching.spec.ts`

**Steps:**
  1. Log in as any user with dashboard access
  2. Navigate to /app/organizer
  3. Wait for dashboard to fully load
  4. Open Network tab in DevTools and clear log
  5. Navigate away to another page (e.g., /app/organizer/events)
  6. Navigate back to /app/organizer within 60 seconds (staleTime window)
  7. Observe network activity

**Expected Results:**
  - NO new request to /api/dashboard/unified is made when returning to dashboard
  - Dashboard data appears instantly from cache
  - All sections show previously loaded data
  - Loading skeletons do NOT appear on cached load

#### 1.4. Cache invalidation after staleTime expires

**File:** `tests/unified-dashboard/cache-expiration.spec.ts`

**Steps:**
  1. Log in and navigate to /app/organizer
  2. Wait for dashboard to load completely
  3. Navigate to a different page
  4. Wait for 65 seconds (exceeds 60-second staleTime)
  5. Clear Network log in DevTools
  6. Navigate back to /app/organizer
  7. Observe network activity

**Expected Results:**
  - A fresh request to /api/dashboard/unified is made after staleTime expires
  - Dashboard shows loading state briefly before displaying updated data
  - Response is cached again with new staleTime window
  - Data refreshes to show any changes that occurred

### 2. Role-Based Dashboard Sections

**Seed:** `tests/seed/dashboard-setup.spec.ts`

#### 2.1. Venue admin section displays for venue_admin role

**File:** `tests/unified-dashboard/role-venue-admin.spec.ts`

**Steps:**
  1. Log in as a user with ONLY venue_admin role
  2. Navigate to /app/venue
  3. Wait for dashboard to load

**Expected Results:**
  - Venue admin section is visible with venue branding/header
  - VenueSwitcher component appears if user manages multiple venues
  - Venue stats cards show: Total Events, This Month, Check-ins, Repeat Rate
  - Attendee Database card displays with guest statistics
  - Public Profile card shows venue image/logo and profile link (if configured)
  - No organizer, promoter, or DJ sections are visible
  - Create Event button is present in header

#### 2.2. Event organizer section displays for event_organizer role

**File:** `tests/unified-dashboard/role-event-organizer.spec.ts`

**Steps:**
  1. Log in as a user with ONLY event_organizer role
  2. Navigate to /app/organizer
  3. Wait for dashboard to load

**Expected Results:**
  - Event Management section header is visible
  - Organizer stats cards show: Events, Registrations, Check-ins, Promoters
  - Registrations vs Check-ins chart appears if data exists
  - Conversion Rate and Total Revenue cards are displayed
  - Upcoming Events list shows next events (if any exist)
  - Create Event button is present in header
  - No venue, promoter, or DJ sections are visible

#### 2.3. Promoter section displays for promoter role

**File:** `tests/unified-dashboard/role-promoter.spec.ts`

**Steps:**
  1. Log in as a user with ONLY promoter role
  2. Navigate to /app/promoter
  3. Wait for dashboard to load

**Expected Results:**
  - Promoter section header Your Events is visible
  - Public Profile card displays with QR code (if profile is public)
  - Profile link is copyable with copy button
  - Stats cards show: Total Events, Registrations, Check-ins, Earnings
  - Upcoming Events list shows assigned events with referral links
  - Copy button next to each event's referral link works
  - Find Events button appears in header
  - No venue, organizer, or DJ sections are visible

#### 2.4. DJ section displays for dj role

**File:** `tests/unified-dashboard/role-dj.spec.ts`

**Steps:**
  1. Log in as a user with ONLY dj role
  2. Navigate to /app/dj
  3. Wait for dashboard to load

**Expected Results:**
  - DJ Dashboard section header is visible
  - DJProfileSelector component appears (for switching between DJ profiles)
  - Public Profile card shows link to DJ public page
  - Stats cards show: Published Mixes, Total Plays, Followers, Upcoming Events
  - Earnings card shows total earnings from promoter activity
  - Quick Actions grid shows: Browse Gigs, QR Codes, Edit Profile, Your Events
  - Edit Profile button appears in header
  - No venue, organizer, or promoter sections are visible

#### 2.5. Multi-role user sees all applicable sections

**File:** `tests/unified-dashboard/role-multi-role.spec.ts`

**Steps:**
  1. Log in as a user with venue_admin AND event_organizer roles
  2. Navigate to /app/venue
  3. Wait for dashboard to load
  4. Scroll through entire page

**Expected Results:**
  - Both Venue admin section AND Event Management section are visible
  - Sections are clearly separated with distinct headers
  - Page description says Overview across all your roles
  - All stats for both roles load and display correctly
  - No errors or missing data in either section
  - Dashboard is accessible from both /app/venue and /app/organizer routes

### 3. Live Events Section & Real-Time Polling

**Seed:** `tests/seed/dashboard-setup.spec.ts`

#### 3.1. Live Events section appears when events are live

**File:** `tests/unified-dashboard/live-events-display.spec.ts`

**Steps:**
  1. Set up test data: Create an event with start_time in the past and end_time in the future, status is published
  2. Log in as the organizer of that event
  3. Navigate to /app/organizer
  4. Wait for dashboard to load

**Expected Results:**
  - Live Now section appears at the top of dashboard with red pulsing indicator
  - Live event card shows event name, venue, registration count, check-in count
  - Progress bar displays capacity percentage (if max_guestlist_size is set)
  - Live Control and Scanner links are present
  - Event card has red left border indicating live status
  - Section header shows count: X events happening now

#### 3.2. Live Events section hidden when no events are live

**File:** `tests/unified-dashboard/live-events-hidden.spec.ts`

**Steps:**
  1. Log in as a user with events that are all upcoming or past (none currently live)
  2. Navigate to dashboard
  3. Wait for loading to complete

**Expected Results:**
  - Live Now section does NOT appear anywhere on the page
  - Dashboard starts with role-specific sections (Venue/Organizer/Promoter/DJ)
  - No red pulsing indicators or live event cards visible
  - Page layout is clean without empty live section placeholder

#### 3.3. Polling activates when live events exist

**File:** `tests/unified-dashboard/live-events-polling-enabled.spec.ts`

**Steps:**
  1. Set up test data: Create a live event (currently happening)
  2. Log in as user with access to that event
  3. Navigate to dashboard and wait for initial load
  4. Open Network tab and monitor requests
  5. Wait for 35 seconds while observing network activity

**Expected Results:**
  - After approximately 30 seconds, a request to /api/{role}/events/live endpoint is made
  - Polling continues every 30 seconds while dashboard is open
  - Live event data updates automatically without page refresh
  - Check-in counts and registration counts update in real-time
  - No full dashboard reload occurs, only live events data refreshes

#### 3.4. Polling disabled when no live events exist

**File:** `tests/unified-dashboard/live-events-polling-disabled.spec.ts`

**Steps:**
  1. Log in as a user with NO live events (only upcoming/past events)
  2. Navigate to dashboard
  3. Open Network tab and clear log
  4. Wait for 2 minutes while monitoring network activity

**Expected Results:**
  - NO polling requests to /api/{role}/events/live are made
  - Only the initial /api/dashboard/unified request occurs
  - Network remains idle after initial load (no 30-second interval requests)
  - Dashboard remains responsive without unnecessary background requests
  - Battery/CPU usage is minimal

### 4. Loading States & Skeleton Loaders

**Seed:** `tests/seed/dashboard-setup.spec.ts`

#### 4.1. Skeleton loaders display during initial load

**File:** `tests/unified-dashboard/loading-skeletons.spec.ts`

**Steps:**
  1. Clear browser cache and React Query cache
  2. Log in as a multi-role user
  3. Navigate to /app/organizer
  4. Immediately observe the dashboard during load

**Expected Results:**
  - Dashboard title and description appear immediately
  - Skeleton placeholder sections appear for each role (pulsing animation)
  - Each skeleton shows: header placeholder, 4 stat card placeholders
  - Skeletons match the layout of actual content (proper spacing)
  - No content flashing or layout shift occurs
  - Once data loads, skeletons are replaced smoothly with actual content

### 5. Error Handling & Recovery

**Seed:** `tests/seed/dashboard-setup.spec.ts`

#### 5.1. API failure shows error state with retry option

**File:** `tests/unified-dashboard/error-handling.spec.ts`

**Steps:**
  1. Set up test to simulate /api/dashboard/unified returning 500 error
  2. Log in and navigate to /app/organizer
  3. Wait for error state to appear

**Expected Results:**
  - Dashboard title and header remain visible
  - Error card appears with message Failed to load dashboard data
  - Secondary message says Please try refreshing the page
  - Refresh button is prominently displayed
  - No loading skeletons remain visible
  - No partial or broken data is shown

#### 5.2. Refresh button reloads dashboard data

**File:** `tests/unified-dashboard/error-recovery.spec.ts`

**Steps:**
  1. Trigger API error state on dashboard
  2. Verify error message and Refresh button appear
  3. Fix the API (stop simulating error)
  4. Click the Refresh button

**Expected Results:**
  - Clicking Refresh button reloads the entire page (window.location.reload())
  - Fresh API request is made to /api/dashboard/unified
  - Dashboard loads successfully with all data
  - Error state is cleared and normal content appears
  - User can interact with dashboard normally after recovery

### 6. Venue Switching & Cache Invalidation

**Seed:** `tests/seed/dashboard-setup.spec.ts`

#### 6.1. VenueSwitcher appears for multi-venue admins

**File:** `tests/unified-dashboard/venue-switcher-display.spec.ts`

**Steps:**
  1. Create user with venue_admin access to 2+ venues
  2. Log in and navigate to /app/venue
  3. Wait for dashboard to load

**Expected Results:**
  - VenueSwitcher dropdown appears in the venue header section
  - Current venue name is displayed prominently
  - Dropdown shows all venues the user has access to
  - Venue branding (logo/cover image) displays if configured
  - Switcher is easily accessible and clearly labeled

#### 6.2. Switching venue triggers data refresh

**File:** `tests/unified-dashboard/venue-switch-refresh.spec.ts`

**Steps:**
  1. Log in as admin of multiple venues
  2. Navigate to /app/venue (Venue A loads)
  3. Note the stats displayed (events, check-ins, etc.)
  4. Open Network tab and clear log
  5. Use VenueSwitcher to select Venue B
  6. Observe network activity and data changes

**Expected Results:**
  - Selecting new venue triggers fresh API request to /api/dashboard/unified
  - Request includes updated venueVersion parameter to bust cache
  - All venue-specific stats update to reflect Venue B data
  - Attendee stats, events, and venue info change appropriately
  - No stale Venue A data persists after switch
  - Loading state appears briefly during refresh

### 7. Dashboard Content & Data Accuracy

**Seed:** `tests/seed/dashboard-setup.spec.ts`

#### 7.1. Venue stats display correct metrics

**File:** `tests/unified-dashboard/venue-stats-accuracy.spec.ts`

**Steps:**
  1. Set up test venue with known data: 10 total events, 3 this month, 150 check-ins, 30% repeat rate
  2. Log in as admin of that venue
  3. Navigate to /app/venue

**Expected Results:**
  - Total Events stat shows: 10
  - This Month stat shows: 3
  - Check-ins stat shows: 150
  - Repeat Rate stat shows: 30%
  - Average Attendance shows calculated average per event
  - Top Performing Event displays event with most registrations/check-ins
  - All numbers match database exactly

#### 7.2. Empty state messages appear when no data exists

**File:** `tests/unified-dashboard/empty-states.spec.ts`

**Steps:**
  1. Create new organizer account with no events created yet
  2. Log in and navigate to /app/organizer

**Expected Results:**
  - No Upcoming Events message appears with calendar icon
  - Message says Create your first event to start managing your business
  - Create Event button is prominently displayed in empty state
  - All stat cards show 0 values (not errors or blanks)
  - Charts are hidden when no data exists
  - UI is clean and encouraging, not confusing or broken-looking

### 8. Interactive Elements & Navigation

**Seed:** `tests/seed/dashboard-setup.spec.ts`

#### 8.1. Create Event buttons navigate correctly

**File:** `tests/unified-dashboard/create-event-buttons.spec.ts`

**Steps:**
  1. Log in as venue_admin
  2. Navigate to /app/venue
  3. Click Create Event button in header

**Expected Results:**
  - Clicking button navigates to /app/venue/events/new
  - Event creation form loads
  - For organizer role, button navigates to /app/organizer/events/new
  - Button is clearly visible and accessible in dashboard header

#### 8.2. Profile links are copyable with feedback

**File:** `tests/unified-dashboard/profile-link-copy.spec.ts`

**Steps:**
  1. Log in as promoter with public profile configured
  2. Navigate to /app/promoter
  3. Find Public Profile card with link and copy button
  4. Click copy button

**Expected Results:**
  - Clicking copy button copies full URL to clipboard
  - Copy icon changes to checkmark icon briefly
  - Visual feedback shows copy was successful (icon change for 2 seconds)
  - Copied link is full URL like https://crowdstack.app/p/promoter-slug
  - Same functionality works for venue profile link copy

### 9. Responsive Design & Accessibility

**Seed:** `tests/seed/dashboard-setup.spec.ts`

#### 9.1. Dashboard is responsive on mobile viewport

**File:** `tests/unified-dashboard/responsive-mobile.spec.ts`

**Steps:**
  1. Set browser viewport to mobile size (375x667)
  2. Log in and navigate to dashboard
  3. Scroll through all sections

**Expected Results:**
  - All content is readable and accessible on small screen
  - Stat cards stack vertically (grid becomes single column)
  - No horizontal scrolling required
  - Touch targets are adequately sized for mobile interaction
  - VenueSwitcher works on mobile
  - Event lists are readable and navigable on mobile

#### 9.2. Keyboard navigation works throughout dashboard

**File:** `tests/unified-dashboard/keyboard-navigation.spec.ts`

**Steps:**
  1. Navigate to dashboard
  2. Use Tab key to navigate through interactive elements
  3. Test Enter/Space to activate buttons and links

**Expected Results:**
  - All interactive elements are keyboard accessible
  - Focus indicators are visible on buttons, links, dropdowns
  - Tab order is logical (top to bottom, left to right)
  - Enter key activates buttons and links
  - VenueSwitcher can be operated with keyboard
  - Modal can be opened and closed with keyboard
