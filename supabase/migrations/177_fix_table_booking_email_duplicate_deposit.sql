-- Fix duplicate {{#deposit_required}} in table_booking_request email template
-- ============================================
-- This migration removes any duplicate occurrences of {{#deposit_required}} 
-- that may appear as literal text in the email template

UPDATE public.email_templates
SET
  -- Remove duplicate occurrences in HTML body
  html_body = REGEXP_REPLACE(
    REGEXP_REPLACE(
      REGEXP_REPLACE(
        html_body,
        '\{\{#deposit_required\}\}\s*\{\{#deposit_required\}\}',
        '{{#deposit_required}}',
        'g'
      ),
      '\{\{#deposit_required\}\}\s+\{\{#deposit_required\}\}',
      '{{#deposit_required}}',
      'g'
    ),
    '\{\{#deposit_required\}\}\{\{#deposit_required\}\}',
    '{{#deposit_required}}',
    'g'
  ),
  -- Remove duplicate occurrences in text body
  text_body = REGEXP_REPLACE(
    REGEXP_REPLACE(
      REGEXP_REPLACE(
        text_body,
        '\{\{#deposit_required\}\}\s*\{\{#deposit_required\}\}',
        '{{#deposit_required}}',
        'g'
      ),
      '\{\{#deposit_required\}\}\s+\{\{#deposit_required\}\}',
      '{{#deposit_required}}',
      'g'
    ),
    '\{\{#deposit_required\}\}\{\{#deposit_required\}\}',
    '{{#deposit_required}}',
    'g'
  )
WHERE slug = 'table_booking_request';
