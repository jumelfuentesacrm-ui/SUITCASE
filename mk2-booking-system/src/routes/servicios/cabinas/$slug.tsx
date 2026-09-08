import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { business } from "@/config/business.config";

type Cabina = {
  slug: string;
  name: string;
  tag: string;
  img: string;
  serviceType: string;
  services: string[];
  contact: { label: string; value: string; href?: string }[];
  description: string;
};

const CABINAS: Record<string, Cabina> = {
  "believe-esthetic": {
    slug: "believe-esthetic",
    name: "Believe Esthetic",
    tag: "Estética & Cuidado de la Piel",
    img: "/klassy/salon-02.jpg",
    serviceType: "Centro de estética y cuidado de la piel (Esthetic / Skin Care & Wellness).",
    services: [
      "Limpiezas faciales profundas",
      "Tratamientos faciales personalizados",
      "Hidratación y rejuvenecimiento facial",
      "Tratamientos para acné, manchas y textura de la piel",
      "Exfoliaciones y cuidado profesional de la piel",
      "Servicios estéticos enfocados en mejorar la salud y apariencia del rostro",
    ],
    contact: [
      { label: "Dirección", value: "Urb. Villa Fontana, Ave. Jesús M. Fragoso, #3, KS-5 Ofc. 1, Carolina, Puerto Rico 00983" },
      { label: "Reservas", value: "A través de Booksy" },
    ],
    description:
      "Believe Esthetic es un centro de estética ubicado en Carolina, Puerto Rico, dedicado al cuidado integral de la piel. Se especializa en tratamientos faciales personalizados que buscan mejorar la salud, apariencia y bienestar de la piel mediante técnicas profesionales y atención individualizada, brindando a cada cliente una experiencia enfocada en resultados y autocuidado.",
  },
  "beauty-by-eliz": {
    slug: "beauty-by-eliz",
    name: "Beauty By Eliz",
    tag: "Pestañas & Cejas",
    img: "/klassy/salon-01.jpg",
    serviceType: "Extensiones de pestañas y diseño de cejas.",
    services: [
      "Extensiones de pestañas",
      "Depilación de cejas",
      "Tinte de cejas",
      "Laminado de cejas",
    ],
    contact: [
      { label: "Teléfono", value: "+1 (787) 235-1068", href: "tel:+17872351068" },
      { label: "Instagram", value: "@_beautybyeliz_", href: "https://instagram.com/_beautybyeliz_" },
    ],
    description:
      "Beauty By Eliz ofrece servicios especializados de extensiones de pestañas y diseño de cejas para realzar tu belleza natural con un acabado personalizado y profesional. Para agendar una cita o solicitar más información, comunícate directamente con Beauty By Eliz mediante su teléfono o Instagram.",
  },
};

export const Route = createFileRoute("/servicios/cabinas/$slug")({
  loader: ({ params }) => {
    const cabina = CABINAS[params.slug];
    if (!cabina) throw notFound();
    return cabina;
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.name} | Cabinas · ${business.name}` },
          { name: "description", content: loaderData.description.slice(0, 155) },
        ]
      : [],
  }),
  component: CabinaDetailPage,
});

const ff  = "'Montserrat', sans-serif";
const ffS = "'Cinzel Decorative', serif";
const ffB = "'Cormorant Garamond', serif";

function CabinaDetailPage() {
  const cabina = Route.useLoaderData();

  return (
    <div style={{ background: "#fff", color: "#2a1a20" }}>
      <Navbar />
      <main style={{ paddingTop: "80px" }}>
        <section style={{ position: "relative", minHeight: "clamp(240px,34vw,340px)", overflow: "hidden", display: "flex", alignItems: "flex-end", background: "#1a0f14" }}>
          <img src={cabina.img} alt={cabina.name} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.55 }} />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(26,15,20,0.92) 0%, rgba(26,15,20,0.2) 100%)" }} />
          <div style={{ position: "relative", zIndex: 10, padding: "0 1.5rem 2.5rem", maxWidth: 720 }}>
            <Link to="/servicios/cabinas" style={{ fontSize: 10, letterSpacing: "2px", color: "#c9a96e", fontFamily: ff, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "0.3rem", marginBottom: "1rem" }}>← CABINAS</Link>
            <p style={{ fontSize: 9, letterSpacing: "4px", color: "#c9a96e", fontWeight: 600, fontFamily: ff, marginBottom: "0.5rem", textTransform: "uppercase" }}>{cabina.tag}</p>
            <h1 style={{ fontFamily: ffB, fontSize: "clamp(30px,5.5vw,48px)", fontWeight: 300, color: "#fff", lineHeight: 1.1 }}>{cabina.name}</h1>
          </div>
        </section>

        <section style={{ maxWidth: 680, margin: "0 auto", padding: "3rem 1.5rem" }}>
          <div style={{ marginBottom: "2.5rem", padding: "12px 16px", background: "#fdf0f5", border: "1px solid #f2c5d8", fontSize: 11, color: "#9a7080", fontFamily: ff, lineHeight: 1.8 }}>
            {`Esta cabina opera de forma independiente dentro de ${business.name}. Esta página es solo informativa — para agendar, contacta directamente usando los datos abajo.`}
          </div>

          <h2 style={{ fontFamily: ffS, fontSize: "clamp(15px,2vw,18px)", fontWeight: 400, color: "#2a1a20", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "0.75rem" }}>Tipo de servicio</h2>
          <p style={{ fontFamily: ffB, fontSize: 16, color: "#5a4550", lineHeight: 1.8, marginBottom: "2.25rem" }}>{cabina.serviceType}</p>

          <h2 style={{ fontFamily: ffS, fontSize: "clamp(15px,2vw,18px)", fontWeight: 400, color: "#2a1a20", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "0.75rem" }}>Servicios que ofrece</h2>
          <ul style={{ margin: "0 0 2.25rem", padding: 0, listStyle: "none" }}>
            {cabina.services.map(s => (
              <li key={s} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "0.5rem 0", borderBottom: "0.5px solid #f0d8e4", fontFamily: ffB, fontSize: 15, color: "#5a4550" }}>
                <span style={{ color: "#e87fac", flexShrink: 0 }}>✦</span>{s}
              </li>
            ))}
          </ul>

          <h2 style={{ fontFamily: ffS, fontSize: "clamp(15px,2vw,18px)", fontWeight: 400, color: "#2a1a20", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "0.75rem" }}>Contacto</h2>
          <div style={{ marginBottom: "2.25rem" }}>
            {cabina.contact.map(c => (
              <p key={c.label} style={{ fontFamily: ff, fontSize: 13, color: "#5a4550", lineHeight: 1.9, margin: "0 0 4px" }}>
                <span style={{ fontWeight: 600, color: "#2a1a20" }}>{c.label}: </span>
                {c.href ? <a href={c.href} target={c.href.startsWith("http") ? "_blank" : undefined} rel="noreferrer" style={{ color: "#e87fac" }}>{c.value}</a> : c.value}
              </p>
            ))}
          </div>

          <h2 style={{ fontFamily: ffS, fontSize: "clamp(15px,2vw,18px)", fontWeight: 400, color: "#2a1a20", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "0.75rem" }}>Descripción</h2>
          <p style={{ fontFamily: ffB, fontSize: 16, color: "#5a4550", lineHeight: 1.9 }}>{cabina.description}</p>
        </section>
      </main>
      <Footer />
    </div>
  );
}
