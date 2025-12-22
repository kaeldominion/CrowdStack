# Supabase Email Templates Setup

To enable OTP code verification (especially for iOS users) and add CrowdStack branding, you need to customize the email templates in Supabase.

## How to Update Email Templates

1. Go to your **Supabase Dashboard**
2. Navigate to **Authentication** → **Email Templates**
3. Select each template type and replace with the branded versions below

---

## Magic Link / OTP Template

**Subject:** `Sign in to CrowdStack`

**Body:**

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sign in to CrowdStack</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0B0D10; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #0B0D10;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 480px; margin: 0 auto; background-color: #12151A; border-radius: 16px; border: 1px solid #2A2F3A;">
          
          <!-- Logo Header -->
          <tr>
            <td style="padding: 32px 32px 24px; text-align: center; border-bottom: 1px solid #2A2F3A;">
              <img src="https://crowdstack.app/logo.png" alt="CrowdStack" width="180" style="display: block; margin: 0 auto;" />
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 32px;">
              <h1 style="margin: 0 0 16px; font-size: 24px; font-weight: 700; color: #FFFFFF; text-align: center;">
                Sign in to CrowdStack
              </h1>
              
              <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.6; color: #A0A0A0; text-align: center;">
                Click the button below to sign in to your account. This link expires in 24 hours.
              </p>
              
              <!-- Magic Link Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="text-align: center; padding: 8px 0 24px;">
                    <a href="{{ .ConfirmationURL }}" target="_blank" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #3B82F6 0%, #2563EB 100%); color: #FFFFFF; font-size: 16px; font-weight: 600; text-decoration: none; border-radius: 8px;">
                      Sign In
                    </a>
                  </td>
                </tr>
              </table>
              
              <!-- Divider -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="padding: 16px 0;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td style="border-bottom: 1px solid #2A2F3A; height: 1px; width: 45%;"></td>
                        <td style="text-align: center; color: #6B7280; font-size: 12px; padding: 0 12px;">OR</td>
                        <td style="border-bottom: 1px solid #2A2F3A; height: 1px; width: 45%;"></td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- OTP Code Section -->
              <div style="background-color: #1A1D24; border-radius: 12px; padding: 24px; margin: 16px 0; border: 1px solid #2A2F3A;">
                <p style="margin: 0 0 12px; font-size: 14px; color: #A0A0A0; text-align: center;">
                  📱 On mobile? Enter this code instead:
                </p>
                <p style="margin: 0; font-size: 36px; font-weight: 700; color: #FFFFFF; text-align: center; letter-spacing: 0.3em; font-family: 'SF Mono', Monaco, 'Courier New', monospace;">
                  {{ .Token }}
                </p>
              </div>
              
              <p style="margin: 24px 0 0; font-size: 13px; line-height: 1.5; color: #6B7280; text-align: center;">
                If you didn't request this email, you can safely ignore it.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; border-top: 1px solid #2A2F3A; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #6B7280;">
                © 2025 CrowdStack. All rights reserved.
              </p>
              <p style="margin: 8px 0 0; font-size: 12px; color: #4B5563;">
                <a href="https://crowdstack.app" style="color: #3B82F6; text-decoration: none;">crowdstack.app</a>
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## Confirm Signup Template

**Subject:** `Confirm your CrowdStack account`

**Body:**

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirm your CrowdStack account</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0B0D10; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #0B0D10;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 480px; margin: 0 auto; background-color: #12151A; border-radius: 16px; border: 1px solid #2A2F3A;">
          
          <!-- Logo Header -->
          <tr>
            <td style="padding: 32px 32px 24px; text-align: center; border-bottom: 1px solid #2A2F3A;">
              <img src="https://crowdstack.app/logo.png" alt="CrowdStack" width="180" style="display: block; margin: 0 auto;" />
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 32px;">
              <h1 style="margin: 0 0 16px; font-size: 24px; font-weight: 700; color: #FFFFFF; text-align: center;">
                Welcome to CrowdStack! 🎉
              </h1>
              
              <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.6; color: #A0A0A0; text-align: center;">
                Thanks for signing up! Click the button below to confirm your email address.
              </p>
              
              <!-- Confirm Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="text-align: center; padding: 8px 0 24px;">
                    <a href="{{ .ConfirmationURL }}" target="_blank" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #10B981 0%, #059669 100%); color: #FFFFFF; font-size: 16px; font-weight: 600; text-decoration: none; border-radius: 8px;">
                      Confirm Email
                    </a>
                  </td>
                </tr>
              </table>
              
              <!-- Divider -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="padding: 16px 0;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td style="border-bottom: 1px solid #2A2F3A; height: 1px; width: 45%;"></td>
                        <td style="text-align: center; color: #6B7280; font-size: 12px; padding: 0 12px;">OR</td>
                        <td style="border-bottom: 1px solid #2A2F3A; height: 1px; width: 45%;"></td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- OTP Code Section -->
              <div style="background-color: #1A1D24; border-radius: 12px; padding: 24px; margin: 16px 0; border: 1px solid #2A2F3A;">
                <p style="margin: 0 0 12px; font-size: 14px; color: #A0A0A0; text-align: center;">
                  📱 On mobile? Enter this code instead:
                </p>
                <p style="margin: 0; font-size: 36px; font-weight: 700; color: #FFFFFF; text-align: center; letter-spacing: 0.3em; font-family: 'SF Mono', Monaco, 'Courier New', monospace;">
                  {{ .Token }}
                </p>
              </div>
              
              <p style="margin: 24px 0 0; font-size: 13px; line-height: 1.5; color: #6B7280; text-align: center;">
                If you didn't create this account, you can safely ignore this email.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; border-top: 1px solid #2A2F3A; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #6B7280;">
                © 2025 CrowdStack. All rights reserved.
              </p>
              <p style="margin: 8px 0 0; font-size: 12px; color: #4B5563;">
                <a href="https://crowdstack.app" style="color: #3B82F6; text-decoration: none;">crowdstack.app</a>
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## Reset Password Template

**Subject:** `Reset your CrowdStack password`

**Body:**

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset your CrowdStack password</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0B0D10; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #0B0D10;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 480px; margin: 0 auto; background-color: #12151A; border-radius: 16px; border: 1px solid #2A2F3A;">
          
          <!-- Logo Header -->
          <tr>
            <td style="padding: 32px 32px 24px; text-align: center; border-bottom: 1px solid #2A2F3A;">
              <img src="https://crowdstack.app/logo.png" alt="CrowdStack" width="180" style="display: block; margin: 0 auto;" />
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 32px;">
              <h1 style="margin: 0 0 16px; font-size: 24px; font-weight: 700; color: #FFFFFF; text-align: center;">
                Reset Your Password
              </h1>
              
              <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.6; color: #A0A0A0; text-align: center;">
                We received a request to reset your password. Click the button below to choose a new password.
              </p>
              
              <!-- Reset Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="text-align: center; padding: 8px 0 24px;">
                    <a href="{{ .ConfirmationURL }}" target="_blank" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%); color: #FFFFFF; font-size: 16px; font-weight: 600; text-decoration: none; border-radius: 8px;">
                      Reset Password
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #6B7280; text-align: center;">
                This link will expire in 24 hours. If you didn't request a password reset, you can safely ignore this email.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; border-top: 1px solid #2A2F3A; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #6B7280;">
                © 2025 CrowdStack. All rights reserved.
              </p>
              <p style="margin: 8px 0 0; font-size: 12px; color: #4B5563;">
                <a href="https://crowdstack.app" style="color: #3B82F6; text-decoration: none;">crowdstack.app</a>
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## Invite User Template

**Subject:** `You're invited to join CrowdStack`

**Body:**

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You're invited to join CrowdStack</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0B0D10; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #0B0D10;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 480px; margin: 0 auto; background-color: #12151A; border-radius: 16px; border: 1px solid #2A2F3A;">
          
          <!-- Logo Header -->
          <tr>
            <td style="padding: 32px 32px 24px; text-align: center; border-bottom: 1px solid #2A2F3A;">
              <img src="https://crowdstack.app/logo.png" alt="CrowdStack" width="180" style="display: block; margin: 0 auto;" />
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 32px;">
              <h1 style="margin: 0 0 16px; font-size: 24px; font-weight: 700; color: #FFFFFF; text-align: center;">
                You're Invited! 🎉
              </h1>
              
              <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.6; color: #A0A0A0; text-align: center;">
                You've been invited to join CrowdStack. Click the button below to accept your invitation and set up your account.
              </p>
              
              <!-- Accept Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="text-align: center; padding: 8px 0 24px;">
                    <a href="{{ .ConfirmationURL }}" target="_blank" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%); color: #FFFFFF; font-size: 16px; font-weight: 600; text-decoration: none; border-radius: 8px;">
                      Accept Invitation
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #6B7280; text-align: center;">
                This invitation will expire in 7 days.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; border-top: 1px solid #2A2F3A; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #6B7280;">
                © 2025 CrowdStack. All rights reserved.
              </p>
              <p style="margin: 8px 0 0; font-size: 12px; color: #4B5563;">
                <a href="https://crowdstack.app" style="color: #3B82F6; text-decoration: none;">crowdstack.app</a>
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## Important Notes

1. **Logo Image**: The email templates reference `https://crowdstack.app/logo.png`. You have two options:
   - **Option A**: Go to `/admin/tools/brand-assets` and download the "Full Logo PNG (White)" - upload this to your CDN or Supabase Storage
   - **Option B**: Use an SVG file at `/logo.svg` (already in public folder) - note: some email clients don't support SVG
   
   Update the `src` URL in the templates to point to your hosted image.

2. **Template Variables**:
   - `{{ .ConfirmationURL }}` - The magic link/confirmation URL
   - `{{ .Token }}` - The 6-digit OTP code (for Magic Link/Confirm templates)
   - `{{ .TokenHash }}` - Token hash (alternative to Token)
   - `{{ .SiteURL }}` - Your site URL
   - `{{ .Email }}` - User's email address

3. **Apply to Both Projects**: 
   - **Beta**: https://supabase.com/dashboard/project/aiopjznxnoqgmmqowpxb/auth/templates
   - **Production**: https://supabase.com/dashboard/project/fvrjcyscwibrqpsviblx/auth/templates

4. **Test the Templates**: After updating, request a magic link and verify:
   - The email looks correct
   - The magic link button works
   - The 6-digit OTP code is visible
   - OTP verification works in the app

