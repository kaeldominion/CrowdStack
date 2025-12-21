# Login Flow Documentation

## Current Architecture

### **Web App (localhost:3006 / crowdstack.app)**
- **Purpose:** Marketing + Attendee-facing experience
- **Login:** `/login` on web app (3006)
- **Who uses it:** Attendees, people browsing the site
- **After login:** Redirects to `/me` (attendee dashboard) OR to app (3007) if B2B role

### **App (localhost:3007 / app.crowdstack.app)**
- **Purpose:** B2B dashboards + Door scanner
- **Login:** `/login` on app (3007)
- **Who uses it:** Venue admins, organizers, promoters, door staff
- **After login:** Redirects based on role (venue, organizer, promoter, door, or admin)

## Login Flow Logic

### **Localhost (Development)**

#### Scenario 1: Attendee logs in on web app
1. User visits `localhost:3006` (landing page)
2. Clicks "Sign In" → goes to `localhost:3006/login`
3. Logs in with email/password or magic link
4. **If attendee role:** Redirects to `localhost:3006/me`
5. **If B2B role:** Redirects to `localhost:3007/admin` (but needs to login again because cookies aren't shared)

#### Scenario 2: B2B user tries to access app
1. User visits `localhost:3007/admin` (or any app route)
2. Not authenticated → middleware redirects to `localhost:3007/login`
3. Logs in on app side (sets cookies on 3007)
4. Redirects to `/admin` or role-specific dashboard
5. ✅ Works because cookies are on correct domain

#### Scenario 3: Attendee clicks "Go to Admin Dashboard"
1. User is on `localhost:3006/me`
2. Clicks "Go to Admin Dashboard" → goes to `localhost:3007/login?redirect=/admin`
3. Logs in on app side (3007)
4. Redirects to `/admin`
5. ✅ Works because cookies are set on correct domain

### **Production (crowdstack.app / app.crowdstack.app)**

#### Scenario 1: Attendee logs in
1. User visits `crowdstack.app` (landing page)
2. Clicks "Sign In" → goes to `crowdstack.app/login`
3. Logs in → redirects to `crowdstack.app/me`
4. ✅ Works - same domain

#### Scenario 2: B2B user accesses app
1. User visits `app.crowdstack.app/admin`
2. Not authenticated → redirects to `app.crowdstack.app/login`
3. Logs in → redirects to `/admin`
4. ✅ Works - same domain

#### Scenario 3: Cross-domain (web → app)
1. User on `crowdstack.app/me` clicks "Go to Admin Dashboard"
2. Goes to `app.crowdstack.app/login?redirect=/admin`
3. Logs in → cookies set on `app.crowdstack.app`
4. Redirects to `/admin`
5. ✅ Works - cookies are domain-specific (app.crowdstack.app)

## Key Points

1. **Web app login (3006):** For attendees and general site visitors
2. **App login (3007):** For B2B users accessing dashboards
3. **Cookies are domain-specific:** 
   - `localhost:3006` cookies ≠ `localhost:3007` cookies (different origins)
   - `crowdstack.app` cookies ≠ `app.crowdstack.app` cookies (different subdomains)
4. **Solution:** Each app has its own login so cookies are set on the correct domain

## Why the landing page login goes to 3006

The landing page (`localhost:3006`) is the **marketing/attendee site**. The "Sign In" link there is for:
- Attendees who want to see their dashboard
- People browsing who want to log in

If you're a B2B user, you would:
- Go directly to `localhost:3007` and log in there
- Or click "Go to Admin Dashboard" from `/me` which takes you to app login

This is correct behavior - the web app login is for the web app audience (attendees).



