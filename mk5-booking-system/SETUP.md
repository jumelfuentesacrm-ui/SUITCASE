# MK5 — Setup técnico (checklist de deploy, cliente nuevo)

Objetivo realista: **de cero a sitio live con reservas funcionando en menos
de 30 min** para la parte repetible (Supabase + Vercel + rebrand). Los
integrations externas de terceros (Stripe, Google Calendar, WhatsApp
Business) NO entran en esos 30 min — dependen de que el cliente tenga (o
cree) sus propias cuentas y aprobaciones externas, que pueden tardar de
horas a varios días (verificación de negocio de Meta para WhatsApp, por
ejemplo). Trátalos como fases aparte, después de que el sitio base ya esté
vivo y tomando reservas.

Todo lo que NO es infraestructura (fotos, colores, textos, precios) va en
`src/config/business.config.ts` y no debería tomar tiempo técnico — ver
comentario en la cabecera de ese archivo.

---

## 0. Antes de tocar nada — Intake del cliente (5 min)

Junta esto ANTES de crear el proyecto en Supabase:

- [ ] Nombre del negocio, tagline, ciudad
- [ ] Teléfono, WhatsApp, email, dirección, redes (Instagram/Facebook), Booksy si aplica
- [ ] Horario (días cerrados, hora apertura/cierre, duración de cita estándar)
- [ ] Categorías de servicio y lista de servicios con precio/duración
- [ ] Nombres del equipo/especialistas
- [ ] Colores/logo — o foto de referencia si no hay brand kit
- [ ] Fuente de fotos: ¿el cliente las manda, o usamos las de demo mientras tanto?
- [ ] Correo dueño para recibir aviso de reservas nuevas (push + owner alert)
- [ ] Dominio: ¿ya tiene uno o se compra?
- [ ] ¿Cuáles integraciones quiere activas? Marca cada una en
      `business.config.ts → integrations` (todas empiezan en `enabled: false`
      salvo `pushNotifications`):
  - [ ] Cobro con tarjeta (Stripe) — requiere cuenta Stripe del cliente
  - [ ] Sincronización con Google Calendar — requiere cuenta de servicio de Google Cloud
  - [ ] Mensajes de WhatsApp automatizados — requiere WhatsApp Business API (Meta)

---

## 1. Supabase — crear proyecto (5 min)

1. [supabase.com](https://supabase.com) → **New project**
2. Nombre del proyecto, región más cercana (`us-east-1`), guarda la contraseña de DB
3. Espera ~2 min a que aprovisione

## 2. Supabase — correr el schema (2 min)

Este repo trae dos archivos `.sql` en la raíz. Para un cliente **nuevo**,
corre en este orden:

1. **`supabase-full-schema.sql`** — el schema completo y actual (tablas,
   RLS, políticas). Es la base; NO trae datos de servicios de ejemplo, así
   que no hay que limpiar catálogo de nadie después. Pégalo entero en
   **SQL Editor → New query → Run**.
2. **`supabase-optional-vip-hours.sql`** — sólo si el cliente va a usar la
   función de "Horario VIP" (franjas fuera de horario con recargo, columnas
   `is_vip` / `vip_surcharge` en `bookings`). Opcional; sáltalo si no aplica.

Verifica en **Table Editor** que aparecieron: `services`, `specialists`
(vía `profiles`), `bookings`, `profiles`, `products`, `deposits`,
`salon_settings`, `notifications`.

## 3. Supabase — Storage (2 min)

Dashboard → **Storage** → crea dos buckets **públicos**:
- `services` (fotos de servicios)
- `products` (fotos de productos/tienda)
- `avatars` (fotos de perfil del equipo — usado por admin.tsx)

## 4. Supabase — Realtime (opcional, 1 min)

Dashboard → **Database** → **Replication** → activa la tabla `bookings`
(para que el panel admin se actualice solo cuando entra una reserva nueva).

## 5. Supabase — obtener las keys (1 min)

Dashboard → **Project Settings** → **API**:
- `Project URL` → `VITE_SUPABASE_URL` y `SUPABASE_URL`
- `anon public key` → `VITE_SUPABASE_ANON_KEY`
- `service_role key` (¡secreta, no exponer al cliente!) → `SUPABASE_SERVICE_KEY`
  y `VITE_SUPABASE_SERVICE_KEY` (ver nota en `.env.example` — admin.tsx la
  lee vía la variable con prefijo `VITE_`, las funciones `/api/*` vía la que
  no lo tiene; pon el mismo valor en ambas)

## 6. Notificaciones push (Web Push / VAPID) (5 min)

Este template usa Web Push nativo (no un servicio de email de terceros):

```bash
npx web-push generate-vapid-keys
```

Guarda `VAPID_PUBLIC` / `VAPID_PRIVATE` como variables de entorno en Vercel
(no en el bundle del cliente). Si vas a desplegar la Edge Function
`supabase/functions/send-push` (empuja notificaciones desde la base de
datos directamente), configura también ahí:

```bash
supabase functions deploy send-push
supabase secrets set VAPID_PUBLIC=... VAPID_PRIVATE=... OWNER_NOTIFICATION_EMAIL=info@delcliente.com
```

`SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` ya existen automáticamente como
secrets del proyecto — no hay que configurarlos a mano.

## 7. Crear el primer usuario Admin (2 min)

1. Dashboard → **Authentication** → **Users** → **Add user** (email + password)
2. SQL Editor → correr:
   ```sql
   update profiles set role = 'admin' where id = '<uuid del usuario que acabas de crear>';
   ```
   (si `full_name`/`role` no existen aún en `profiles` para ese usuario,
   inserta la fila en vez de actualizarla — ver el INSERT de ejemplo al
   final de `supabase-full-schema.sql`)
3. Ese correo/contraseña es el login en `/admin`

## 8. Rebrand — editar UN archivo (10-15 min)

Abre `src/config/business.config.ts` y llena todo con los datos del intake
del paso 0: nombre, colores, teléfono, horario, categorías de servicio,
staff, copy. Crea `/public/brand/*` con los assets reales del cliente (ver
`public/README-ASSETS.txt` para la lista completa y las dimensiones
recomendadas) — el repo se dejó sin fotos de demo a propósito.

Confirma que no quedó ningún dato de plantilla genérico sin llenar
(`"Nombre del Negocio"`, `7870000000`, etc.) — si queda algún punto del
código que no se pudo mover 100% a config, debería tener un comentario
`// TODO(suitcase): ...`; revísalos también (`grep -rn "TODO(suitcase)" src api`).

## 9. Cargar servicios y especialistas iniciales

Opción rápida: Table Editor de Supabase, insertar filas a mano en `services`
y `profiles` (specialists) con los datos del intake.
Opción mejor: entrar a `/admin` (tabs Servicios / Especialistas) una vez
deployado y cargarlos desde ahí.

## 10. Deploy a Vercel (5 min)

1. Sube este proyecto a un repo de GitHub propio del cliente (NO pushees al
   repo Suitcase — este repo es solo la plantilla de referencia)
2. [vercel.com](https://vercel.com) → **New Project** → importa el repo
3. Framework preset: detecta Vite/Nitro automáticamente (`vercel.json` ya
   trae el cron de `daily-summary`)
4. **Environment Variables** — copia todo `.env.example` con los valores
   reales del cliente. Como mínimo para que el sitio cargue:
   - `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_KEY`, `VITE_SUPABASE_SERVICE_KEY`, `SUPABASE_URL`
   - `OWNER_NOTIFICATION_EMAIL`, `CRON_SECRET`, `SITE_URL`
   El resto (`STRIPE_*`, `GOOGLE_*`, `WHATSAPP_*`, `VAPID_*`) solo si esa
   integración está `enabled: true` en `business.config.ts`.
5. Deploy

## 11. Dominio (si el cliente ya tiene uno)

- Vercel → proyecto → **Settings** → **Domains** → agrega el dominio
- En el proveedor del dominio: apunta los **Nameservers** a los que Vercel
  indique, o crea un registro `A`/`CNAME` según lo que pida Vercel
- Avisa de antemano al cliente: el certificado SSL puede tardar hasta
  ~30-60 min en propagar — es normal ver `ERR_SSL_PROTOCOL_ERROR` durante
  ese rato.

---

## Integraciones opcionales (fuera de los 30 min — planifícalas aparte)

### Stripe (cobro con tarjeta / depósitos)
- El cliente crea su propia cuenta en [stripe.com](https://stripe.com) —
  puede tardar días si Stripe pide verificación adicional de negocio.
- `STRIPE_SECRET_KEY` y `STRIPE_WEBHOOK_SECRET` (Dashboard → Developers →
  Webhooks → apunta a `/api/stripe-webhook`, evento `checkout.session.completed`).
- Activa `integrations.stripe.enabled = true` en `business.config.ts`.

### Google Calendar (sincronizar citas)
- Requiere un proyecto en Google Cloud Console + una cuenta de servicio con
  la Calendar API habilitada, y compartir el calendario del negocio con el
  email de esa cuenta de servicio (rol "Hacer cambios en eventos").
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`,
  `GOOGLE_CALENDAR_ID`.
- Colores por especialista: `api/gcal-add-event.ts` tiene un
  `// TODO(suitcase)` — hoy asigna color por nombre hardcodeado como
  ejemplo; para producción real, si quieres colores fijos por persona en
  vez del hash automático, actualiza ese mapa con los nombres reales del
  equipo del cliente.
- Activa `integrations.googleCalendar.enabled = true`.

### WhatsApp (mensajes automatizados al cliente)
- Requiere WhatsApp Business Platform (Meta) — número verificado, y
  plantillas de mensaje (template) aprobadas por Meta, que pueden tardar de
  horas a días en revisión.
- `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_VERIFY_TOKEN`,
  `WHATSAPP_ADMIN_PHONE`, `WHATSAPP_TEMPLATE_ADMIN_NEW_BOOKING`.
- El webhook de verificación/eventos vive en `api/whatsapp-send.ts` (ver
  comentario en la cabecera de ese archivo sobre el Callback URL a usar en
  WhatsApp Manager).
- Activa `integrations.whatsapp.enabled = true`. Mientras tanto, el botón
  de WhatsApp del sitio (`wa.me/...`) funciona sin ninguna de estas
  variables — es solo un link, no la API.

---

## Checklist de calidad antes de entregar

- [ ] Cero emojis salvo, si acaso, uno en el CTA de llamar
- [ ] Cero em-dashes (—) en el copy nuevo que agregues
- [ ] Iconos en SVG, no emoji
- [ ] Probado en móvil real, no solo desktop
- [ ] Probado hacer una reserva de principio a fin en producción (no solo en local)
- [ ] Probado que llega la notificación push de reserva nueva (revisar que
      el navegador/dispositivo dio permiso de notificaciones)
- [ ] Confirmado que `business.config.ts` no dejó ningún dato del template
      genérico (`"Nombre del Negocio"`, teléfono `000-0000`, etc.)
- [ ] `grep -rn "TODO(suitcase)" src api` no tiene pendientes relevantes para este cliente
- [ ] Si Stripe/gcal/WhatsApp están activos: probado un flujo real de cada uno, no solo que la variable de entorno esté puesta

---

## El siguiente proyecto: cómo invocarlo

Cuando en el chat se escriba:

> **"Hagamos un website basado en MK5"**

1. Se abre este mismo template como punto de partida (no se reconstruye desde cero)
2. Se corre el intake del paso 0 primero — si falta un dato, se pregunta, no se asume
3. Una vez hay intake completo, se edita SOLO `business.config.ts` (más los
   assets en `/public`) y se carga contenido inicial de servicios/equipo
4. Se sigue este SETUP.md en orden para Supabase + Vercel, y luego las
   integraciones opcionales que el cliente haya pedido
5. Se corre el checklist de calidad antes de entregar el link al cliente

**Regla del template MK5 (viene del proyecto original):** si en el proceso
se agrega o mejora algo genuinamente reutilizable (un patrón de UI, un fix
de bug, una integración nueva) que no es específico de ESE cliente, ese
cambio debe reportarse para actualizarlo también aquí, en Suitcase — no se
queda atrapado solo en el repo del cliente.
