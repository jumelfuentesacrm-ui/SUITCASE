# MK2 Template -- Edicion simple de fotos/texto/logo

Un escalon arriba de MK1 (HTML estatico sin backend), muy por debajo de MK5
(sistema de reservas completo). El caso de uso: el dueno del negocio quiere
poder editar su propio texto, fotos y logo sin depender de un desarrollador
cada vez -- pero no necesita reservas, formulario de contacto con panel de
respuestas, ni roles/permisos.

## Cuando usar MK2 en vez de MK1 o MK5

| Necesidad del cliente | Tier |
|---|---|
| Solo presencia web + boton de llamar/WhatsApp, nunca lo va a editar el mismo | **MK1** |
| Presencia web + el dueno quiere poder cambiar texto/fotos/logo el mismo, sin roles | **MK2** (este) |
| Formulario de contacto con panel de respuestas | **MK3** |
| Sistema de citas sencillo | **MK4** |
| Reservas, especialistas, panel admin con roles | **MK5** |

## Que incluye

- Sitio publico de una sola pagina: navbar, hero, sobre nosotros, servicios
  (lista de texto, sin precios/booking), galeria, contacto, footer
- `/admin`: login y formulario para editar todo el contenido de arriba y
  subir/reemplazar logo, foto de portada y fotos de galeria
- Supabase Auth con **un solo usuario admin** por sitio -- no hay tabla de
  roles ni niveles de permiso, el login simplemente abre o cierra `/admin`
- Una sola tabla (`site_content`, una fila) + un bucket de Storage
  (`site-media`) para las imagenes
- Guardado directo (no hay flujo de borrador/publicar) -- el boton
  "Guardar" escribe directo a la base de datos y el cambio es inmediato en
  el sitio publico

## Que NO incluye (a proposito)

- Reservas, servicios con precio/duracion, especialistas
- Formulario de contacto / panel de mensajes
- Roles, permisos, multi-usuario
- Notificaciones, Stripe, Google Calendar, WhatsApp API (el boton de
  WhatsApp del sitio es solo un link `wa.me/...`, no la API)

Si el cliente pide algo de esta lista, no es MK2 -- sube a MK3/MK4/MK5.

## Empezar

```bash
npm install
cp .env.example .env.local   # y llena las keys de tu proyecto de Supabase
npm run dev
```

Luego sigue **SETUP.md** para Supabase + Vercel -- es un checklist mucho mas
corto que el de MK5, porque no hay Edge Functions, ni Stripe, ni Google
Calendar, ni WhatsApp Business que configurar.

## Estructura

```
src/
  config/content.ts     <- contenido "seed" por defecto (placeholder
                            generico, primera carga antes de que exista
                            la fila real). El rebrand real NO se hace
                            editando este archivo -- se hace desde /admin.
  lib/
    supabase.ts          <- cliente de Supabase
    useSiteContent.ts    <- lee/escribe la fila unica de site_content
    useAuth.ts           <- sesion de Supabase Auth (un solo admin)
  components/
    icons.tsx            <- iconos SVG (sin emoji)
    ImageUploadField.tsx <- input de archivo + subida a Storage
  pages/
    PublicSite.tsx        <- el sitio de marketing
    Login.tsx             <- /login
    Admin.tsx             <- /admin, el formulario de edicion
supabase/
  schema.sql             <- tabla site_content + bucket site-media + RLS
```

## Regla de oro

Igual que en los demas tiers: si vas a hacer un cambio puntual para un
cliente que ya tiene el sitio deployado, edita el archivo real -- no
reconstruyas nada desde cero. Y si en el trabajo con un cliente encuentras
algo genuinamente reutilizable (un fix, un campo nuevo que casi todo mundo
pide) que no es especifico de ese cliente, reportalo para traerlo de vuelta
a este template en Suitcase.
