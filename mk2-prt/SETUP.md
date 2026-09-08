# MK2_PRT — Setup de infraestructura (UNA SOLA VEZ, nunca por prospecto)

`mk2-prt` es una instancia de **demo/presentación**, no un template que se
copia por cliente. Existe **un** proyecto de Supabase y **un** proyecto de
Vercel para esta carpeta, y se reutilizan para todas las presentaciones,
una detrás de otra (nunca dos demos en paralelo en la misma instancia).

Este setup se corre **una sola vez**, al crear la demo. Para vestirla con
los datos de un prospecto antes de una llamada, ver **`RESKIN.md`** —
eso es lo que se repite en cada presentación, no esto.

---

## 1. Supabase — crear el proyecto de demo (una vez)

1. [supabase.com](https://supabase.com) → **New project** → nómbralo algo
   como `suitcase-mk2-prt-demo` para que sea obvio que no es un cliente.
2. SQL Editor → pega y corre `supabase-full-schema.sql` (el mismo schema
   que usa MK2, sin cambios).
3. Opcional: corre también `supabase-optional-vip-hours.sql` si quieres
   poder demostrar esa función en presentaciones.
4. Storage → crea los buckets públicos `services`, `products`, `avatars`
   (igual que en MK2).
5. Authentication → Users → crea 1-2 usuarios de prueba (ej.
   `demo-admin@suitcase.internal`, `demo-specialist@suitcase.internal`) y
   márcalos con el rol correcto en `profiles` (ver MK2 `SETUP.md` paso 7
   para el SQL exacto). Estos usuarios NO se recrean por presentación —
   `demo:reset` solo les renombra el `full_name` visible.
6. Project Settings → API → copia las keys a tu `.env.local` (ver
   `.env.example`) y a las Environment Variables de Vercel (paso 3).
7. Guarda la connection string (Project Settings → Database → Connection
   string → URI) para `DEMO_DATABASE_URL`, usada por `npm run demo:reset`
   (ver `RESKIN.md`).

## 2. Notificaciones e integraciones — NO se configuran

A propósito, esta instancia **no** provisiona Resend, Stripe, Google
Calendar ni WhatsApp reales — ver `business.config.ts → notifications` e
`integrations`, todo apagado por default. La UI muestra que la función
existe (botones, secciones del admin) sin necesitar credenciales de
terceros. No actives ninguna integración con datos reales de un prospecto.

## 3. Deploy a Vercel (una vez)

1. Vercel → **New Project** → importa el repo Suitcase, pero con **Root
   Directory = `mk2-prt`** (así el resto del monorepo no se despliega).
2. Environment Variables: copia `.env.example` con los valores del
   proyecto de Supabase de demo del paso 1. Dejar vacías las de
   Stripe/Google/WhatsApp/VAPID — no se usan.
3. Deploy. Este es el único deploy — las siguientes presentaciones son
   `git push` a esta misma carpeta, no un proyecto de Vercel nuevo.
4. Dominio opcional: un subdominio propio (ej. `demo.tuestudio.com`) es
   suficiente, no hace falta un dominio por prospecto.

## 4. Verifica que quedó en estado demo, no de cliente

- `business.config.ts` tiene los placeholders (`"Tu Negocio Aquí"`, etc.)
- `integrations.*.enabled` y `notifications.send*` en `false`
- `npm run demo:reset` corre sin errores contra el proyecto de Supabase de
  demo (ver `RESKIN.md`)

---

A partir de aquí, cada vez que haya una presentación: **no repitas este
documento**, sigue `RESKIN.md`.
