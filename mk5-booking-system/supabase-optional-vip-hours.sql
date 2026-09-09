-- ============================================================================
-- Optional migration — "Horario VIP" (VIP hours surcharge)
-- Run in the Supabase SQL Editor only if the client wants VIP time slots
-- (off-hours booking windows with a surcharge). Safe to run more than once:
-- columns use IF NOT EXISTS.
-- ============================================================================

alter table bookings add column if not exists is_vip boolean not null default false;
alter table bookings add column if not exists vip_surcharge numeric;

-- Load the client's real service catalog (name, description, duration,
-- price) into `services` separately — via the /admin panel (recommended)
-- or hand-written INSERT statements — see supabase-full-schema.sql and
-- SETUP.md section 9. Do not carry over another client's menu into this
-- template.
