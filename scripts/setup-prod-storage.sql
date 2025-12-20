-- Script to create all required storage buckets in production Supabase
-- Run this in Supabase SQL Editor after migrations are complete

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

-- Verify buckets were created
SELECT id, name, public, created_at 
FROM storage.buckets 
WHERE id IN ('avatars', 'organizer-images', 'venue-images', 'event-photos')
ORDER BY id;

