# Suitcase

Repo/carpeta madre de todos los templates de proyectos web para clientes.
Cada tier vive en su propia carpeta. **MK5 siempre debe contener la versión
más actualizada de Klassy** — si se mejora el sistema de reservas para un
cliente y esa mejora es genérica (no específica de su negocio), se sube aquí.

```
suitcase/
  mk1-html-template/       ← HTML puro, un archivo, sin backend, listo para rebrand
  mk2-...                  ← (pendiente de construir) edición simple de fotos/texto/logo, sin roles
  mk3-...                  ← (pendiente de construir) formulario de contacto + panel para ver respuestas
  mk4-...                  ← (pendiente de construir) sistema de citas sencillo
  mk5-booking-system/      ← Vite+React+Supabase, sistema de reservas completo (ex-Klassy, antes MK2)
  mk5-prt/                 ← Instancia de DEMO/presentación de MK5 (no se copia por cliente)
  mk6-...                  ← (en diseño, aún sin código) sistema multi-admin con roles, permisos
                              granulares y módulos instalables (antes MK3)
```

## Qué tier usar

| Necesidad del cliente | Tier | Estado |
|---|---|---|
| Solo presencia web + botón de llamar/WhatsApp | **MK1** | Ya existe (`mk1-html-template/`) |
| Edición simple de fotos/texto/logo, sin roles | **MK2** | Pendiente de construir |
| Formulario de contacto + panel para ver respuestas | **MK3** | Pendiente de construir |
| Sistema de citas sencillo | **MK4** | Pendiente de construir |
| Reservas, especialistas, panel admin con roles | **MK5** | Ya existe (`mk5-booking-system/`) |
| Mostrarle a un prospecto un sitio con reservas funcionando ANTES de comprometerse (sin provisionar infraestructura real todavía) | **MK5_PRT** | Ya existe (`mk5-prt/`) |
| Sistema multi-admin con roles, permisos granulares y módulos instalables | **MK6** | En diseño, aún sin código |

## Regla de actualización de MK5

Cuando se le agregue una función genérica a un cliente construido sobre
MK5 (ej. un nuevo tipo de notificación, un fix de un bug real de RLS,
una mejora al flujo de reservas), esa mejora se retro-alimenta a
`mk5-booking-system/` en este repo — así el próximo cliente nuevo ya
nace con la versión mejorada, no con la vieja.

## Invocación

- "Hagamos un website basado en MK1" → usar `mk1-html-template/`
- "Hagamos un website basado en MK5" / "abre el Suitcase" → usar
  `mk5-booking-system/`, seguir su `SETUP.md`
- "Hagamos una demo/presentación" (o "necesito enseñarle algo a un
  prospecto antes de que decida") → usar `mk5-prt/`, seguir su `RESKIN.md`
  (la infraestructura ya existe, `SETUP.md` de esa carpeta es solo de
  referencia, se corrió una vez)

Nota: MK2, MK3, MK4 y MK6 todavía no tienen template ni carpeta — cuando se
construyan, su invocación se agrega aquí siguiendo el mismo patrón.

## Ver también

- `mk1-html-template/README.md` — cómo rebrandear el HTML simple
- `mk5-booking-system/README.md` y `SETUP.md` — cómo rebrandear y deployar
  el sistema completo (Supabase, Edge Functions, Vercel)
- `mk5-prt/README.md`, `SETUP.md` y `RESKIN.md` — la instancia de demo:
  qué está apagado/mockeado, cómo vestirla para un prospecto y cómo
  resetear los datos entre presentaciones
