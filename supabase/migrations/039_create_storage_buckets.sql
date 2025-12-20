-- Create all required storage buckets for production
-- These buckets are needed for avatars, organizer images, venue images, and event photos

-- Create avatars bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Create organizer-images bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('organizer-images', 'organizer-images', true)
ON CONFLICT (id) DO NOTHING;

-- Create venue-images bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('venue-images', 'venue-images', true)
ON CONFLICT (id) DO NOTHING;

-- Create event-photos bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('event-photos', 'event-photos', true)
ON CONFLICT (id) DO NOTHING;

