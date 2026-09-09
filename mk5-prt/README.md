# MK5_PRT — Instancia de Demo/Presentación

**Esto NO es un template que se copia por cliente — es una única instancia
siempre desplegada**, usada para mostrarle a un prospecto un sitio con
reservas funcionando de verdad, antes de invertir el setup real de un
cliente (MK5). Mismo motor que `mk5-booking-system/`, copiado una vez como
punto de partida: **React 19 + TanStack Start (SSR) + TanStack Router +
Supabase + Tailwind v4**, deploy en **Vercel** (Nitro).

- Setup de infraestructura (Supabase + Vercel), **una sola vez**: `SETUP.md`
- "Vestir" la demo para el próximo prospecto, **antes de cada
  presentación**: `RESKIN.md` — léelo primero, es el flujo del día a día
- Integraciones (Stripe, Google Calendar, WhatsApp, push) apagadas por
  default — la demo las muestra en el admin sin necesitar cuentas reales
  de terceros

## Qué incluye

## Qué incluye

- Sitio público: home, páginas por categoría de servicio, galería, tienda
  (gift cards + productos), flujo de reservas completo (categoría →
  servicio → especialista → fecha/hora → datos → políticas → confirmación)
- Panel admin (`/admin`) — una sola ruta con tabs: Dashboard, Reservas,
  Clientes (CRM), Depósitos, Productos, Promociones, Especialistas,
  Configuración, Disponibilidad. 2 roles: **admin** (ve todo) y
  **specialist** (solo sus propias citas)
- Base de datos en varios archivos `supabase-*.sql` (ver `SETUP.md` para el
  orden correcto — no son intercambiables, son el historial real del
  schema) con Row Level Security configurado
- Integraciones opcionales, todas apagables por config
  (`business.config.ts → integrations`):
  - **Stripe** — checkout de depósitos/pagos (`api/stripe-*.ts`)
  - **Google Calendar** — sincroniza cada reserva como evento (`api/gcal-*.ts`)
  - **WhatsApp** — envío de plantillas + webhook de Meta (`api/whatsapp-send.ts`)
  - **Push notifications** (Web Push/VAPID) — avisa al dueño/especialista de
    reservas nuevas en tiempo real (`api/notify.ts`, `api/send-push.ts`,
    `supabase/functions/send-push`)
  - **ICS / PDF** — el cliente puede agregar su cita al calendario
    (`api/ics.ts`), y el sistema genera resúmenes/recibos
- Un único archivo de rebrand: `src/config/business.config.ts`

## Empezar

```bash
npm install
cp .env.example .env.local   # y llena las keys de tu proyecto de Supabase
npm run dev
```

Luego sigue **SETUP.md** paso a paso para Supabase, integraciones y Vercel —
incluye un checklist de intake, el orden correcto de los archivos SQL, y qué
integraciones toman más de los "30 minutos" ideales por depender de cuentas
externas del cliente (Stripe, Google, Meta/WhatsApp).

## Estructura

```
src/
  config/business.config.ts   ← ÚNICO archivo que se toca para rebrandear
  components/site/            ← Navbar, Hero, Services, Booking, Footer, etc.
                                 (data.ts re-exporta desde business.config.ts,
                                 no dupliques datos de negocio ahí)
  routes/                     ← file-based routing (TanStack Router):
                                 index, servicios/*, galeria, contacto,
                                 nosotras, tienda, admin, login
  lib/                        ← supabase client, scheduling helpers
  hooks/                      ← useServices, useSpecialists, useScrollReveal
api/                          ← funciones serverless de Vercel (Stripe, gcal,
                                 WhatsApp, push, ICS, resumen diario)
supabase/
  functions/send-push/        ← Edge Function de Web Push
supabase-full-schema.sql      ← schema completo, punto de partida para un
                                 cliente nuevo (ver SETUP.md)
supabase-optional-vip-hours.sql  ← migración "Horario VIP", opcional
public/README-ASSETS.txt     ← qué imágenes crear en /public/brand/ y con
                                 qué nombre/tamaño (carpeta vacía por diseño)
```

## Regla de oro

Si vas a hacer un cambio puntual para un cliente que ya tiene el sitio
deployado (agregar un servicio, cambiar un texto, un botón nuevo): **edita
el archivo real, no reconstruyas nada desde cero.** Cambios quirúrgicos,
igual que se hizo al genericizar este template — la mayoría de los datos de
negocio viven en un solo archivo (`business.config.ts`) precisamente para
que estos cambios sean baratos.

Si en el trabajo con un cliente descubres algo genuinamente reutilizable
(un fix, un patrón nuevo, una integración) que no es específico de ese
cliente, repórtalo para traerlo de vuelta a este template en Suitcase — ver
la raíz del repo (`README.md`) para la regla completa de feedback MK5.
