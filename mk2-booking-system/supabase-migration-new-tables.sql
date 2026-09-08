-- Run this in your Supabase SQL Editor
-- Required for: Productos, Promociones, and Configuración panels

-- 1. PRODUCTS
create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  price numeric(10,2) not null default 0,
  cost numeric(10,2) not null default 0,
  description text,
  stock integer not null default 0,
  active boolean not null default true,
  photo_url text,
  created_at timestamptz not null default now()
);
alter table products enable row level security;
create policy "Admin full access" on products for all using (true);

-- If products table already exists, add photo_url column:
-- alter table products add column if not exists photo_url text;

-- 2. PROMOTIONS
create table if not exists promotions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  discount_type text not null check (discount_type in ('percent','fixed')),
  discount_value numeric(10,2) not null default 0,
  service_name text,
  specialist_name text,
  active boolean not null default true,
  starts_at date,
  ends_at date,
  created_at timestamptz not null default now()
);
alter table promotions enable row level security;
create policy "Admin full access" on promotions for all using (true);

-- 3. SALON SETTINGS (single-row config)
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
alter table salon_settings enable row level security;
create policy "Admin full access" on salon_settings for all using (true);

-- 4. SPECIALIST SCHEDULES (recurring weekly availability)
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
alter table specialist_schedules enable row level security;
create policy "Admin full access" on specialist_schedules for all using (true);

-- Storage bucket for product photos (run in Supabase Dashboard > Storage):
-- Create bucket named "products" with public access enabled
