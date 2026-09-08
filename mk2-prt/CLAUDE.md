# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start dev server (Vite)
npm run build      # Production build (Nitro + Vercel preset)
npm run lint       # ESLint
npm run format     # Prettier
```

No test suite exists. Verify changes by running `npm run dev` and inspecting the browser.

## Architecture

**Stack:** React 19 + TanStack Start (SSR) + TanStack Router (file-based) + Supabase + Tailwind v4 + shadcn/ui. Deployed to Vercel via Nitro.

### Two distinct apps in one repo

| Area | Routes | Auth |
|---|---|---|
| **Public salon website** | `/`, `/servicios/*`, `/galeria`, `/nosotras`, `/contacto`, `/tienda` | None |
| **Admin/specialist panel** | `/admin` | Supabase Auth — role in `profiles.role` (`admin` or `specialist`) |

`/admin` is a **single giant route** (`src/routes/admin.tsx`). All admin views (Dashboard, Bookings, Clientes, Depositos, Productos, Promociones, Especialistas, Configuracion, Disponibilidad) are implemented as tab sections within that one file with internal state. Do not split it into sub-routes without careful planning.

### Routing

File-based via TanStack Router. `routeTree.gen.ts` is auto-generated — never edit by hand. Service sub-pages live in `src/routes/servicios/` (cabello, manicure, pedicure, estetica, index).

### Supabase

`src/lib/supabase.ts` exports two clients:
- `supabase` — uses anon key, for public/user operations
- `supabaseAdmin` — uses service_role key (`VITE_SUPABASE_SERVICE_KEY`), only import inside admin routes

Auth state drives the admin panel: the setup form (welcome screen) is skipped if `profiles.full_name` is already set in Supabase, not localStorage.

### Data layer

- `src/hooks/useServices.ts` — loads services from `services` table; falls back to static `data.ts` if DB is empty or errors
- `src/hooks/useSpecialists.ts` — loads from `profiles` (role=specialist, active=true) + `specialist_services` (approved=true)
- `src/config/business.config.ts` — the single rebrand file (identity, contact, hours, theme, service categories, staff, integration toggles). `src/components/site/data.ts` re-exports from it under the original constant names so components don't need to change.

### Styling

- Tailwind v4 (CSS-first config, no `tailwind.config.js`)
- shadcn/ui components in `src/components/ui/`
- Site components use **inline styles** (not Tailwind) for precise brand control — the salon aesthetic (dark/rose/gold) is intentional and hand-tuned
- Responsive breakpoints in site components are handled via `<style>` tags with `@media` blocks inside each component, not Tailwind breakpoints
- Mobile navbar: hamburger + drawer. Desktop navbar: grid with left nav, center logo, right CTA. The `isHome` + `scrolled` flags control color transitions on the homepage hero

### Navbar color logic

`dark = !isHome || scrolled` — transparent on homepage until scroll, solid dark on all other pages. Mobile back arrow (`mobile-back-btn`) shows on non-home pages; desktop nav hides below 900px via `.desktop-nav { display: none }`.

### Booking flow

`src/components/site/Booking.tsx` — multi-step form: category → service (+add-ons, reference photo for manicure) → specialist (first available or specific) → date/time → client info → policies → confirm. Availability is blocked in real-time from `bookings` table. On confirm, writes to `bookings` with `status: 'pending'`.

### This copy

This is the MK2 tier of the Suitcase template library — storage/reference
only, never deployed from here. Per-client work happens in that client's own
repo/clone; see `SETUP.md` for how to stand one up.

### Environment variables

See `.env.example` for the full list (Supabase, Stripe, Google Calendar,
WhatsApp, push/VAPID, notifications). Client-safe vars are prefixed `VITE_`
so Vite injects them at build time; the rest are server-only secrets used by
`/api/*` (Vercel serverless functions).
