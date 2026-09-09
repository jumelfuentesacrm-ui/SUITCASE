# MK5_PRT — Reskin para una presentación (repetible, apunta a &lt;15 min)

Esto se corre **antes de cada demo/presentación a un prospecto nuevo**, no
solo una vez. La infraestructura (Supabase, Vercel) ya existe — ver
`SETUP.md` — aquí solo se cambia la piel y se limpian los datos.

## Antes de empezar: la regla de no dejar rastro

**No hay lugar para el nombre de un prospecto anterior en este repo a largo
plazo.** Es válido commitear el reskin del prospecto X justo antes de su
demo — pero el **siguiente** reskin (prospecto Y) debe **reemplazar por
completo** ese commit, no acumularse encima. Nunca dejes:

- Nombres/colores/config de un prospecto pasado comentados "por si acaso"
- Archivos de assets viejos sin usar en `public/brand/`
- Datos de un prospecto en el historial reciente como el estado "vivo" del
  repo

Trata el estado commiteado de `mk5-prt` como **siempre el último reskin**,
listo para ser sobrescrito por el próximo. Si necesitas guardar el "look"
de un cliente que sí compró, eso se gradúa a su propia carpeta MK5 (ver
`SETUP.md` de MK5) — no se queda viviendo aquí.

## Qué necesitas del prospecto antes de tocar código

- Nombre del negocio, tagline corto, ciudad
- 3-4 categorías de servicio con nombres/precios/duraciones (no tienen que
  ser exactos, es para que la demo se sienta como su negocio)
- 1-2 nombres de "especialistas" de ejemplo
- Colores de marca (o una foto/página de referencia si no hay brand kit)
- Logo (o usa un placeholder de texto si no hay uno a mano)
- Una foto de portada (stock está bien para una demo)

Si falta algo, usa un placeholder razonable — esto es una demo de ventas,
no un sitio real; no bloquees el reskin esperando activos perfectos.

## Pasos (apunta a &lt;15 min, sin tocar infraestructura)

### 1. Editar `src/config/business.config.ts` (5-8 min)

Igual que en MK5: es el único archivo de datos de negocio. Cambia:
- `name`, `shortName`, `tagline`, `legalCity`
- `phone`/`phoneDisplay`/`whatsapp`/`email`/`address` (pueden ser
  placeholders plausibles, no hace falta que sean reales — es una demo)
- `theme` (colores de marca del prospecto)
- `serviceCategories` (usa el menú real que te dieron, o adapta las 4
  categorías de ejemplo con sus nombres/precios)
- `staff` (nombres de ejemplo del equipo del prospecto)
- `copy.heroHeadline`, `copy.aboutBody`, `copy.whyBody` si quieres que se
  sienta más a medida

**No toques** `notifications` ni `integrations` — quédate con los defaults
apagados (ver sección abajo, "Qué se deja apagado y por qué").

### 2. Reemplazar assets en `public/brand/` (3-5 min)

Ver `public/README-ASSETS.txt` para la lista completa (logo, hero, favicon).
Para una demo, no necesitas fotos custom del negocio real del prospecto —
un logo de texto simple y una foto de stock relevante al rubro (salón,
barbería, spa, etc.) es más que suficiente.

### 3. Resetear los datos de Supabase (2 min)

Antes de la llamada, deja la base de datos limpia de lo que quedó de la
última demo:

```bash
export DEMO_DATABASE_URL="postgresql://postgres:...@db.xxxx.supabase.co:5432/postgres"
npm run demo:reset
```

Esto corre `supabase-demo-seed.sql`: vacía `bookings`, `deposits`,
`crm_clients`, `products`, `promotions`, notificaciones y logs de admin de
la presentación anterior, y reinserta un catálogo de `services` limpio.
Si cambiaste el catálogo en el paso 1 para que coincida con el menú real
del prospecto, edita los `INSERT` de `supabase-demo-seed.sql` para que
reflejen ESE catálogo antes de correr el reset — así el sitio público y el
panel admin muestran lo mismo.

Sin `psql` a mano: pega el contenido de `supabase-demo-seed.sql`
directamente en Supabase Dashboard → SQL Editor → Run.

### 4. Deploy (1-2 min)

```bash
git add -A
git commit -m "reskin: demo para <prospecto>"
git push
```

Vercel redeploya solo (mismo proyecto de siempre, no uno nuevo).

### 5. Verifica antes de la llamada

- [ ] El sitio público carga con el nombre/colores/logo del prospecto
- [ ] `/admin` funciona con el usuario de prueba (ver `SETUP.md` paso 1.5)
      y muestra los datos placeholder limpios, no los del prospecto pasado
- [ ] Hacer una reserva de prueba de principio a fin funciona
- [ ] Las tabs de Stripe/Google Calendar/WhatsApp en Configuración se ven
      pero están claramente marcadas como no activas (esto es intencional,
      ver abajo) — no prometas que están "encendidas" en la demo
- [ ] No quedó ningún emoji fuera de lugar ni em-dash en el copy nuevo

## Qué se deja apagado/simulado y por qué

- **Stripe, Google Calendar, WhatsApp**: `enabled: false` siempre en esta
  instancia. No hay cuenta real de terceros detrás de un prospecto que
  todavía no es cliente — activarlos requeriría credenciales reales que no
  existen para una demo. El admin muestra estas secciones como parte del
  producto (para que el prospecto vea que existen) sin necesitar que
  funcionen de punta a punta.
- **`notifications.sendCustomerConfirmation` / `sendOwnerAlert`**: apagadas
  por default — no hay un dueño real al que avisarle. Si en una
  presentación específica quieres mostrar visualmente que la confirmación
  por correo funciona, préndelas apuntando `notifications.ownerEmail` a un
  correo de demo controlado por el equipo (nunca al correo real del
  prospecto), demuéstralo, y vuelve a apagarlas (o simplemente corre
  `demo:reset` antes de la siguiente presentación, que no las toca — son
  config, no datos, así que revierte ese cambio a mano en el próximo
  reskin).
- **Push notifications**: apagadas por default por la misma razón —
  requieren VAPID keys reales; no aportan a la demo en sí.

## Después de la presentación

Si el prospecto compra: la siguiente conversación es "Hagamos un website
basado en MK5" (ver README raíz de Suitcase) — se parte de
`mk5-booking-system/`, NO de esta carpeta, y se hace el setup real con su
propio proyecto de Supabase/Vercel/dominio.

Si no compra (o antes de la siguiente demo agendada): deja el repo como
está hasta que llegue el próximo prospecto — el próximo reskin sobrescribe
este, según la regla de arriba.
