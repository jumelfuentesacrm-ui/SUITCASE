-- MK2 -- schema completo. Una sola tabla + un bucket de Storage.
-- Correr una sola vez en Supabase SQL Editor -> New query -> Run.

-- ============================================================
-- Tabla: site_content
-- Una sola fila (id = 1) con todo el contenido editable del sitio.
-- No hay tabla de roles/permisos -- MK2 asume un solo admin por sitio,
-- controlado enteramente por Supabase Auth (ver seccion RLS abajo).
-- ============================================================

create table if not exists public.site_content (
  id integer primary key default 1,
  business_name text not null default 'Tu Negocio Aqui',
  tagline text not null default '',
  phone text not null default '',
  whatsapp text not null default '',
  email text not null default '',
  address text not null default '',
  logo_url text not null default '',
  hero_image_url text not null default '',
  hero_headline text not null default '',
  hero_subtext text not null default '',
  about_text text not null default '',
  services jsonb not null default '[]'::jsonb,
  gallery jsonb not null default '[]'::jsonb,
  footer_note text not null default '',
  updated_at timestamptz not null default now(),
  constraint site_content_singleton check (id = 1)
);

-- Semilla: exactamente una fila. El sitio publico y el panel /admin
-- siempre leen/escriben id = 1 (ver src/lib/useSiteContent.ts).
insert into public.site_content (id, business_name, hero_headline)
values (1, 'Tu Negocio Aqui', 'Bienvenido a Tu Negocio Aqui')
on conflict (id) do nothing;

-- ============================================================
-- Row Level Security
-- Lectura publica (el sitio de marketing es publico).
-- Escritura solo para usuarios autenticados (el unico admin del sitio).
-- ============================================================

alter table public.site_content enable row level security;

drop policy if exists "site_content_public_read" on public.site_content;
create policy "site_content_public_read"
  on public.site_content for select
  using (true);

drop policy if exists "site_content_admin_write" on public.site_content;
create policy "site_content_admin_write"
  on public.site_content for update
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "site_content_admin_insert" on public.site_content;
create policy "site_content_admin_insert"
  on public.site_content for insert
  with check (auth.role() = 'authenticated');

-- ============================================================
-- Storage: bucket publico para logo / foto de portada / galeria
-- ============================================================

insert into storage.buckets (id, name, public)
values ('site-media', 'site-media', true)
on conflict (id) do nothing;

drop policy if exists "site_media_public_read" on storage.objects;
create policy "site_media_public_read"
  on storage.objects for select
  using (bucket_id = 'site-media');

drop policy if exists "site_media_admin_write" on storage.objects;
create policy "site_media_admin_write"
  on storage.objects for insert
  with check (bucket_id = 'site-media' and auth.role() = 'authenticated');

drop policy if exists "site_media_admin_update" on storage.objects;
create policy "site_media_admin_update"
  on storage.objects for update
  using (bucket_id = 'site-media' and auth.role() = 'authenticated');

drop policy if exists "site_media_admin_delete" on storage.objects;
create policy "site_media_admin_delete"
  on storage.objects for delete
  using (bucket_id = 'site-media' and auth.role() = 'authenticated');
