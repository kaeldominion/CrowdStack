# Venue Pulse Test Plan

## Application Overview

Venue Pulse is the feedback collection and management system for venues. It consists of two main parts: (1) Venue Pulse Dashboard at /app/venue/feedback where venue admins can view feedback stats, rating distribution, manage feedback items (resolve/unresolve), add internal notes, view attendee history, and send manual feedback requests; (2) Feedback Submission Form at /feedback/[eventId]/[registrationId]?token=... where attendees submit star ratings (1-5), with positive ratings (4-5) allowing optional comments, and negative ratings (1-3) requiring category selection and comment.

## Test Scenarios

### 1. Venue Pulse Dashboard Access

**Seed:** `tests/seed.spec.ts`

#### 1.1. should display empty state when no feedback exists

**File:** `tests/venue-pulse/empty-state.spec.ts`

**Steps:**
  1. Login as venue admin
  2. Navigate to /app/venue/feedback
  3. Verify empty state message is displayed

**Expected Results:**
  - Page displays 'No feedback data available' message
  - No error states visible (aside from expected no-data state)

#### 1.2. should display Venue Pulse in sidebar navigation

**File:** `tests/venue-pulse/sidebar-navigation.spec.ts`

**Steps:**
  1. Login as venue admin
  2. Navigate to venue dashboard
  3. Look for Venue Pulse link in sidebar under ADMIN section

**Expected Results:**
  - Venue Pulse link is visible in sidebar
  - Link points to /app/venue/feedback

#### 1.3. should require venue admin authentication

**File:** `tests/venue-pulse/authentication-required.spec.ts`

**Steps:**
  1. Navigate to /app/venue/feedback without authentication
  2. Verify redirect or access denied

**Expected Results:**
  - User is redirected to login page or shown access denied

### 2. Venue Pulse Dashboard Stats

**Seed:** `tests/seed.spec.ts`

#### 2.1. should display feedback statistics cards

**File:** `tests/venue-pulse/stats-display.spec.ts`

**Steps:**
  1. Login as venue admin with feedback data
  2. Navigate to /app/venue/feedback
  3. Verify statistics cards are visible

**Expected Results:**
  - Average rating card is displayed
  - Total feedback count is displayed
  - Unresolved count is displayed
  - Resolved count is displayed

#### 2.2. should display rating distribution chart

**File:** `tests/venue-pulse/rating-distribution.spec.ts`

**Steps:**
  1. Login as venue admin with feedback data
  2. Navigate to /app/venue/feedback
  3. Verify rating distribution chart is visible

**Expected Results:**
  - Rating distribution chart shows bars for 1-5 stars
  - Chart percentages add up correctly

### 3. Feedback List Management

**Seed:** `tests/seed.spec.ts`

#### 3.1. should display feedback list with tabs

**File:** `tests/venue-pulse/feedback-tabs.spec.ts`

**Steps:**
  1. Login as venue admin with feedback data
  2. Navigate to /app/venue/feedback
  3. Verify tabs are visible: All, Unresolved, Resolved

**Expected Results:**
  - All tab shows all feedback items
  - Unresolved tab filters to unresolved items
  - Resolved tab filters to resolved items

#### 3.2. should mark feedback as resolved

**File:** `tests/venue-pulse/mark-resolved.spec.ts`

**Steps:**
  1. Login as venue admin with unresolved feedback
  2. Navigate to /app/venue/feedback
  3. Click resolve button on an unresolved item
  4. Verify item moves to resolved

**Expected Results:**
  - Feedback item is marked as resolved
  - Resolved count increases by 1
  - Unresolved count decreases by 1

#### 3.3. should mark feedback as unresolved

**File:** `tests/venue-pulse/mark-unresolved.spec.ts`

**Steps:**
  1. Login as venue admin with resolved feedback
  2. Navigate to /app/venue/feedback
  3. Click on Resolved tab
  4. Click unresolve button on a resolved item

**Expected Results:**
  - Feedback item is marked as unresolved
  - Item appears in Unresolved tab

#### 3.4. should add internal notes to feedback

**File:** `tests/venue-pulse/internal-notes.spec.ts`

**Steps:**
  1. Login as venue admin with feedback data
  2. Navigate to /app/venue/feedback
  3. Click on a feedback item to expand
  4. Add an internal note
  5. Save the note

**Expected Results:**
  - Note is saved successfully
  - Note appears in the feedback item details
  - Note is only visible to venue admins

### 4. Attendee Details

**Seed:** `tests/seed.spec.ts`

#### 4.1. should display attendee details modal

**File:** `tests/venue-pulse/attendee-details.spec.ts`

**Steps:**
  1. Login as venue admin with feedback data
  2. Navigate to /app/venue/feedback
  3. Click on attendee name in feedback item

**Expected Results:**
  - Modal opens with attendee details
  - Shows attendee contact info
  - Shows feedback history for this attendee

#### 4.2. should show attendee feedback history

**File:** `tests/venue-pulse/attendee-history.spec.ts`

**Steps:**
  1. Login as venue admin
  2. Open attendee details modal
  3. View past feedback from same attendee

**Expected Results:**
  - All past feedback from attendee is listed
  - Shows rating and date for each feedback

### 5. Manual Feedback Request

**Seed:** `tests/seed.spec.ts`

#### 5.1. should send manual feedback request

**File:** `tests/venue-pulse/send-feedback-request.spec.ts`

**Steps:**
  1. Login as venue admin
  2. Navigate to /app/venue/feedback
  3. Click Send Feedback Request button
  4. Select event and attendee
  5. Send the request

**Expected Results:**
  - Feedback request is sent successfully
  - Success message is displayed

### 6. Feedback Submission Form

**Seed:** `tests/seed.spec.ts`

#### 6.1. should display feedback form with valid token

**File:** `tests/venue-pulse/feedback-form-display.spec.ts`

**Steps:**
  1. Navigate to /feedback/[eventId]/[registrationId]?token=[validToken]
  2. Verify form elements are visible

**Expected Results:**
  - Venue PULSE branding is displayed
  - Star rating selector (1-5) is visible
  - Form is ready for submission

#### 6.2. should submit positive feedback (4-5 stars)

**File:** `tests/venue-pulse/submit-positive-feedback.spec.ts`

**Steps:**
  1. Navigate to feedback form with valid token
  2. Select 4 or 5 stars
  3. Optionally add a comment
  4. Submit the feedback

**Expected Results:**
  - Success message is displayed
  - User sees thank you page
  - Feedback is recorded in system

#### 6.3. should submit negative feedback (1-3 stars) with category

**File:** `tests/venue-pulse/submit-negative-feedback.spec.ts`

**Steps:**
  1. Navigate to feedback form with valid token
  2. Select 1, 2, or 3 stars
  3. Category selection appears
  4. Select a category
  5. Add required comment
  6. Submit the feedback

**Expected Results:**
  - Category selection is required for low ratings
  - Comment field appears
  - Feedback is submitted successfully

#### 6.4. should handle invalid token

**File:** `tests/venue-pulse/invalid-token.spec.ts`

**Steps:**
  1. Navigate to /feedback/[eventId]/[registrationId]?token=invalid
  2. Verify error handling

**Expected Results:**
  - Error message is displayed
  - Form is not accessible

#### 6.5. should handle expired token

**File:** `tests/venue-pulse/expired-token.spec.ts`

**Steps:**
  1. Navigate to feedback form with expired token
  2. Verify error handling

**Expected Results:**
  - Expired token message is displayed
  - Form is not accessible

#### 6.6. should handle already submitted feedback

**File:** `tests/venue-pulse/already-submitted.spec.ts`

**Steps:**
  1. Navigate to feedback form for already submitted feedback
  2. Verify handling

**Expected Results:**
  - Message indicates feedback already submitted
  - Cannot submit again

### 7. Edge Cases and Error Handling

**Seed:** `tests/seed.spec.ts`

#### 7.1. should handle invalid event ID in feedback URL

**File:** `tests/venue-pulse/invalid-event-id.spec.ts`

**Steps:**
  1. Navigate to /feedback/invalid-event-id/some-registration?token=abc
  2. Verify error handling

**Expected Results:**
  - Error page or message is displayed
  - No crash or unhandled exception

#### 7.2. should handle invalid registration ID in feedback URL

**File:** `tests/venue-pulse/invalid-registration-id.spec.ts`

**Steps:**
  1. Navigate to /feedback/some-event/invalid-registration?token=abc
  2. Verify error handling

**Expected Results:**
  - Error page or message is displayed
  - No crash or unhandled exception

#### 7.3. should handle missing token parameter

**File:** `tests/venue-pulse/missing-token.spec.ts`

**Steps:**
  1. Navigate to /feedback/[eventId]/[registrationId] without token
  2. Verify error handling

**Expected Results:**
  - Error message about missing token
  - Form is not accessible
