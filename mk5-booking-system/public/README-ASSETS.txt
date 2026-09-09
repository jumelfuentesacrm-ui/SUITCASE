ASSETS — MK5 booking system
============================

Esta carpeta se dejó A PROPÓSITO sin fotos reales. Suitcase es un template
sin datos de ningún cliente pasado — todas las rutas de imagen del código
apuntan a /public/brand/... y ese directorio no existe hasta que lo crees
con los assets del cliente nuevo. El sitio se ve incompleto en
`npm run dev` hasta que agregues estos archivos; eso es intencional.

Crea /public/brand/ y agrega lo siguiente (nombre exacto, dimensión
aproximada):

  Identidad / PWA
  ---------------
  /public/brand/logo.png            — logo horizontal, fondo transparente, ~400x120px (business.config.ts → logoUrl)
  /public/brand/logo-wordmark.png   — opcional, solo si el cliente tiene un wordmark aparte del logo+nombre (Footer.tsx, detrás de business.brandBadge)
  /public/brand/mark.svg            — ícono/isotipo simple para el footer (Footer.tsx)
  /public/brand/favicon.svg         — favicon SVG (business.config.ts → faviconSvg)
  /public/brand/icon-16.png         — favicon 16x16
  /public/brand/icon-32.png         — favicon 32x32
  /public/brand/icon-180.png        — apple-touch-icon 180x180
  /public/brand/icon-192.png        — PWA icon 192x192 (manifest.json, admin-manifest.json)
  /public/brand/icon-512.png        — PWA icon 512x512 (manifest.json, admin-manifest.json)

  Hero / secciones home
  ----------------------
  /public/brand/hero.jpg            — foto hero / og:image, 1600x900px aprox. (business.config.ts → heroImageUrl, seo.ogImage)
  /public/brand/hero-slide-1..4.jpg — carrusel del hero (src/components/site/Hero.tsx)
  /public/brand/about-photo.jpg     — foto de la sección "Sobre nosotros" (About.tsx)
  /public/brand/why-section-photo.jpg — foto de la sección "¿Por qué nosotros?" (WhySection.tsx)
  /public/brand/portfolio-1..8.jpg  — grid de portafolio (src/components/site/data.ts → PORTFOLIO)

  Servicios (home + páginas /servicios/*)
  ----------------------------------------
  /public/brand/servicios-hero.jpg     — hero de /servicios (src/routes/servicios/index.tsx)
  /public/brand/servicios-manicure.jpg — Services.tsx + /servicios/manicure
  /public/brand/servicios-pedicure.jpg — Services.tsx + /servicios/pedicure
  /public/brand/servicios-cabello.jpg  — Services.tsx + /servicios/cabello
  /public/brand/servicios-cabinas.jpg  — Services.tsx + /servicios/cabinas
  /public/brand/gallery-manicure-1..9.jpg — carrusel de la página de manicure
  /public/brand/gallery-cabello-1..10.jpg — carrusel de la página de cabello
  /public/brand/gallery-pedicure-1.jpg    — og:image de la página de pedicure
  /public/brand/cabina-1.jpg, cabina-2.jpg — ejemplo de cabinas independientes (renombra/agrega según las cabinas reales del cliente, src/routes/servicios/cabinas/*)

  Otras páginas
  -------------
  /public/brand/contacto-hero.jpg      — hero de /contacto
  /public/brand/nosotras-hero.jpg      — hero de /nosotras
  /public/brand/sobre-nosotros-1..3.jpg — galería de /sobre-nosotros
  /public/brand/galeria-1..8.jpg        — galería completa /galeria

Para el menú/servicios/precios reales, edita src/config/business.config.ts
→ serviceCategories (y su seo/copy) — no hace falta tocar ningún componente.

No se requiere que uses exactamente estos nombres de archivo — son los
paths que el checkout de este template ya usa. Si prefieres otra
convención, actualiza las referencias en business.config.ts, en los
componentes de src/components/site/ y en los routes de /servicios,
/contacto, /nosotras, /sobre-nosotros y /galeria.
