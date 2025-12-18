# Magic Link Troubleshooting Guide

## Issue: `auth_failed` Error

If you're seeing `http://localhost:3006/login?error=auth_failed` when clicking a magic link, follow these steps:

### 1. Check Console Logs

The callback route now logs detailed debugging information. Check your terminal/server logs for:

```
[Auth Callback] Available cookies: [...]
[Auth Callback] Looking for PKCE cookies: [...]
[Auth Callback] Error exchanging code for session: ...
```

This will tell us:
- What cookies are available when the callback runs
- What the actual error is
- Whether PKCE cookies are present

### 2. Verify Supabase Auth Configuration

**Critical**: Check your Supabase Dashboard → Authentication → URL Configuration:

1. **Site URL**: Should be `http://localhost:3006` for local dev
2. **Redirect URLs**: Must include:
   ```
   http://localhost:3006/**
   http://localhost:3006/api/auth/callback
   http://localhost:3006/auth/magic
   ```

### 3. PKCE Code Verifier Issue

PKCE magic links **must be opened in the same browser** that requested them. The code verifier is stored in browser cookies.

**Common causes:**
- Opening magic link in a different browser or incognito window
- Cookies cleared between requesting and clicking the link
- Browser blocking cookies for localhost

**Solutions:**
1. **Request and click in the same browser tab**
2. **Don't clear cookies** between requesting and clicking
3. **Check browser cookie settings** - ensure localhost cookies are allowed
4. **Use password login** if PKCE continues to fail

### 4. Email Redirect URL

The magic link email contains a redirect URL. Verify it matches your setup:

- **Should be**: `http://localhost:3006/api/auth/callback?code=...`
- **Not**: `http://localhost:3007/api/auth/callback` (old port)

### 5. Check Browser Cookies

Open browser DevTools → Application → Cookies → `http://localhost:3006`

Look for cookies containing:
- `code-verifier`
- `pkce-code-verifier`
- Supabase auth cookies (starting with `sb-`)

If these are missing when you click the magic link, that's the issue.

### 6. Test Flow

1. **Clear all localhost cookies**
2. **Request magic link** from `http://localhost:3006/login`
3. **Stay in the same browser tab**
4. **Click the magic link from email immediately**
5. **Check console logs** for cookie information

### 7. Alternative: Use Password Login

If magic links continue to fail due to PKCE issues, use password login instead:
- Click "Use password instead" on the login page
- This bypasses PKCE entirely

### 8. Supabase Auth Settings

Verify in Supabase Dashboard:
- **Email signups**: Enabled
- **Magic link**: Enabled
- **Email templates**: Using default (or custom configured correctly)

## Debugging Steps

1. **Enable verbose logging**: Check terminal where Next.js dev server is running
2. **Check Network tab**: See what request is made when clicking magic link
3. **Check cookies**: Use browser DevTools to inspect cookies
4. **Try password login**: Verify basic auth works

## Common Error Messages

### "PKCE code verifier not found"
- **Cause**: Cookie not available when callback runs
- **Fix**: Ensure same browser, cookies enabled, don't clear between request/click

### "auth_failed"
- **Cause**: Generic auth error
- **Fix**: Check console logs for specific error details

### "Invalid code"
- **Cause**: Code already used or expired
- **Fix**: Request a new magic link

## Still Having Issues?

1. Check the server logs for detailed error messages
2. Verify Supabase project is active and accessible
3. Confirm environment variables are set correctly
4. Try password login to verify basic auth works
5. Check if user exists in Supabase Auth (if signups are disabled)

