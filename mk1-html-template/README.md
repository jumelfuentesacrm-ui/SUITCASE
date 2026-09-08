# MK1 — Template HTML listo para rebrand

Un solo archivo (`index.html`), sin build, sin backend. Para negocios que
solo necesitan presencia web + botón de llamar/WhatsApp — no reservas.

## Cómo rebrandear

Abre `index.html`, busca el bloque `const CONFIG = { ... }` cerca del inicio
del `<script>`, y llena los valores reales del cliente: nombre, tagline,
imágenes (hero y about), teléfono, WhatsApp, correo, dirección, redes,
colores, stats, servicios, testimonio, y el copy del CTA final.

**No toques nada fuera de ese bloque.** Todo el HTML lee de `CONFIG`
automáticamente vía atributos `data-*` y JS al cargar la página.

## Checklist de calidad (ya aplicado en el template base, no lo rompas)

- [ ] Cero emojis (excepto, si acaso, el ícono de teléfono del botón flotante, que ya es SVG no emoji)
- [ ] Cero em-dashes en el copy
- [ ] Iconos SVG, no emoji
- [ ] Probado en móvil real
- [ ] Ningún dato de ejemplo ("Nombre del Negocio", "000-0000") quedó sin reemplazar

## Cuándo usar MK1 en vez de MK2

- Cliente sin necesidad de sistema de citas/reservas → MK1
- Cliente que necesita agendar citas, especialistas, panel admin → MK2 (`../mk2-booking-system`)

## Deploy

Sin build step. Sube el archivo tal cual a Netlify/Vercel (drag & drop del
archivo o conectado a un repo con un solo `index.html` en la raíz), o a
cualquier hosting estático.
