import type { RefObject } from "react";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { business } from "@/config/business.config";

const STATS = [
  { value: `${business.googleRating.value}★`, label: "Google" },
  { value: `${business.googleRating.count}+`, label: "Reseñas" },
  { value: String(7 - business.hours.closedDays.length), label: "Días abiertos" },
  { value: `${business.staff.length}+`, label: "Especialistas" },
];

export function WhySection() {
  const sectionRef = useScrollReveal() as RefObject<HTMLElement>;

  return (
    <section ref={sectionRef} style={{ background: "#feeff2" }}>

      {/* §2 — cream split: text left / photo right */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", minHeight: "clamp(480px,60vw,680px)" }} className="why-section-grid">

        {/* Left — text */}
        <div
          data-reveal="right"
          style={{ display: "flex", flexDirection: "column", justifyContent: "center", padding: "clamp(2.5rem,7vw,5rem) clamp(2rem,6vw,5rem)" }}
        >
          <span
            data-reveal data-delay="1"
            style={{ display: "block", fontSize: 9, letterSpacing: "5px", color: "#d9b850", fontWeight: 600, fontFamily: "'Cinzel', serif", marginBottom: "1.5rem", textTransform: "uppercase" }}
          >
            ¿Por qué {business.shortName}?
          </span>
          <h2
            data-reveal data-delay="2"
            style={{ fontFamily: "'Cinzel Decorative', serif", fontSize: "clamp(24px,3.8vw,44px)", fontWeight: 400, color: "#2a1a20", lineHeight: 1.2, marginBottom: "1.75rem" }}
          >
            Transforma tu rutina<br />en una <span style={{ color: "#ffa8c6" }}>experiencia.</span>
          </h2>
          <p
            data-reveal data-delay="3"
            style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(15px,1.8vw,19px)", lineHeight: 1.9, color: "#6a5060", marginBottom: "2.5rem", maxWidth: 420, fontStyle: "italic" }}
          >
            {business.copy.whyBody || `En ${business.name} creemos que cada cita debe sentirse especial. Desde el momento en que llegas, queremos que disfrutes de un espacio elegante, cómodo y cuidadosamente diseñado para relajarte mientras nos encargamos de realzar tu belleza. Nos enfocamos en ofrecer un servicio personalizado, una atención de calidad y una experiencia que te haga querer regresar.`}
          </p>
          <div data-reveal data-delay="4" style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
            <a
              href="#agendar"
              style={{ padding: "14px 36px", background: "#ffa8c6", color: "#2a1a20", fontSize: 10, letterSpacing: "3px", fontFamily: "'Cinzel', serif", fontWeight: 600, textDecoration: "none", display: "inline-block", transition: "background .2s, transform .2s", textTransform: "uppercase" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#e87fac"; (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "#ffa8c6"; (e.currentTarget as HTMLElement).style.transform = "none"; }}
            >
              Reserva tu cita
            </a>
            <a
              href="#servicios"
              style={{ padding: "14px 36px", background: "transparent", color: "#7a5060", border: "1px solid rgba(255,168,198,0.45)", fontSize: 10, letterSpacing: "3px", fontFamily: "'Cinzel', serif", fontWeight: 500, textDecoration: "none", display: "inline-block", transition: "all .2s", textTransform: "uppercase" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "#ffa8c6"; (e.currentTarget as HTMLElement).style.color = "#ffa8c6"; (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,168,198,0.45)"; (e.currentTarget as HTMLElement).style.color = "#7a5060"; (e.currentTarget as HTMLElement).style.transform = "none"; }}
            >
              Nuestros servicios
            </a>
          </div>
        </div>

        {/* Right — photo with breathing room */}
        <div
          data-reveal="left"
          style={{ padding: "clamp(2rem,3vw,3rem)", display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <div
            className="img-zoom"
            style={{ width: "100%", height: "100%", position: "relative", boxShadow: "0 16px 64px rgba(42,26,32,0.14)" }}
          >
            <img
              src="/brand/why-section-photo.jpg"
              alt={business.name}
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              loading="lazy"
            />
            {/* Optional brand-wordplay badge, fully driven by business.brandBadge.
                Empty by default — set it in business.config.ts to show it, or
                leave blank to hide this accent entirely. */}
            {business.brandBadge && (
              <div style={{ position: "absolute", top: "1.5rem", left: "1.5rem", background: "#d9b850", padding: "0.4rem 0.9rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <span style={{ fontFamily: "'Cinzel', serif", fontSize: 8, letterSpacing: "3px", color: "#2a1a20", textTransform: "uppercase", fontWeight: 600 }}>{business.brandBadge}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* §3 — horizontal stats strip */}
      <div style={{ background: "#2a1a20", display: "grid", gridTemplateColumns: "repeat(4,1fr)", borderTop: "0.5px solid rgba(217,184,80,0.25)" }} className="stats-strip">
        {STATS.map((s, i) => (
          <div
            key={i}
            data-reveal
            data-delay={String(i + 1) as "1" | "2" | "3" | "4"}
            style={{ padding: "2rem 1rem", textAlign: "center", borderRight: i < 3 ? "0.5px solid rgba(255,255,255,0.08)" : "none" }}
          >
            <div style={{ fontFamily: "'Cinzel Decorative', serif", fontSize: "clamp(22px,3.5vw,36px)", color: "#ffa8c6", fontWeight: 400, lineHeight: 1, marginBottom: "0.6rem", animation: "kFloat 4s ease-in-out infinite", animationDelay: `${i * 0.4}s` }}>
              {s.value}
            </div>
            <div style={{ fontFamily: "'Cinzel', serif", fontSize: 9, letterSpacing: "3px", color: "rgba(255,255,255,0.4)", textTransform: "uppercase" }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>

      <style>{`
        @media (max-width: 768px) {
          .why-section-grid { grid-template-columns: 1fr !important; }
          .why-section-grid > div:last-child { min-height: 320px; }
          .stats-strip { grid-template-columns: repeat(2,1fr) !important; }
        }
      `}</style>
    </section>
  );
}
