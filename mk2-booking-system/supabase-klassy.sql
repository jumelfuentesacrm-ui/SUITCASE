-- ============================================================
-- KLASSY SALON — Supabase SQL (run in SQL Editor)
-- ============================================================

-- 1. Add missing columns to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS avatar_url   TEXT,
  ADD COLUMN IF NOT EXISTS bio          TEXT,
  ADD COLUMN IF NOT EXISTS active       BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS email        TEXT;

-- 2. Create specialist_services table
CREATE TABLE IF NOT EXISTS specialist_services (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  specialist_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  service_name     TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  approved         BOOLEAN NOT NULL DEFAULT FALSE,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(specialist_id, service_name)
);

-- 3. Enable RLS on specialist_services
ALTER TABLE specialist_services ENABLE ROW LEVEL SECURITY;

-- Allow specialists to manage their own rows
CREATE POLICY IF NOT EXISTS "specialist_own_services"
  ON specialist_services
  FOR ALL
  USING (specialist_id = auth.uid())
  WITH CHECK (specialist_id = auth.uid());

-- Allow anon/authenticated to read approved services (for booking form)
CREATE POLICY IF NOT EXISTS "public_read_approved_services"
  ON specialist_services
  FOR SELECT
  USING (approved = TRUE);

-- Allow admins to read and update all (for approval flow)
CREATE POLICY IF NOT EXISTS "admin_manage_all_services"
  ON specialist_services
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- 4. Storage bucket for specialist avatars
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', TRUE)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY IF NOT EXISTS "avatar_upload"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY IF NOT EXISTS "avatar_update"
  ON storage.objects
  FOR UPDATE
  USING (bucket_id = 'avatars' AND auth.uid() IS NOT NULL);

CREATE POLICY IF NOT EXISTS "avatar_public_read"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'avatars');

-- 5. Storage bucket for reference images (booking)
INSERT INTO storage.buckets (id, name, public)
VALUES ('reference-images', 'reference-images', TRUE)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY IF NOT EXISTS "refimg_upload"
  ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'reference-images');

CREATE POLICY IF NOT EXISTS "refimg_read"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'reference-images');

-- 6. Allow specialists to update their own profile (bio, avatar_url)
CREATE POLICY IF NOT EXISTS "specialist_update_own_profile"
  ON profiles
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ============================================================
-- Done. Run this entire block in Supabase SQL Editor.
-- ============================================================
