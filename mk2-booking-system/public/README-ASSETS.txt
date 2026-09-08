ASSETS — MK2 booking system
============================

Esta carpeta se dejó con las fotos de demo del cliente original (Klassy
Salon) bajo /public/klassy/*, PARA QUE EL SITIO SE VEA COMPLETO desde el
primer `npm run dev`. Úsalas como placeholder mientras llegan los assets
reales, o reemplázalas directamente.

Para un cliente nuevo, sustituye (o crea) lo siguiente:

  /public/klassy/logo-new.png       — logo horizontal, fondo transparente, ~400x120px
  /public/klassy/salon-interior.jpg — foto hero / og:image, 1600x900px aprox.
  /public/klassy/ks-icon.svg        — favicon SVG
  /public/klassy/icon-16.png        — favicon 16x16
  /public/klassy/icon-32.png        — favicon 32x32
  /public/klassy/icon-180.png       — apple-touch-icon 180x180
  /public/klassy/icon-192.png       — PWA icon 192x192 (manifest.json)
  /public/klassy/icon-512.png       — PWA icon 512x512 (manifest.json)
  /public/klassy/logo.jpg           — admin PWA icon (admin-manifest.json)
  /public/klassy/*hero*.jpg         — hero carousel slides (src/components/site/Hero.tsx)
  /public/klassy/port-*.jpg         — portfolio grid (src/components/site/data.ts → PORTFOLIO)
  /public/klassy/*.jpg (services)   — category/service page images, see
                                       src/components/site/Services.tsx and
                                       src/routes/servicios/*.tsx for the exact list used

Opcional pero recomendado: mover todo a /public/brand/ con nombres genéricos
y actualizar los paths en src/config/business.config.ts (logoUrl,
heroImageUrl, faviconSvg, seo.ogImage) — el resto del código ya lee esos
paths desde la config, así que solo hay que tocar ese archivo.

No se requiere mantener el nombre de carpeta "klassy" — es simplemente el
que trae el checkout original; renómbrala si prefieres, actualizando las
referencias en business.config.ts y en los routes de /servicios que aún
apuntan directo a /klassy/... (ver comentarios TODO(suitcase) en esos
archivos).
