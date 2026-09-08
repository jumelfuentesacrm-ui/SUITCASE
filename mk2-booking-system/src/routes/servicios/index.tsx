import { createFileRoute, Link } from "@tanstack/react-router";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { business } from "@/config/business.config";

export const Route = createFileRoute("/servicios/")({
  head: () => ({
    meta: [
      { title: `Servicios | ${business.name} — Uñas, Cabello & Spa en ${business.legalCity}` },
      { name: "description", content: `Todos los servicios de ${business.name} en ${business.legalCity}: manicure, pedicure, cabello, balayage, keratina, FIOS y depilación. Frente a Plaza ${business.legalCity.split(",")[0]}. Agenda en línea.` },
      { name: "keywords", content: "servicios salon carolina pr, manicure pedicure carolina, cabello carolina puerto rico, klassy salon servicios, nail salon carolina" },
      { property: "og:title", content: `Servicios | ${business.name} — ${business.legalCity}` },
      { property: "og:description", content: `Manicure, pedicure, cabello, balayage, keratina, FIOS y más. ${business.name} frente a Plaza ${business.legalCity.split(",")[0]}.` },
    ],
  }),
  component: ServiciosPage,
});

const categories = [
  {
    title: "Manicure",
    href: "/servicios/manicure",
    desc: "Rubber Base, Builder Gel, Gel Tips y color regular. Desde $30.",
    img: "/klassy/inspo-1.jpg",
    tag: "Desde $30",
  },
  {
    title: "Pedicure",
    href: "/servicios/pedicure",
    desc: "Pedicura sencilla con color gel o regular. Exfoliación e hidratación incluidas.",
    img: "/klassy/salon-pedicure.jpg",
    tag: "Desde $50",
  },
  {
    title: "Cabello",
    href: "/servicios/cabello",
    desc: "Balayage, keratina, FIOS, botox capilar, cortes, coloración y peinados.",
    img: "/klassy/hair-cabello.jpg",
    tag: "Desde $25",
  },
  {
    title: "Cabinas",
    href: "/servicios/cabinas",
    desc: "Profesionales independientes: estética facial, pestañas y cejas.",
    img: "/klassy/salon-02.jpg",
    tag: "Info",
  },
];

const PINK = "#ffa8c6";
const ff   = "'Montserrat', sans-serif";
const ffS  = "'Cinzel Decorative', serif";
const ffB  = "'Cormorant Garamond', serif";

function ServiciosPage() {
  return (
    <div style={{ background: "#feeff2", color: "#2a1a20", minHeight: "100vh" }}>
      <Navbar />

      {/* Hero */}
      <section style={{ position: "relative", minHeight: "clamp(280px,40vw,420px)", overflow: "hidden", display: "flex", alignItems: "flex-end" }}>
        <img src="/klassy/salon-manicure-station.jpg" alt={`${business.name} servicios`} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(42,26,32,0.85) 0%, rgba(42,26,32,0.15) 100%)" }} />
        <div style={{ position: "relative", zIndex: 10, padding: "0 2rem 3rem", maxWidth: 1280, margin: "0 auto", width: "100%", paddingTop: 120 }}>
          <p style={{ fontFamily: "'Cinzel', serif", fontSize: 9, letterSpacing: "5px", color: "#d9b850", marginBottom: 12, textTransform: "uppercase" }}>{business.name} · Carolina, PR</p>
          <h1 style={{ fontFamily: ffS, fontSize: "clamp(28px,5vw,52px)", fontWeight: 400, color: "#fff", margin: "0 0 14px", lineHeight: 1.2 }}>Nuestros Servicios</h1>
          <p style={{ fontFamily: ffB, fontSize: "clamp(14px,2vw,17px)", fontStyle: "italic", color: "rgba(255,255,255,0.75)", marginBottom: 28 }}>
            Un salón completo — uñas, cabello y estética en un solo lugar.
          </p>
          <Link to="/" hash="agendar"
            style={{ display: "inline-block", padding: "13px 32px", background: PINK, color: "#2a1a20", fontFamily: "'Cinzel', serif", fontSize: 10, letterSpacing: "3px", textDecoration: "none", textTransform: "uppercase", fontWeight: 600 }}
            onMouseEnter={e => (e.currentTarget.style.background = "#e87fac")}
            onMouseLeave={e => (e.currentTarget.style.background = PINK)}
          >
            Agenda Ahora
          </Link>
        </div>
      </section>

      {/* Service cards */}
      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "80px 2rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 28 }}>
          {categories.map(c => (
            <Link key={c.href} to={c.href} style={{ textDecoration: "none", display: "block", background: "#fff", overflow: "hidden", transition: "box-shadow .2s" }}
              onMouseEnter={e => (e.currentTarget.style.boxShadow = "0 8px 32px rgba(42,26,32,0.10)")}
              onMouseLeave={e => (e.currentTarget.style.boxShadow = "none")}
            >
              <div style={{ aspectRatio: "4/3", overflow: "hidden" }}>
                <img src={c.img} alt={c.title} loading="lazy"
                  style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform .4s" }}
                  onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.05)")}
                  onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
                />
              </div>
              <div style={{ padding: "20px 22px 24px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
                  <h2 style={{ fontFamily: ffB, fontSize: "clamp(18px,2.5vw,22px)", fontWeight: 400, color: "#2a1a20", margin: 0 }}>{c.title}</h2>
                  <span style={{ fontFamily: "'Cinzel', serif", fontSize: 10, color: "#d9b850", letterSpacing: "1px" }}>{c.tag}</span>
                </div>
                <p style={{ fontFamily: ff, fontSize: 12, color: "#9a7080", lineHeight: 1.8, margin: 0 }}>{c.desc}</p>
                <p style={{ fontFamily: "'Cinzel', serif", fontSize: 9, letterSpacing: "2px", color: PINK, marginTop: 14, textTransform: "uppercase" }}>Ver servicios →</p>
              </div>
            </Link>
          ))}
        </div>

        {/* Info strip */}
        <div style={{ marginTop: 64, padding: "40px 32px", background: "#2a1a20", color: "#fff", textAlign: "center" }}>
          <p style={{ fontFamily: ffS, fontSize: "clamp(18px,3vw,26px)", fontWeight: 400, color: "#fff", marginBottom: 12 }}>El salón más klassy de Carolina, PR</p>
          <p style={{ fontFamily: ff, fontSize: 12, color: "rgba(255,255,255,0.6)", lineHeight: 1.9, maxWidth: 520, margin: "0 auto 24px" }}>
            3KS-5 Cll Via Mirta local #1, Carolina, 00983 · Frente a Plaza Carolina<br/>
            ⭐ 5.0 estrellas · Walk-ins bienvenidos · Parking disponible · Tarjetas aceptadas
          </p>
          <Link to="/" hash="agendar"
            style={{ display: "inline-block", padding: "12px 30px", background: PINK, color: "#2a1a20", fontFamily: "'Cinzel', serif", fontSize: 10, letterSpacing: "3px", textDecoration: "none", textTransform: "uppercase", fontWeight: 600 }}
            onMouseEnter={e => (e.currentTarget.style.background = "#e87fac")}
            onMouseLeave={e => (e.currentTarget.style.background = PINK)}
          >
            Agenda Ahora
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
