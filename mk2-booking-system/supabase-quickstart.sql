-- ============================================================================
-- KLASSY SALON — QUICKSTART (schema + seed data, all in one script)
-- Run this ONCE in a fresh Supabase project's SQL Editor to go from empty
-- project to a working copy of the site in one shot: creates every table,
-- sets up the minimum RLS needed, seeds the real service catalog (prices/
-- durations), and seeds a default salon config row.
--
-- This does everything supabase-full-schema.sql does, plus seed data.
-- Safe to re-run (all statements are idempotent) — running it twice won't
-- duplicate rows or error on existing tables.
--
-- AFTER running this, 3 manual steps outside SQL are still required
-- (Supabase doesn't allow creating real login users from plain SQL):
--   1. Supabase Dashboard → Authentication → Users → "Add user" → create
--      the admin's email/password. Copy the generated user UUID.
--   2. Run the INSERT at the very bottom of this file, replacing
--      'PASTE-AUTH-USER-UUID-HERE' with that UUID and the name/email.
--   3. Supabase Dashboard → Storage → create two PUBLIC buckets:
--      "services" and "products" (used for photo uploads in admin).
--   4. Copy .env.local.example → .env.local and fill in this project's
--      VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY / VITE_SUPABASE_SERVICE_KEY
--      (Settings → API in the dashboard).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- SCHEMA
-- ---------------------------------------------------------------------------

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
  gcal_event_id text
);

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

create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_id uuid references profiles(id),
  created_at timestamptz default now()
);

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

create table if not exists specialist_services (
  id uuid primary key default gen_random_uuid(),
  specialist_id uuid not null references profiles(id) on delete cascade,
  service_name text not null,
  duration_minutes integer not null default 60,
  approved boolean not null default false,
  created_at timestamptz default now()
);

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

create table if not exists salon_settings (
  id uuid primary key default gen_random_uuid(),
  salon_name text not null default 'Klassy Salon',
  address text not null default '3KS-5 Cll Via Mirta local #1, Carolina, 00983, Puerto Rico',
  phone text not null default '7876905963',
  email text not null default '',
  instagram_url text not null default 'https://www.instagram.com/klassysalon.pr/',
  booksy_url text not null default 'https://booksy.com/en-us/1482397_klassy-salon_nail-salon_34793_carolina',
  schedule_notes text not null default 'Lun-Mar 9am-7pm · Mié Cerrado · Jue-Vie 9am-7pm · Sáb 9am-6pm · Dom Cerrado',
  payment_methods text not null default 'Efectivo, Tarjeta de crédito/débito, ATH Móvil',
  policies_text text not null default 'Se requiere depósito para servicios de $50 o más.',
  updated_at timestamptz not null default now()
);

create table if not exists admin_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id),
  user_name text,
  action text,
  detail text,
  device text,
  created_at timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- ROW LEVEL SECURITY (matches production: mostly off, one permissive
-- "allow all" policy on 4 tables just to satisfy Supabase's lint warning,
-- plus the one real public-read policy profiles actually needs)
-- ---------------------------------------------------------------------------

alter table products enable row level security;
create policy if not exists "Admin full access" on products for all using (true);

alter table promotions enable row level security;
create policy if not exists "Admin full access" on promotions for all using (true);

alter table salon_settings enable row level security;
create policy if not exists "Admin full access" on salon_settings for all using (true);

alter table specialist_schedules enable row level security;
create policy if not exists "Admin full access" on specialist_schedules for all using (true);

alter table profiles enable row level security;
create policy if not exists "Public can view active specialists" on profiles
  for select to anon using (role = 'specialist' and active = true);
create policy if not exists "Authenticated can view all profiles" on profiles
  for select to authenticated using (true);
create policy if not exists "Authenticated can manage own profile" on profiles
  for update to authenticated using (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- SEED DATA — real service catalog (same as src/components/site/data.ts),
-- so the public site and booking flow work immediately instead of showing
-- an empty catalog. Edit prices/names/durations from the admin Servicios
-- panel afterward — this is just a working starting point.
-- ---------------------------------------------------------------------------

insert into services (category_id, category_title, name, description, duration, price, display_order, active)
select * from (values
  ('manicure','Manicuras','Manicura Profunda Builder or Rubber','Limpieza profunda con torno (drill) y puntas de diamante, corte de cutícula, limado, aplicación de producto nivelador, color, aceite de cutícula, exfoliante y crema de manos. Add-ons: remoción de material no de KS +$5 (añade 10min) · Reconstrucción de uña $2 c/u (añade 3min).','1h 40min','$45',0,true),
  ('manicure','Manicuras','Manicura Profunda Gel Tips','Limpieza profunda con torno (drill) y puntas de diamante, corte de cutícula, limado, aplicación de gel tips, color, aceite de cutícula, exfoliante y crema de manos. Add-ons: remoción de material no de KS +$5 (añade 10min) · Reconstrucción de uña $2 c/u (añade 3min).','1h 50min','$55',1,true),
  ('manicure','Manicuras','Manicura Profunda para Caballero','Limpieza profunda con torno (drill) y puntas de diamante, corte de cutícula, limado, aplicación rubber clear, aceite de cutícula, exfoliante y crema de manos.','1h','$40',2,true),
  ('manicure','Manicuras','Manicura Profunda Esmalte Regular','Limpieza profunda con torno (drill) y puntas de diamante, corte de cutícula, limado, aceite de cutícula, exfoliante, crema de manos, aplicación de esmaltado regular. No trabajamos diseño con esmaltado regular. Add-ons: remoción de material no de KS +$5 (añade 10min).','1h','$35',3,true),
  ('manicure','Manicuras','Remoción de Material & Fix Me Up!','Remoción de material gel o acrílico, limpieza profunda con torno (drill) y puntas de diamante, corte de cutícula, limado, aceite de cutícula, exfoliante, crema de manos.','1h','$20',4,true),
  ('pedicure','Pedicuras','Pedicura Footlogix + Color Gel','Incluye esmaltado en gel, cuidado de cutículas, tratamiento para callosidades, exfoliación, hidratación, masaje y tratamiento de bienestar para uñas. Add-ons: Reconstrucción de uña $2 c/u (añade 3min).','1h 10min','$70',100,true),
  ('pedicure','Pedicuras','Pedicura Footlogix + Color Regular','Incluye esmaltado en regular, cuidado de cutículas, tratamiento para callosidades, exfoliación, hidratación, masaje y tratamiento de bienestar para uñas. Add-ons: Reconstrucción de uña $2 c/u (añade 3min).','1h 10min','$60',101,true),
  ('pedicure','Pedicuras','Cambio de Color en Gel','Remoción de esmaltado anterior, preparación y aplicación de color gel en uñas de los pies. Add-ons: Reconstrucción de uña $2 c/u (añade 3min) · Diseño sencillo $5 (añade 5min).','20min','$20',102,true),
  ('pedicure','Pedicuras','Cambio de Color en Regular','Remoción de esmaltado anterior, preparación y aplicación de color regular en uñas de los pies.','20min','$15',103,true),
  ('cabello','Cabello','Lavado, Secado y Planchado','Lavado con productos premium, secado y planchado para un acabado liso y brillante. El precio depende del largo.','1h','Desde $25',0,true),
  ('cabello','Cabello','Lavado, Secado y Ondas','Lavado y estilo con ondas para un look romántico y elegante. El precio depende del largo.','1h','Desde $35',1,true),
  ('cabello','Cabello','Peinados','Peinados para ocasiones especiales, bodas, quinceañeros y eventos. Siempre klassy.','1h 30min','Desde $50',2,true),
  ('cabello','Cabello','Corte de Puntas','Corte de puntas para mantener el cabello saludable y con brillo.','30min','Desde $25',3,true),
  ('cabello','Cabello','Corte con Estilo','Corte personalizado según tu tipo de cara y preferencia.','30min','Desde $32',4,true),
  ('cabello','Cabello','Corte de Pollina','Corte y arreglo de pollina.','30min','$8',5,true),
  ('cabello','Cabello','Full Color','Coloración completa de cabello con productos de alta calidad. El precio depende del largo.','1h 30min','Desde $70',6,true),
  ('cabello','Cabello','Retoque de Color','Retoque de raíz y mantenimiento del color. El precio depende por pulgadas de crecimiento.','1h','Desde $60',7,true),
  ('cabello','Cabello','Highlights Parcial','Mechas parciales para iluminar y dar dimensión. Resultado natural y luminoso. El precio depende del largo.','1h 30min','Desde $55',8,true),
  ('cabello','Cabello','Highlights Full','Mechas completas para máxima luminosidad. El precio depende del largo.','3h 30min','Desde $70',9,true),
  ('cabello','Cabello','Balayage','Técnica de balayage para un degradado perfecto y ultra natural. El look más solicitado. El precio depende del largo.','4h','Desde $100',10,true),
  ('cabello','Cabello','Toner','Toner para neutralizar tonos o refrescar el color. Resultados inmediatos.','40min','Desde $40',11,true),
  ('cabello','Cabello','Remoción de Color','Remoción segura del color existente para preparar el cabello para un nuevo tono.','1h','Desde $50',12,true),
  ('cabello','Cabello','Cirugía Plástica FIOS','Alisado intensivo que reconstruye la hebra, controla el frizz y deja el cabello completamente liso con brillo espejo. Sin formol.','4h','Desde $190',13,true),
  ('cabello','Cabello','Shot FIOS','Alisado progresivo sin formol que deja el cabello liso, suave y con brillo natural. Mantenimiento rápido entre sesiones.','5min','$20',14,true),
  ('cabello','Cabello','Keratina','Suaviza, reduce el frizz y mejora la textura del cabello sin alisarlo por completo. Ideal para cabello con volumen.','2h','Desde $100',15,true),
  ('cabello','Cabello','Shot Keratina','Versión express de la keratina para resultados visibles sin el tiempo completo.','1h 30min','Desde $35',16,true),
  ('cabello','Cabello','Botox Capilar','Tratamiento regenerador que aporta brillo, suavidad y vida al cabello dañado. Rellena la fibra capilar.','2h','Desde $100',17,true),
  ('cabello','Cabello','Mascarilla Hidratante','Mascarilla de hidratación profunda para nutrir y suavizar el cabello.','15min','$15',18,true),
  ('cabello','Cabello','Ampolla Reconstructora','Ampolla reconstructora para cabello dañado o con tratamientos químicos. Recupera la estructura del cabello.','30min','$15',19,true),
  ('cabello','Cabello','Depilación de Cejas','Definición y depilación de cejas con cera. Forma perfecta para enmarcar tu mirada y realzar tu expresión natural.','30min','$20',20,true),
  ('cabello','Cabello','Depilación de Bozo','Depilación de bozo con cera. Rápido, preciso y suave para la piel.','10min','$8',21,true)
) as v(category_id, category_title, name, description, duration, price, display_order, active)
where not exists (select 1 from services limit 1);

-- SALON_SETTINGS — one default row (edit from admin's Configuración panel).
insert into salon_settings (salon_name, address, phone, email, instagram_url, booksy_url, schedule_notes, payment_methods, policies_text)
select 'Klassy Salon', '3KS-5 Cll Via Mirta local #1, Carolina, 00983, Puerto Rico', '7876905963', '', 'https://www.instagram.com/klassysalon.pr/', 'https://booksy.com/en-us/1482397_klassy-salon_nail-salon_34793_carolina', 'Lun-Mar 9am-7pm · Mié Cerrado · Jue-Vie 9am-7pm · Sáb 9am-6pm · Dom Cerrado', 'Efectivo, Tarjeta de crédito/débito, ATH Móvil', 'Se requiere depósito para servicios de $50 o más.'
where not exists (select 1 from salon_settings limit 1);

-- ---------------------------------------------------------------------------
-- MANUAL STEP — run this LAST, after creating the auth user in the
-- dashboard (Authentication → Users → Add user). Replace the placeholders.
-- ---------------------------------------------------------------------------
-- insert into profiles (id, full_name, email, role, active)
-- values ('PASTE-AUTH-USER-UUID-HERE', 'Nombre Admin', 'admin@tudominio.com', 'admin', true);
