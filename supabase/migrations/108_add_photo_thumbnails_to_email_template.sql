-- Add Photo Thumbnails to Photos Published Email Template
-- Updates the template to include photo thumbnails in the email
-- ============================================

-- Update the photos_published template to include thumbnails
UPDATE public.email_templates
SET 
  html_body = '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Photos from {{event_name}}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0B0D10; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, ''Helvetica Neue'', Arial, sans-serif;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #0B0D10;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width: 600px; background-color: #111318; border-radius: 16px; overflow: hidden;">
          
          <!-- Header with Logo -->
          <tr>
            <td style="padding: 32px 32px 24px 32px; text-align: center; border-bottom: 1px solid rgba(255,255,255,0.1);">
              <img 
                src="https://crowdstack.app/logos/crowdstack-icon-tricolor-on-transparent.png" 
                alt="CrowdStack" 
                width="48" 
                height="48" 
                style="display: block; margin: 0 auto 16px auto;"
              />
              <h1 style="color: #FFFFFF; font-size: 24px; font-weight: 700; margin: 0; line-height: 1.3;">
                Your photos are ready!
              </h1>
            </td>
          </tr>
          
          <!-- Main Content -->
          <tr>
            <td style="padding: 32px;">
              <p style="color: #E5E7EB; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
                Hey there! The photos from <strong style="color: #FFFFFF;">{{event_name}}</strong> on {{event_date}} are now available for viewing.
              </p>
              
              {{photo_thumbnails_html}}
              
              <div style="background: #1F2937; border-radius: 8px; padding: 16px; margin: 20px 0; border-left: 4px solid #8B5CF6;">
                <p style="color: #E5E7EB; margin: 0; font-style: italic;">"{{custom_message}}"</p>
              </div>
              
              <p style="color: #9CA3AF; font-size: 14px; line-height: 1.5; margin: 16px 0 24px 0;">
                Browse the full gallery, download your favorites, and share the memories!
              </p>
              
              <!-- CTA Button -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td align="center">
                    <a 
                      href="{{gallery_url}}" 
                      style="display: inline-block; background: linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%); color: #FFFFFF; font-size: 16px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 8px;"
                    >
                      View Photos
                    </a>
                  </td>
                </tr>
              </table>
              
              <!-- Fallback Link -->
              <p style="color: #6B7280; font-size: 12px; line-height: 1.5; margin: 24px 0 0 0; text-align: center;">
                If the button doesn''t work, copy and paste this link:<br/>
                <a href="{{gallery_url}}" style="color: #8B5CF6; word-break: break-all;">{{gallery_url}}</a>
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; background-color: rgba(0,0,0,0.3); border-top: 1px solid rgba(255,255,255,0.1);">
              <p style="color: #6B7280; font-size: 12px; line-height: 1.5; margin: 0; text-align: center;">
                You''re receiving this because you attended {{event_name}}.<br/>
                Powered by <a href="https://crowdstack.app" style="color: #8B5CF6; text-decoration: none;">CrowdStack</a>
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>',
  variables = '{"event_name": "string", "event_date": "string", "venue_name": "string", "gallery_url": "string", "custom_message": "string", "photo_thumbnails_html": "string"}'::jsonb
WHERE slug = 'photos_published';

