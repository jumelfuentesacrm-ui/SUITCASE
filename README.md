# Suitcase

Repo/carpeta madre de todos los templates de proyectos web para clientes.
Cada tier vive en su propia carpeta. **MK2 siempre debe contener la versión
más actualizada de Klassy** — si se mejora el sistema de reservas para un
cliente y esa mejora es genérica (no específica de su negocio), se sube aquí.

```
suitcase/
  mk1-html-template/       ← HTML puro, un archivo, sin backend, listo para rebrand
  mk2-booking-system/      ← Vite+React+Supabase, sistema de reservas completo (ex-Klassy)
  mk2-prt/                 ← Instancia de DEMO/presentación (no se copia por cliente)
```

## Qué tier usar

| Necesidad del cliente | Tier |
|---|---|
| Solo presencia web + botón de llamar/WhatsApp | **MK1** |
| Reservas, especialistas, panel admin con roles | **MK2** |
| Mostrarle a un prospecto un sitio con reservas funcionando ANTES de comprometerse (sin provisionar infraestructura real todavía) | **MK2_PRT** |

(MK3, MK4, MK5 según la escala de madurez que ya usamos para categorizar
proyectos existentes — A+ CRM, Cataño, etc. — no son templates de arranque
todavía, son la descripción de qué tan evolucionado terminó un proyecto.
Si en el futuro se decide construir un template de arranque para esos
niveles, su carpeta va aquí mismo: `mk3-...`, `mk4-...`, etc.)

## Regla de actualización de MK2

Cuando se le agregue una función genérica a un cliente construido sobre
MK2 (ej. un nuevo tipo de notificación, un fix de un bug real de RLS,
una mejora al flujo de reservas), esa mejora se retro-alimenta a
`mk2-booking-system/` en este repo — así el próximo cliente nuevo ya
nace con la versión mejorada, no con la vieja.

## Invocación

- "Hagamos un website basado en MK1" → usar `mk1-html-template/`
- "Hagamos un website basado en MK2" / "abre el Suitcase" → usar
  `mk2-booking-system/`, seguir su `SETUP.md`
- "Hagamos una demo/presentación" (o "necesito enseñarle algo a un
  prospecto antes de que decida") → usar `mk2-prt/`, seguir su `RESKIN.md`
  (la infraestructura ya existe, `SETUP.md` de esa carpeta es solo de
  referencia, se corrió una vez)

## Ver también

- `mk1-html-template/README.md` — cómo rebrandear el HTML simple
- `mk2-booking-system/README.md` y `SETUP.md` — cómo rebrandear y deployar
  el sistema completo (Supabase, Edge Functions, Vercel)
- `mk2-prt/README.md`, `SETUP.md` y `RESKIN.md` — la instancia de demo:
  qué está apagado/mockeado, cómo vestirla para un prospecto y cómo
  resetear los datos entre presentaciones
