# Supabase Email Templates Setup

To enable OTP code verification (especially for iOS users) and add CrowdStack branding, you need to customize the email templates in Supabase.

## ⚠️ Important: Logo Format

**Email clients (Gmail, Outlook, Yahoo) do NOT support SVG images!**

The templates below use the PNG version at `https://crowdstack.app/logos/crowdstack-icon-tricolor-on-transparent.png`.

This file exists in `apps/unified/public/logos/crowdstack-icon-tricolor-on-transparent.png`.

---

## How to Update Email Templates

1. Go to your **Supabase Dashboard**
2. Navigate to **Authentication** → **Email Templates**
3. Select each template type and replace with the branded versions below

---

## Magic Link / OTP Template

**Subject:** `Your CrowdStack verification code`

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
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 480px; margin: 0 auto; background-color: #12151A; border-radius: 20px; border: 1px solid rgba(168, 85, 247, 0.2); box-shadow: 0 4px 24px rgba(0, 0, 0, 0.4);">
          
          <!-- Logo Header -->
          <tr>
            <td style="padding: 40px 32px 24px; text-align: center;">
              <img src="https://crowdstack.app/logos/crowdstack-icon-tricolor-on-transparent.png" alt="CrowdStack" width="56" height="56" style="display: block; margin: 0 auto 16px;" />
              <p style="margin: 0; font-size: 18px; font-weight: 900; letter-spacing: -0.02em; color: #FFFFFF; text-transform: uppercase;">
                CROWDSTACK<span style="color: #A855F7;">.</span>
              </p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 0 32px 32px;">
              <h1 style="margin: 0 0 8px; font-size: 28px; font-weight: 800; color: #FFFFFF; text-align: center; letter-spacing: -0.02em;">
                Your Verification Code
              </h1>
              
              <p style="margin: 0 0 32px; font-size: 15px; line-height: 1.6; color: #9CA3AF; text-align: center;">
                Enter this code in the app to sign in. It expires in 24 hours.
              </p>
              
              <!-- OTP Code Section -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0 0 32px;">
                <tr>
                  <td style="background: linear-gradient(135deg, rgba(168, 85, 247, 0.15) 0%, rgba(59, 130, 246, 0.15) 100%); border-radius: 16px; padding: 32px 24px; border: 2px solid rgba(168, 85, 247, 0.4);">
                    <p style="margin: 0 0 8px; font-size: 10px; font-weight: 700; color: #A855F7; text-align: center; text-transform: uppercase; letter-spacing: 0.15em;">
                      Verification Code
                    </p>
                    <p style="margin: 0; font-size: 44px; font-weight: 700; color: #FFFFFF; text-align: center; letter-spacing: 0.4em; font-family: 'SF Mono', Monaco, 'Courier New', monospace; line-height: 1.2;">
                      {{ .Token }}
                    </p>
                  </td>
                </tr>
              </table>
              
              <!-- Divider -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="padding: 8px 0 24px;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td style="border-bottom: 1px solid #2A2F3A; height: 1px; width: 42%;"></td>
                        <td style="text-align: center; color: #4B5563; font-size: 11px; padding: 0 12px; text-transform: uppercase; letter-spacing: 0.1em;">or</td>
                        <td style="border-bottom: 1px solid #2A2F3A; height: 1px; width: 42%;"></td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- Magic Link Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="text-align: center; padding: 0;">
                    <a href="{{ .ConfirmationURL }}" target="_blank" style="display: inline-block; padding: 14px 28px; background: transparent; border: 1px solid #3B82F6; color: #3B82F6; font-size: 14px; font-weight: 600; text-decoration: none; border-radius: 10px; text-transform: uppercase; letter-spacing: 0.05em;">
                      Sign In with Link
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 24px 0 0; font-size: 13px; line-height: 1.5; color: #6B7280; text-align: center;">
                If you didn't request this email, you can safely ignore it.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; border-top: 1px solid #1F2937; text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #4B5563; text-transform: uppercase; letter-spacing: 0.1em;">
                © 2025 CrowdStack. All rights reserved.
              </p>
              <p style="margin: 12px 0 0; font-size: 12px;">
                <a href="https://crowdstack.app" style="color: #A855F7; text-decoration: none; font-weight: 500;">crowdstack.app</a>
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

**Subject:** `Welcome to CrowdStack - Confirm your email`

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
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 480px; margin: 0 auto; background-color: #12151A; border-radius: 20px; border: 1px solid rgba(168, 85, 247, 0.2); box-shadow: 0 4px 24px rgba(0, 0, 0, 0.4);">
          
          <!-- Logo Header -->
          <tr>
            <td style="padding: 40px 32px 24px; text-align: center;">
              <img src="https://crowdstack.app/logos/crowdstack-icon-tricolor-on-transparent.png" alt="CrowdStack" width="56" height="56" style="display: block; margin: 0 auto 16px;" />
              <p style="margin: 0; font-size: 18px; font-weight: 900; letter-spacing: -0.02em; color: #FFFFFF; text-transform: uppercase;">
                CROWDSTACK<span style="color: #A855F7;">.</span>
              </p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 0 32px 32px;">
              <h1 style="margin: 0 0 8px; font-size: 28px; font-weight: 800; color: #FFFFFF; text-align: center; letter-spacing: -0.02em;">
                Welcome to CrowdStack!
              </h1>
              
              <p style="margin: 0 0 32px; font-size: 15px; line-height: 1.6; color: #9CA3AF; text-align: center;">
                Thanks for signing up! Enter this code to confirm your email.
              </p>
              
              <!-- OTP Code Section -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0 0 32px;">
                <tr>
                  <td style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(59, 130, 246, 0.15) 100%); border-radius: 16px; padding: 32px 24px; border: 2px solid rgba(16, 185, 129, 0.4);">
                    <p style="margin: 0 0 8px; font-size: 10px; font-weight: 700; color: #10B981; text-align: center; text-transform: uppercase; letter-spacing: 0.15em;">
                      Confirmation Code
                    </p>
                    <p style="margin: 0; font-size: 44px; font-weight: 700; color: #FFFFFF; text-align: center; letter-spacing: 0.4em; font-family: 'SF Mono', Monaco, 'Courier New', monospace; line-height: 1.2;">
                      {{ .Token }}
                    </p>
                  </td>
                </tr>
              </table>
              
              <!-- Divider -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="padding: 8px 0 24px;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td style="border-bottom: 1px solid #2A2F3A; height: 1px; width: 42%;"></td>
                        <td style="text-align: center; color: #4B5563; font-size: 11px; padding: 0 12px; text-transform: uppercase; letter-spacing: 0.1em;">or</td>
                        <td style="border-bottom: 1px solid #2A2F3A; height: 1px; width: 42%;"></td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- Confirm Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="text-align: center; padding: 0;">
                    <a href="{{ .ConfirmationURL }}" target="_blank" style="display: inline-block; padding: 14px 28px; background: linear-gradient(135deg, #10B981 0%, #059669 100%); color: #FFFFFF; font-size: 14px; font-weight: 600; text-decoration: none; border-radius: 10px; text-transform: uppercase; letter-spacing: 0.05em;">
                      Confirm Email
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 24px 0 0; font-size: 13px; line-height: 1.5; color: #6B7280; text-align: center;">
                If you didn't create this account, you can safely ignore this email.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; border-top: 1px solid #1F2937; text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #4B5563; text-transform: uppercase; letter-spacing: 0.1em;">
                © 2025 CrowdStack. All rights reserved.
              </p>
              <p style="margin: 12px 0 0; font-size: 12px;">
                <a href="https://crowdstack.app" style="color: #A855F7; text-decoration: none; font-weight: 500;">crowdstack.app</a>
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
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 480px; margin: 0 auto; background-color: #12151A; border-radius: 20px; border: 1px solid rgba(168, 85, 247, 0.2); box-shadow: 0 4px 24px rgba(0, 0, 0, 0.4);">
          
          <!-- Logo Header -->
          <tr>
            <td style="padding: 40px 32px 24px; text-align: center;">
              <img src="https://crowdstack.app/logos/crowdstack-icon-tricolor-on-transparent.png" alt="CrowdStack" width="56" height="56" style="display: block; margin: 0 auto 16px;" />
              <p style="margin: 0; font-size: 18px; font-weight: 900; letter-spacing: -0.02em; color: #FFFFFF; text-transform: uppercase;">
                CROWDSTACK<span style="color: #A855F7;">.</span>
              </p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 0 32px 32px;">
              <h1 style="margin: 0 0 8px; font-size: 28px; font-weight: 800; color: #FFFFFF; text-align: center; letter-spacing: -0.02em;">
                Reset Your Password
              </h1>
              
              <p style="margin: 0 0 32px; font-size: 15px; line-height: 1.6; color: #9CA3AF; text-align: center;">
                We received a request to reset your password. Click the button below to choose a new password.
              </p>
              
              <!-- Reset Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="text-align: center; padding: 0 0 24px;">
                    <a href="{{ .ConfirmationURL }}" target="_blank" style="display: inline-block; padding: 16px 36px; background: linear-gradient(135deg, #A855F7 0%, #7C3AED 100%); color: #FFFFFF; font-size: 15px; font-weight: 700; text-decoration: none; border-radius: 12px; text-transform: uppercase; letter-spacing: 0.05em; box-shadow: 0 4px 14px rgba(168, 85, 247, 0.4);">
                      Reset Password
                    </a>
                  </td>
                </tr>
              </table>
              
              <!-- Security Notice -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0 0 16px;">
                <tr>
                  <td style="background-color: rgba(245, 158, 11, 0.1); border-radius: 10px; padding: 16px; border: 1px solid rgba(245, 158, 11, 0.3);">
                    <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #F59E0B; text-align: center;">
                      ⚠️ This link expires in 24 hours. If you didn't request a password reset, please ignore this email.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; border-top: 1px solid #1F2937; text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #4B5563; text-transform: uppercase; letter-spacing: 0.1em;">
                © 2025 CrowdStack. All rights reserved.
              </p>
              <p style="margin: 12px 0 0; font-size: 12px;">
                <a href="https://crowdstack.app" style="color: #A855F7; text-decoration: none; font-weight: 500;">crowdstack.app</a>
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
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 480px; margin: 0 auto; background-color: #12151A; border-radius: 20px; border: 1px solid rgba(168, 85, 247, 0.2); box-shadow: 0 4px 24px rgba(0, 0, 0, 0.4);">
          
          <!-- Logo Header -->
          <tr>
            <td style="padding: 40px 32px 24px; text-align: center;">
              <img src="https://crowdstack.app/logos/crowdstack-icon-tricolor-on-transparent.png" alt="CrowdStack" width="56" height="56" style="display: block; margin: 0 auto 16px;" />
              <p style="margin: 0; font-size: 18px; font-weight: 900; letter-spacing: -0.02em; color: #FFFFFF; text-transform: uppercase;">
                CROWDSTACK<span style="color: #A855F7;">.</span>
              </p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 0 32px 32px;">
              <h1 style="margin: 0 0 8px; font-size: 28px; font-weight: 800; color: #FFFFFF; text-align: center; letter-spacing: -0.02em;">
                You're Invited!
              </h1>
              
              <p style="margin: 0 0 32px; font-size: 15px; line-height: 1.6; color: #9CA3AF; text-align: center;">
                You've been invited to join CrowdStack. Click the button below to accept your invitation and set up your account.
              </p>
              
              <!-- Accept Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="text-align: center; padding: 0 0 24px;">
                    <a href="{{ .ConfirmationURL }}" target="_blank" style="display: inline-block; padding: 16px 36px; background: linear-gradient(135deg, #3B82F6 0%, #2563EB 100%); color: #FFFFFF; font-size: 15px; font-weight: 700; text-decoration: none; border-radius: 12px; text-transform: uppercase; letter-spacing: 0.05em; box-shadow: 0 4px 14px rgba(59, 130, 246, 0.4);">
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
            <td style="padding: 24px 32px; border-top: 1px solid #1F2937; text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #4B5563; text-transform: uppercase; letter-spacing: 0.1em;">
                © 2025 CrowdStack. All rights reserved.
              </p>
              <p style="margin: 12px 0 0; font-size: 12px;">
                <a href="https://crowdstack.app" style="color: #A855F7; text-decoration: none; font-weight: 500;">crowdstack.app</a>
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

## Email Change Template

**Subject:** `Confirm your new email address`

**Body:**

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirm your new email address</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0B0D10; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #0B0D10;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 480px; margin: 0 auto; background-color: #12151A; border-radius: 20px; border: 1px solid rgba(168, 85, 247, 0.2); box-shadow: 0 4px 24px rgba(0, 0, 0, 0.4);">
          
          <!-- Logo Header -->
          <tr>
            <td style="padding: 40px 32px 24px; text-align: center;">
              <img src="https://crowdstack.app/logos/crowdstack-icon-tricolor-on-transparent.png" alt="CrowdStack" width="56" height="56" style="display: block; margin: 0 auto 16px;" />
              <p style="margin: 0; font-size: 18px; font-weight: 900; letter-spacing: -0.02em; color: #FFFFFF; text-transform: uppercase;">
                CROWDSTACK<span style="color: #A855F7;">.</span>
              </p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 0 32px 32px;">
              <h1 style="margin: 0 0 8px; font-size: 28px; font-weight: 800; color: #FFFFFF; text-align: center; letter-spacing: -0.02em;">
                Confirm Email Change
              </h1>
              
              <p style="margin: 0 0 32px; font-size: 15px; line-height: 1.6; color: #9CA3AF; text-align: center;">
                Click the button below to confirm your new email address.
              </p>
              
              <!-- Confirm Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="text-align: center; padding: 0 0 24px;">
                    <a href="{{ .ConfirmationURL }}" target="_blank" style="display: inline-block; padding: 16px 36px; background: linear-gradient(135deg, #A855F7 0%, #3B82F6 100%); color: #FFFFFF; font-size: 15px; font-weight: 700; text-decoration: none; border-radius: 12px; text-transform: uppercase; letter-spacing: 0.05em; box-shadow: 0 4px 14px rgba(168, 85, 247, 0.4);">
                      Confirm Email
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #6B7280; text-align: center;">
                If you didn't request this change, please contact support immediately.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; border-top: 1px solid #1F2937; text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #4B5563; text-transform: uppercase; letter-spacing: 0.1em;">
                © 2025 CrowdStack. All rights reserved.
              </p>
              <p style="margin: 12px 0 0; font-size: 12px;">
                <a href="https://crowdstack.app" style="color: #A855F7; text-decoration: none; font-weight: 500;">crowdstack.app</a>
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

1. **Logo Image**: The email templates reference `https://crowdstack.app/logos/crowdstack-icon-tricolor-on-transparent.png`.
   - This is the new tricolor stacked layers logo (white top, purple middle, blue bottom)
   - File exists in `apps/unified/public/logos/crowdstack-icon-tricolor-on-transparent.png`
   - Email clients don't support SVG, so we use PNG
   - Other available logos in `/public/logos/`:
     - `crowdstack-icon-white-on-transparent.png` (all white)
     - `crowdstack-icon-purple-on-transparent.png` (all purple)
     - `crowdstack-icon-black-on-transparent.png` (all black)
     - `crowdstack-wordmark-dark-standard-transparent.png` (full wordmark for dark bg)
     - `crowdstack-wordmark-light-standard-transparent.png` (full wordmark for light bg)

2. **Design System Colors**:
   - Primary Purple: `#A855F7` / `#7C3AED`
   - Primary Blue: `#3B82F6` / `#2563EB`
   - Success Green: `#10B981` / `#059669`
   - Warning Amber: `#F59E0B`
   - Background: `#0B0D10` (void), `#12151A` (card)
   - Border: `rgba(168, 85, 247, 0.2)` (purple tint)

3. **Template Variables**:
   - `{{ .ConfirmationURL }}` - The magic link/confirmation URL
   - `{{ .Token }}` - The 6-digit OTP code (for Magic Link/Confirm templates)
   - `{{ .TokenHash }}` - Token hash (alternative to Token)
   - `{{ .SiteURL }}` - Your site URL
   - `{{ .Email }}` - User's email address

4. **Apply to Both Projects**: 
   - **Beta**: https://supabase.com/dashboard/project/aiopjznxnoqgmmqowpxb/auth/templates
   - **Production**: https://supabase.com/dashboard/project/fvrjcyscwibrqpsviblx/auth/templates

5. **Test the Templates**: After updating, request a magic link and verify:
   - The email looks correct with new tricolor logo
   - OTP code box has purple/blue gradient border
   - Buttons have correct gradient colors
   - The magic link and OTP verification work
