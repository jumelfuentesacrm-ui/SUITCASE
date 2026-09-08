-- ============================================================================
-- MK2_PRT — seed de reset entre presentaciones
-- ============================================================================
-- Deja el proyecto de Supabase de la demo (un único proyecto, reutilizado
-- para todas las presentaciones, una a la vez) en un estado limpio y
-- genérico antes de cada presentación nueva: borra reservas y ediciones que
-- haya dejado el admin del prospecto anterior, y vuelve a cargar catálogo
-- placeholder consistente con `src/config/business.config.ts` por default.
--
-- NO se usa en MK2 (por cliente) — ahí cada cliente tiene su propio proyecto
-- con datos reales que nunca se deben borrar así.
--
-- Uso: `npm run demo:reset` (ver scripts/demo-reset.sh) o pega el bloque
-- completo en Supabase SQL Editor → Run, contra el proyecto de la demo.
-- ============================================================================

begin;

-- ---- 1. Borra actividad transaccional de la última presentación ----
truncate table booking_services restart identity cascade;
truncate table bookings restart identity cascade;
truncate table deposits restart identity cascade;
truncate table notifications restart identity cascade;
truncate table admin_logs restart identity cascade;
truncate table availability_blocks restart identity cascade;
truncate table crm_clients restart identity cascade;

-- ---- 2. Borra catálogo/promos editados desde el panel admin ----
truncate table products restart identity cascade;
truncate table promotions restart identity cascade;
truncate table specialist_services restart identity cascade;
truncate table specialist_schedules restart identity cascade;

-- ---- 3. Reset de salon_settings a los defaults placeholder ----
delete from salon_settings;
insert into salon_settings (salon_name, address, phone, email, instagram_url, booksy_url, schedule_notes, payment_methods, policies_text)
values (
  'Tu Negocio Aquí',
  'Calle Principal 123, Municipio, PR 00000',
  '7870000000',
  'demo@suitcase.internal',
  'https://instagram.com/negocio',
  '',
  'Lun-Sáb 9am-6pm · Dom Cerrado',
  'Efectivo, Tarjeta de crédito/débito, ATH Móvil',
  'Se requiere depósito para servicios de $50 o más.'
);

-- ---- 4. Borra servicios y reinserta el catálogo placeholder ----
-- Mantiene las 4 categorías de ejemplo que trae business.config.ts por
-- default. Si reskineaste el catálogo para un prospecto específico, ajusta
-- estos INSERTs para que coincidan con lo que dejaste en config antes de
-- correr este script para ESE prospecto (ver RESKIN.md paso 3).
truncate table services restart identity cascade;
insert into services (category_id, category_title, name, description, duration, price, display_order, active) values
  ('manicure', 'Manicuras', 'Manicura Profunda', 'Limpieza profunda, corte de cutícula, limado, color y crema de manos.', '1h', '$45', 1, true),
  ('manicure', 'Manicuras', 'Remoción de Material', 'Remoción de gel o acrílico anterior.', '30min', '$20', 2, true),
  ('pedicure', 'Pedicuras', 'Pedicura Spa + Color', 'Cuidado de cutículas, exfoliación, hidratación, masaje y esmaltado.', '1h', '$55', 1, true),
  ('cabello', 'Cabello', 'Lavado y Secado', 'Lavado con productos premium y estilo.', '1h', 'Desde $25', 1, true),
  ('cabello', 'Cabello', 'Color / Balayage', 'Coloración con productos profesionales.', '3h', 'Desde $70', 2, true),
  ('cabinas', 'Cabinas', 'Renta de cabina (día)', 'Espacio para profesionales independientes.', '8h', 'Consultar', 1, true);

-- ---- 5. Especialistas placeholder ----
-- No se puede insertar en profiles sin un auth.users real detrás (FK). Este
-- proyecto de demo debe tener 1-2 usuarios specialist/admin creados UNA VEZ
-- (ver SETUP.md paso 4) — aquí solo se renombran/reactivan a nombres
-- placeholder en vez de recrearlos en cada reset.
update profiles set full_name = 'Especialista 1', role_label = 'Especialista', active = true
  where role = 'specialist'
  and id = (select id from profiles where role = 'specialist' order by created_at asc limit 1);
update profiles set full_name = 'Especialista 2', role_label = 'Especialista', active = true
  where role = 'specialist'
  and id = (select id from profiles where role = 'specialist' order by created_at asc offset 1 limit 1);

commit;

-- Después de correr esto: revisa en Table Editor que `bookings`,
-- `crm_clients`, `products` y `promotions` están vacías, que `services` y
-- `salon_settings` muestran el placeholder (o el del prospecto que sigue,
-- si ya reskineaste), y que no quedó ningún nombre real de un prospecto
-- anterior en ninguna tabla.
