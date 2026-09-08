import { createFileRoute, Link } from "@tanstack/react-router";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { business } from "@/config/business.config";

export const Route = createFileRoute("/servicios/cabinas/")({
  head: () => ({
    meta: [
      { title: `Cabinas | ${business.name} — Profesionales independientes en ${business.legalCity}` },
      { name: "description", content: `Conoce a las profesionales independientes que operan dentro de ${business.name}: estética facial y extensiones de pestañas/cejas. ${business.legalCity}.` },
    ],
  }),
  component: CabinasPage,
});

const CABINAS = [
  {
    slug: "believe-esthetic",
    name: "Believe Esthetic",
    tag: "Estética & Cuidado de la Piel",
    desc: "Limpiezas faciales profundas, tratamientos personalizados e hidratación para la piel.",
    img: "/klassy/salon-02.jpg",
  },
  {
    slug: "beauty-by-eliz",
    name: "Beauty By Eliz",
    tag: "Pestañas & Cejas",
    desc: "Extensiones de pestañas y diseño de cejas con acabado personalizado y profesional.",
    img: "/klassy/salon-01.jpg",
  },
];

const PINK = "#ffa8c6";
const ff   = "'Montserrat', sans-serif";
const ffS  = "'Cinzel Decorative', serif";
const ffB  = "'Cormorant Garamond', serif";

function CabinasPage() {
  return (
    <div style={{ background: "#feeff2", color: "#2a1a20", minHeight: "100vh" }}>
      <Navbar />

      <section style={{ position: "relative", minHeight: "clamp(240px,34vw,360px)", overflow: "hidden", display: "flex", alignItems: "flex-end" }}>
        <img src="/klassy/salon-01.jpg" alt={`Cabinas ${business.name}`} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(42,26,32,0.85) 0%, rgba(42,26,32,0.15) 100%)" }} />
        <div style={{ position: "relative", zIndex: 10, padding: "0 2rem 3rem", maxWidth: 1280, margin: "0 auto", width: "100%", paddingTop: 110 }}>
          <p style={{ fontFamily: "'Cinzel', serif", fontSize: 9, letterSpacing: "5px", color: "#d9b850", marginBottom: 12, textTransform: "uppercase" }}>{business.name} · Carolina, PR</p>
          <h1 style={{ fontFamily: ffS, fontSize: "clamp(28px,5vw,48px)", fontWeight: 400, color: "#fff", margin: "0 0 14px", lineHeight: 1.2 }}>Cabinas</h1>
          <p style={{ fontFamily: ffB, fontSize: "clamp(14px,2vw,17px)", fontStyle: "italic", color: "rgba(255,255,255,0.75)" }}>
            {`Profesionales independientes dentro de ${business.name}.`}
          </p>
        </div>
      </section>

      <section style={{ maxWidth: 1000, margin: "0 auto", padding: "72px 2rem" }}>
        <p style={{ fontFamily: ff, fontSize: 12, color: "#9a7080", textAlign: "center", maxWidth: 560, margin: "0 auto 40px", lineHeight: 1.9 }}>
          {`Cada cabina es operada de forma independiente — sus reservas y precios no forman parte de ${business.name}. Toca una cabina para conocer sus servicios y cómo contactarla directamente.`}
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 28 }}>
          {CABINAS.map(c => (
            <Link key={c.slug} to="/servicios/cabinas/$slug" params={{ slug: c.slug }} style={{ textDecoration: "none", display: "block", background: "#fff", overflow: "hidden", transition: "box-shadow .2s", borderTop: `3px solid ${PINK}` }}
              onMouseEnter={e => (e.currentTarget.style.boxShadow = "0 8px 32px rgba(42,26,32,0.10)")}
              onMouseLeave={e => (e.currentTarget.style.boxShadow = "none")}
            >
              <div style={{ padding: "24px 22px" }}>
                <p style={{ fontFamily: "'Cinzel', serif", fontSize: 9, letterSpacing: "2px", color: "#d9b850", textTransform: "uppercase", marginBottom: 6 }}>{c.tag}</p>
                <h2 style={{ fontFamily: ffB, fontSize: "clamp(18px,2.5vw,22px)", fontWeight: 400, color: "#2a1a20", margin: "0 0 8px" }}>{c.name}</h2>
                <p style={{ fontFamily: ff, fontSize: 12, color: "#9a7080", lineHeight: 1.8, margin: 0 }}>{c.desc}</p>
                <p style={{ fontFamily: "'Cinzel', serif", fontSize: 9, letterSpacing: "2px", color: PINK, marginTop: 14, textTransform: "uppercase" }}>Ver más →</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <Footer />
    </div>
  );
}
