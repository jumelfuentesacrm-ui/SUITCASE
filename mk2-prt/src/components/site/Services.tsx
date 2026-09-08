import { business } from "@/config/business.config";

// These 4 cards map 1:1 to the /servicios/* route files (manicure, pedicure,
// cabello, cabinas) — generic salon categories, not tied to any client's
// brand. A real rebrand may still need different category routes entirely;
// the image paths below are placeholders under /public/brand/ (see
// public/README-ASSETS.txt).
const CATEGORIES = [
  { id: "manicure",  label: "Manicuras",   sub: "Gel · Builder · Geltips · Color",       img: "/brand/servicios-manicure.jpg", href: "/servicios/manicure" },
  { id: "pedicure",  label: "Pedicuras",   sub: "Sencilla · Cambio de Color",             img: "/brand/servicios-pedicure.jpg", href: "/servicios/pedicure" },
  { id: "cabello",   label: "Cabello",     sub: "Color · Corte · FIOS · Keratina",        img: "/brand/servicios-cabello.jpg", href: "/servicios/cabello" },
  { id: "cabinas",   label: "Cabinas",     sub: "Profesionales independientes",           img: "/brand/servicios-cabinas.jpg", href: "/servicios/cabinas" },
];

export function Services() {
  return (
    <section id="servicios" style={{ background: "#feeff2" }}>

      {/* Header */}
      <div style={{ maxWidth: 900, margin: "0 auto", textAlign: "center", padding: "5rem 2rem 4rem" }}>
        <span style={{ display: "block", fontSize: 9, letterSpacing: "5px", color: "#d9b850", fontWeight: 600, fontFamily: "'Cinzel', serif", marginBottom: "1.25rem", textTransform: "uppercase" }}>
          Nuestros servicios
        </span>
        <h2 style={{ fontFamily: "'Cinzel Decorative', serif", fontSize: "clamp(24px,4vw,44px)", fontWeight: 400, color: "#2a1a20", lineHeight: 1.2, marginBottom: "1.25rem" }}>
          Encuentra el servicio<br />perfecto para ti.
        </h2>
        <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(16px,2vw,20px)", fontStyle: "italic", color: "#8a7080", maxWidth: 540, margin: "0 auto" }}>
          Cada detalle fue pensado para que salgas sintiéndote {business.shortName}.
        </p>
      </div>

      {/* 4-col card grid */}
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 2rem 1rem", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1.5rem" }} className="services-strip">
        {CATEGORIES.map((cat) => (
          <a
            key={cat.id}
            href={cat.href}
            style={{ display: "flex", flexDirection: "column", textDecoration: "none", background: "#fff", boxShadow: "0 2px 16px rgba(42,26,32,0.07)", transition: "box-shadow .25s, transform .25s" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 32px rgba(42,26,32,0.15)"; (e.currentTarget as HTMLElement).style.transform = "translateY(-4px)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = "0 2px 16px rgba(42,26,32,0.07)"; (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; }}
          >
            {/* Square photo */}
            <div style={{ position: "relative", aspectRatio: "1/1", overflow: "hidden" }}>
              <img
                src={cat.img}
                alt={cat.label}
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", transition: "transform 0.6s ease", transform: "scale(1.04)" }}
                onMouseEnter={e => { (e.currentTarget as HTMLImageElement).style.transform = "scale(1.1)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLImageElement).style.transform = "scale(1.04)"; }}
                loading="lazy"
              />
            </div>

            {/* Card body */}
            <div style={{ padding: "1.25rem 1.25rem 1.5rem", display: "flex", flexDirection: "column", flexGrow: 1 }}>
              <p style={{ fontSize: 8, letterSpacing: "3px", color: "#d9b850", fontFamily: "'Cinzel', serif", fontWeight: 600, marginBottom: "0.5rem", textTransform: "uppercase" }}>
                {cat.sub}
              </p>
              <h3 style={{ fontFamily: "'Cinzel Decorative', serif", fontSize: "clamp(14px,1.8vw,18px)", fontWeight: 400, color: "#2a1a20", lineHeight: 1.25, marginBottom: "1rem", flexGrow: 1 }}>
                {cat.label}
              </h3>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 9, letterSpacing: "3px", color: "#ffa8c6", fontFamily: "'Cinzel', serif", fontWeight: 600, textTransform: "uppercase", borderTop: "0.5px solid rgba(255,168,198,0.25)", paddingTop: "0.9rem" }}>
                Ver servicios
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </span>
            </div>
          </a>
        ))}
      </div>

      {/* CTA row below */}
      <div style={{ textAlign: "center", padding: "3rem 2rem" }}>
        <a
          href="#agendar"
          style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "15px 40px", background: "#2a1a20", color: "#fff", fontSize: 10, letterSpacing: "3px", fontFamily: "'Cinzel', serif", fontWeight: 600, textDecoration: "none", transition: "background .2s", textTransform: "uppercase" }}
          onMouseEnter={e => (e.currentTarget.style.background = "#ffa8c6")}
          onMouseLeave={e => (e.currentTarget.style.background = "#2a1a20")}
        >
          Agendar ahora
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </a>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .services-strip { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 480px) {
          .services-strip { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  );
}
