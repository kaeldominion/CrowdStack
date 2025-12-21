-- Change the default mobile_style from 'scroll' to 'flip'
-- Style B (flip) is now the preferred default for all events

ALTER TABLE events 
ALTER COLUMN mobile_style SET DEFAULT 'flip';

COMMENT ON COLUMN events.mobile_style IS 'Mobile event page style: flip (default) or scroll';

