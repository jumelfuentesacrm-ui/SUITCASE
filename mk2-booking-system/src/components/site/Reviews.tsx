// Ejemplo de testimonios — reemplazar con reseñas reales del cliente
// (nombre + cita, ver business.config.ts para el link de Google Reviews).
const reviews = [
  { quote: "El mejor servicio. Todo en uno; la mejor atención.", author: "Cliente 1" },
  { quote: "Me encantó el resultado, el servicio fue excelente.", author: "Cliente 2" },
  { quote: "Es uno de mis lugares favoritos, el ambiente es super tranquilo.", author: "Cliente 3" },
  { quote: "Excelente servicio. Encantada con el trabajo.", author: "Cliente 4" },
];

import { business } from "@/config/business.config";
const REVIEW_LINK = business.googleReviewUrl;

import type { RefObject } from "react";
import { useScrollReveal } from "@/hooks/useScrollReveal";

export function Reviews() {
  const sectionRef = useScrollReveal() as RefObject<HTMLElement>;

  return (
    <section ref={sectionRef} style={{ background: "#feeff2", borderTop: "0.5px solid rgba(255,168,198,0.2)", padding: "4rem 1.5rem 5rem" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        <div data-reveal style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", justifyContent: "space-between", gap: "1rem", marginBottom: "2.5rem" }}>
          <div>
            <span style={{ display: "block", fontSize: 9, letterSpacing: "5px", color: "#d9b850", fontWeight: 600, fontFamily: "'Cinzel', serif", marginBottom: "0.75rem", textTransform: "uppercase" }}>
              Testimonios
            </span>
            <h2 style={{ fontFamily: "'Cinzel Decorative', serif", fontSize: "clamp(18px,2.8vw,28px)", fontWeight: 400, color: "#2a1a20" }}>
              Lo que dicen nuestras clientas
            </h2>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <span style={{ fontFamily: "'Cinzel Decorative', serif", fontSize: "clamp(26px,4vw,36px)", fontWeight: 400, color: "#ffa8c6" }}>5.0</span>
              <div>
                <div style={{ color: "#ffa8c6", fontSize: 14, letterSpacing: 2 }}>★★★★★</div>
                <div style={{ fontSize: 9, letterSpacing: "3px", color: "#b09090", fontFamily: "'Cinzel', serif", textTransform: "uppercase" }}>Google Reviews</div>
              </div>
            </div>
            <a
              href={REVIEW_LINK}
              target="_blank"
              rel="noreferrer"
              style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 20px", border: "1px solid #ffa8c6", color: "#ffa8c6", fontFamily: "'Cinzel', serif", fontSize: 9, letterSpacing: "2.5px", textDecoration: "none", fontWeight: 600, textTransform: "uppercase", transition: "background .2s, color .2s" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#ffa8c6"; (e.currentTarget as HTMLElement).style.color = "#fff"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "#ffa8c6"; }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
              Dejar reseña
            </a>
          </div>
        </div>

        <div className="reviews-grid" style={{ display: "grid", gridTemplateColumns: "repeat(1, 1fr)", gap: 1 }}>
          {reviews.map((r, i) => (
            <div
              key={i}
              data-reveal
              data-delay={String(i + 1) as "1"|"2"|"3"}
              style={{ padding: "1.75rem", background: "#fff", borderLeft: "2px solid transparent", transition: "border-color .2s, opacity .8s ease, transform .8s ease" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderLeftColor = "#ffa8c6"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderLeftColor = "transparent"; }}
            >
              <div style={{ color: "#ffa8c6", fontSize: 12, letterSpacing: 2, marginBottom: "0.75rem" }}>★★★★★</div>
              <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(13px,1.6vw,15px)", color: "#2a1a20", lineHeight: 1.8, fontStyle: "italic", marginBottom: "1rem" }}>
                "{r.quote}"
              </p>
              <p style={{ fontSize: 9, fontWeight: 600, letterSpacing: "2px", color: "#b09090", fontFamily: "'Cinzel', serif", textTransform: "uppercase" }}>
                — {r.author}
              </p>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @media (min-width: 640px) { .reviews-grid { grid-template-columns: repeat(3, 1fr) !important; } }
      `}</style>
    </section>
  );
}
