-- ============================================================================
-- MK5 BOOKING SYSTEM — FULL DATABASE SCHEMA
-- Run this ONCE in a fresh Supabase project's SQL Editor to recreate every
-- table this app needs. This is the single source of truth for setting up
-- a new clone/template.
--
-- After running this:
--   1. Auth: profiles.id must match a real auth.users.id (Supabase Auth) —
--      create the admin/specialist user in Authentication > Users first,
--      then insert their profiles row using that same id.
--   2. Storage: create a public "services" bucket (service photos) and a
--      public "products" bucket (product photos) in Storage.
--   3. profiles needs a public SELECT policy for anon (see bottom) or the
--      public site silently shows zero specialists — this bit the original
--      project once already.
-- ============================================================================

-- 1. PROFILES — admin/specialist accounts. id must equal the matching
--    auth.users.id (this app authenticates via Supabase Auth).
create table if not exists profiles (
  id uuid primary key,
  full_name text,
  business_name text,
  phone text,
  role text not null default 'specialist',
  created_at timestamptz default now(),
  email text,
  avatar_url text,
  bio text,
  active boolean default true,
  is_specialist boolean default false,
  role_label text
);

-- 2. BOOKINGS — one row per appointment (service/specialist columns are
--    joined "summary" strings for multi-service bookings; booking_services
--    below is the real source of truth for per-service detail).
create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  business text not null,
  facebook_page text,
  service text,
  date date not null,
  time text not null,
  status text not null default 'pending',
  notes text,
  archived boolean default false,
  archived_reason text,
  buy_service text,
  buy_amount numeric,
  buy_type text,
  buy_monthly numeric,
  buy_total numeric,
  buy_installments integer,
  buy_notes text,
  created_at timestamptz default now(),
  specialist text,
  gcal_event_id text,
  is_vip boolean not null default false,
  vip_surcharge numeric
);

-- 3. BOOKING_SERVICES — per-service specialist/time breakdown for
--    multi-service (mix-and-match) bookings.
create table if not exists booking_services (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings(id) on delete cascade,
  service_name text not null,
  specialist_id uuid references profiles(id),
  specialist_name text not null,
  sequence_order integer not null default 1,
  start_time text not null,
  duration_minutes integer not null,
  created_at timestamptz default now()
);
create index if not exists idx_booking_services_booking_id on booking_services(booking_id);
create index if not exists idx_booking_services_specialist_id on booking_services(specialist_id);

-- 4. CRM_CLIENTS — client directory (CRM tab).
create table if not exists crm_clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  business text,
  notes text,
  created_at timestamptz default now(),
  preferences text,
  profile_notes text,
  email text,
  address text,
  city text,
  allergens text,
  discount numeric default 0,
  booking_count integer default 0,
  web_communication_agreement boolean default false,
  processing_consent boolean default false,
  blacklisted boolean default false,
  booksy_id text
);

-- 5. PUSH_SUBSCRIPTIONS — web push registrations for admin notifications.
create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_id uuid references profiles(id),
  created_at timestamptz default now()
);

-- 6. SERVICES — the catalog shown on the public site and used everywhere
--    for pricing/duration (edited from admin's Servicios panel).
create table if not exists services (
  id uuid primary key default gen_random_uuid(),
  category_id text not null,
  category_title text not null,
  name text not null,
  description text,
  duration text,
  price text,
  cost numeric default 0,
  photo_url text,
  display_order integer default 0,
  active boolean default true,
  subgroup text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 7. DEPOSITS — deposit/payment tracking, optionally tied to a booking.
create table if not exists deposits (
  id uuid primary key default gen_random_uuid(),
  client_name text not null,
  client_phone text,
  amount numeric not null default 0,
  concept text,
  status text not null default 'pendiente',
  booking_id uuid references bookings(id),
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  stripe_session_id text
);

-- 8. AVAILABILITY_BLOCKS — one-off time-off / blocked slots per specialist.
create table if not exists availability_blocks (
  id uuid primary key default gen_random_uuid(),
  specialist_name text not null,
  date text not null,
  start_time text,
  end_time text,
  all_day boolean default true,
  reason text,
  status text default 'approved',
  created_at timestamptz default now()
);

-- 8b. NOTIFICATIONS — persistent in-panel feed backing the push notifications;
--     action items (block_request/service_request) get resolved=true once
--     approved/rejected, informational ones just age out by ref_date.
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  kind text not null,
  target_role text not null default 'admin',
  target_specialist_name text,
  ref_id text,
  ref_date text,
  requires_action boolean not null default false,
  resolved boolean not null default false,
  created_at timestamptz not null default now()
);

-- 9. SPECIALIST_SERVICES — which services each specialist offers + her own
--    estimated duration for it (used by the scheduling engine).
create table if not exists specialist_services (
  id uuid primary key default gen_random_uuid(),
  specialist_id uuid not null references profiles(id) on delete cascade,
  service_name text not null,
  duration_minutes integer not null default 60,
  approved boolean not null default false,
  created_at timestamptz default now()
);

-- 10. SPECIALIST_SCHEDULES — recurring weekly working hours per specialist.
create table if not exists specialist_schedules (
  id uuid primary key default gen_random_uuid(),
  specialist_id uuid references profiles(id) on delete cascade,
  day_of_week integer not null check (day_of_week between 0 and 6),
  start_time text not null default '9:00 AM',
  end_time text not null default '7:00 PM',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(specialist_id, day_of_week)
);

-- 11. PRODUCTS — retail products (Productos panel).
create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  price numeric not null default 0,
  cost numeric not null default 0,
  description text,
  stock integer not null default 0,
  active boolean not null default true,
  photo_url text,
  category text,
  created_at timestamptz not null default now()
);

-- 12. PROMOTIONS — ongoing/standing discounts (Promociones panel).
create table if not exists promotions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  discount_type text not null check (discount_type in ('percent','fixed')),
  discount_value numeric not null default 0,
  service_name text,
  specialist_name text,
  active boolean not null default true,
  starts_at date,
  ends_at date,
  created_at timestamptz not null default now()
);

-- 13. PROMO_DAYS — single-day flash discounts.
create table if not exists promo_days (
  id uuid primary key default gen_random_uuid(),
  date date not null unique,
  discount_type text not null default 'percent',
  discount_value numeric not null default 0,
  specialist_name text not null default 'random',
  note text,
  active boolean not null default true,
  created_at timestamptz default now(),
  service_name text
);

-- 14. SALON_SETTINGS — single-row salon config (Configuración panel).
create table if not exists salon_settings (
  id uuid primary key default gen_random_uuid(),
  salon_name text not null default 'Nombre del Negocio',
  address text not null default 'Calle Principal 123, Municipio, PR 00000',
  phone text not null default '7870000000',
  email text not null default '',
  instagram_url text not null default 'https://instagram.com/negocio',
  booksy_url text not null default '',
  schedule_notes text not null default 'Lun-Mar 9am-7pm · Mié Cerrado · Jue-Vie 9am-7pm · Sáb 9am-6pm · Dom Cerrado',
  payment_methods text not null default 'Efectivo, Tarjeta de crédito/débito, ATH Móvil',
  policies_text text not null default 'Se requiere depósito para servicios de $50 o más.',
  hours jsonb,
  updated_at timestamptz not null default now()
);

-- 14b. CATEGORY_SUBGROUPS — per-category sections shown on public service
--      pages (e.g. Cabello's "Cortes", "Color & Mechas"...), editable from
--      the Servicios admin panel.
create table if not exists category_subgroups (
  id uuid primary key default gen_random_uuid(),
  category_title text not null,
  name text not null,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique(category_title, name)
);

-- 15. ADMIN_LOGS — activity/audit trail shown in admin.
create table if not exists admin_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id),
  user_name text,
  action text,
  detail text,
  device text,
  created_at timestamptz default now()
);

-- ============================================================================
-- ROW LEVEL SECURITY
-- Matches the real project convention: RLS is OFF everywhere except the four
-- tables below (which use a permissive "allow all" policy — not real access
-- control, just satisfies Supabase's "RLS enabled" lint warning), plus one
-- required public-read policy on profiles.
-- ============================================================================

alter table products enable row level security;
create policy if not exists "Admin full access" on products for all using (true);

alter table promotions enable row level security;
create policy if not exists "Admin full access" on promotions for all using (true);

alter table salon_settings enable row level security;
create policy if not exists "Admin full access" on salon_settings for all using (true);

alter table specialist_schedules enable row level security;
create policy if not exists "Admin full access" on specialist_schedules for all using (true);

-- Without this, the public site's anon key silently sees zero specialists —
-- profiles needs RLS enabled elsewhere with no permissive SELECT policy for
-- anon, or the public list quietly comes back empty.
alter table profiles enable row level security;
create policy if not exists "Public can view active specialists" on profiles
  for select to anon using (role = 'specialist' and active = true);
create policy if not exists "Authenticated can view all profiles" on profiles
  for select to authenticated using (true);
create policy if not exists "Authenticated can manage own profile" on profiles
  for update to authenticated using (auth.uid() = id);
