// ============================================================================
// ARCHIVO ÚNICO DE REBRAND — MK5_PRT (instancia de demo/presentación)
// Este es el ÚNICO archivo que se toca para "vestir" esta demo con los datos
// de un prospecto antes de una presentación (ver RESKIN.md en la raíz del
// proyecto). Nada de esto debe estar hardcodeado en ningún componente. Si
// encuentras un texto, color, precio o dato de negocio hardcodeado en un
// componente, es un bug — muévelo aquí (o deja un comentario
// `// TODO(suitcase): ...` si no se pudo mover a tiempo).
//
// Nota: los archivos estáticos que el navegador/PWA lee ANTES de que corra
// JS (public/manifest.json, public/admin-manifest.json) no pueden importar
// este archivo — se editan a mano, ver SETUP.md sección de branding.
// Los endpoints serverless en /api usan variables de entorno (Vercel) en
// vez de importar esto directamente, ver .env.example.
// ============================================================================

export type ServiceItem = {
  name: string;
  duration: string;
  price: string;
  description?: string;
};

export type ServiceCategoryConfig = {
  id: string;
  icon: string;
  title: string;
  services: ServiceItem[];
};

export type StaffMember = {
  name: string;
  role: string;
  /** Google Calendar colorId ("1"-"11") used when gcal sync is enabled. */
  gcalColorId?: string;
};

// ============================================================================
// MK5_PRT — instancia de DEMO/PRESENTACIÓN, no un cliente real.
// Este archivo debe quedarse SIEMPRE en un estado placeholder obvio cuando
// no hay una presentación en curso. Ver ../../RESKIN.md para el flujo de
// "vestir" esta demo con los datos de un prospecto antes de una llamada, y
// la regla de no dejar nombres de prospectos reales commiteados a largo
// plazo en este repo.
// ============================================================================

export const business = {
  // ---- Identidad ----
  name: "Tu Negocio Aquí",
  shortName: "Tu Negocio",
  tagline: "Así de fácil se ve tu sitio con reservas en línea",
  // Badge/tagline corto para el wordplay de marca opcional que aparece en
  // About/WhySection (ej. "Siempre {shortName}"). Déjalo vacío para ocultar
  // el badge por completo.
  brandBadge: "",
  legalCity: "Ciudad, Puerto Rico",
  // NOTA: estos paths apuntan a placeholders — el cliente debe subir sus
  // propios assets a /public/brand/ (ver public/README-ASSETS.txt para la
  // lista completa de archivos requeridos y dimensiones).
  logoUrl: "/brand/logo.png",
  heroImageUrl: "/brand/hero.jpg",
  faviconSvg: "/brand/favicon.svg",

  // ---- Contacto ----
  phone: "7870000000", // solo dígitos, con código de país, para tel:/wa.me
  phoneDisplay: "(787) 000-0000",
  whatsapp: "17870000000",
  email: "info@negocio.com",
  address: "Calle Principal 123, Municipio, PR 00000",
  addressShort: "Frente a Plaza Principal, Municipio, PR",
  googleMapsUrl: "https://maps.google.com/?q=Calle+Principal+123+Municipio+PR+00000",
  geo: { latitude: 18.4655, longitude: -66.1057 },

  // ---- Redes / reseñas ----
  instagramUrl: "https://instagram.com/negocio",
  facebookUrl: "https://facebook.com/negocio",
  booksyUrl: "",
  googleReviewUrl: "",
  googleRating: { value: "5.0", count: "0" },

  // ---- Horario (bloquea días/horas en el calendario de reservas) ----
  hours: {
    // 0 = domingo ... 6 = sábado
    closedDays: [0] as number[],
    open: "09:00",
    close: "18:00",
    slotMinutes: 30,
  },

  // ---- Colores (se inyectan como CSS variables) ----
  theme: {
    primary: "#c9a96e",
    primaryDark: "#a07080",
    secondary: "#2a1a20",
    background: "#ffffff",
    surface: "#f7f5f3",
    text: "#2a1a20",
    textMuted: "#a07080",
    border: "#f0d8e4",
    accent: "#e87fac",
  },

  // ---- Tipografía ----
  fonts: {
    display: "'Cormorant Garamond', serif",
    body: "'Montserrat', system-ui, sans-serif",
    googleFontsUrl:
      "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400;1,500&family=Montserrat:wght@300;400;500;600&display=swap",
  },

  // ---- SEO ----
  seo: {
    titleSuffix: "| Salón de belleza",
    description: "Agenda tu cita en línea en minutos.",
    keywords: "salon, belleza, citas en linea",
    ogImage: "/brand/hero.jpg",
    siteUrl: "https://example.com",
    locale: "es_PR",
  },

  // ---- Categorías de servicio + precios (mapea a rutas /servicios/:slug) ----
  // Estructura de ejemplo (4 categorías típicas de un salón). Reemplaza
  // nombres, duraciones y precios con el menú real del cliente.
  serviceCategories: [
    {
      id: "manicure",
      icon: "💅",
      title: "Manicuras",
      services: [
        { name: "Manicura Profunda", duration: "1h", price: "$45", description: "Limpieza profunda, corte de cutícula, limado, color y crema de manos." },
        { name: "Remoción de Material", duration: "30min", price: "$20", description: "Remoción de gel o acrílico anterior." },
      ],
    },
    {
      id: "pedicure",
      icon: "🦶",
      title: "Pedicuras",
      services: [
        { name: "Pedicura Spa + Color", duration: "1h", price: "$55", description: "Cuidado de cutículas, exfoliación, hidratación, masaje y esmaltado." },
      ],
    },
    {
      id: "cabello",
      icon: "✂️",
      title: "Cabello",
      services: [
        { name: "Lavado y Secado", duration: "1h", price: "Desde $25", description: "Lavado con productos premium y estilo." },
        { name: "Color / Balayage", duration: "3h", price: "Desde $70", description: "Coloración con productos profesionales." },
      ],
    },
    {
      id: "cabinas",
      icon: "🏠",
      title: "Cabinas",
      services: [
        { name: "Renta de cabina (día)", duration: "8h", price: "Consultar", description: "Espacio para profesionales independientes." },
      ],
    },
  ] as ServiceCategoryConfig[],

  // ---- Staff (usado en admin y, si gcal está activo, para colorear eventos) ----
  staff: [
    { name: "Especialista 1", role: "Especialista", gcalColorId: "4" },
    { name: "Especialista 2", role: "Especialista", gcalColorId: "7" },
  ] as StaffMember[],

  // ---- Copy editable de secciones clave ----
  copy: {
    heroHeadline: "Tu Negocio Aquí",
    heroSub: "Agenda tu cita en menos de un minuto",
    bookingCta: "Reservar cita",
    aboutTitle: "Sobre nosotros",
    aboutBody: "",
    whyTitle: "¿Por qué elegirnos?",
    whyBody: "",
  },

  // ---- Notificaciones ----
  // MK5_PRT: sin dueño real detrás de este demo, así que las notificaciones
  // por email quedan apagadas por default (no hay a quién avisarle). Si en
  // una presentación específica quieres demostrar visualmente que la
  // confirmación funciona, prende sendCustomerConfirmation apuntando
  // ownerEmail a un correo fijo de demo controlado internamente (nunca al
  // correo real del prospecto) — ver RESKIN.md.
  notifications: {
    ownerEmail: "demo@suitcase.internal",
    sendCustomerConfirmation: false,
    sendOwnerAlert: false,
  },

  // ---- Integraciones (todas apagadas por default en la demo) ----
  // MK5_PRT no provisiona cuentas externas reales (Stripe, Google, Meta) —
  // estas quedan en `enabled: false` para que la UI las muestre como
  // "disponibles" sin necesitar credenciales reales. No las actives salvo
  // que armes credenciales de sandbox propias del demo, nunca del prospecto.
  integrations: {
    stripe: {
      enabled: false,
      currency: "usd",
    },
    googleCalendar: {
      enabled: false,
    },
    whatsapp: {
      enabled: false,
    },
    pushNotifications: {
      enabled: false,
    },
  },

  // ---- Branding de PDFs/recibos generados por el sistema ----
  pdfBranding: {
    headerColor: "#c9a96e",
    footerText: "Tu Negocio Aquí",
  },
};

export type BusinessConfig = typeof business;
