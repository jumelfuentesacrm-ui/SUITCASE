import { useState } from "react";
import type { RefObject } from "react";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { INSTAGRAM_URL, PORTFOLIO } from "./data";
import { business } from "@/config/business.config";

export function Gallery() {
  const [open, setOpen] = useState<string | null>(null);
  const sectionRef = useScrollReveal() as RefObject<HTMLElement>;

  return (
    <section ref={sectionRef} id="galeria" style={{ background: "#fff" }}>

      {/* Editorial header — like Phenix "Your Personal Canvas" */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", alignItems: "center", padding: "clamp(3rem,6vw,5rem) clamp(2rem,6vw,5rem)" }} className="gallery-header">
        <div data-reveal="right">
          <span style={{ display: "block", fontSize: 9, letterSpacing: "5px", color: "#d9b850", fontWeight: 600, fontFamily: "'Cinzel', serif", marginBottom: "1.25rem", textTransform: "uppercase" }}>
            Nuestro Portafolio
          </span>
          <h2 style={{ fontFamily: "'Cinzel Decorative', serif", fontSize: "clamp(24px,4vw,44px)", fontWeight: 400, color: "#2a1a20", lineHeight: 1.2, marginBottom: "1.25rem" }}>
            Resultados que hablan<br /><span style={{ color: "#ffa8c6" }}>por sí solos.</span>
          </h2>
        </div>
        <div data-reveal="left" style={{ paddingLeft: "clamp(1rem,3vw,3rem)", borderLeft: "0.5px solid rgba(255,168,198,0.3)" }}>
          <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(15px,1.8vw,19px)", lineHeight: 1.9, color: "#6a5060", fontStyle: "italic", marginBottom: "1.75rem" }}>
            {`Cada servicio refleja el compromiso, la dedicación y el cuidado que ponemos en nuestro trabajo. Explora algunos de nuestros resultados y descubre cómo en ${business.name} combinamos técnica, creatividad y atención al detalle para ofrecer una experiencia que va más allá de la belleza.`}
          </p>
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noreferrer"
            style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 10, letterSpacing: "3px", color: "#2a1a20", fontFamily: "'Cinzel', serif", textDecoration: "none", borderBottom: "1px solid #ffa8c6", paddingBottom: 2, transition: "color .2s", textTransform: "uppercase" }}
            onMouseEnter={e => (e.currentTarget.style.color = "#ffa8c6")}
            onMouseLeave={e => (e.currentTarget.style.color = "#2a1a20")}
          >
            Ver más en Instagram
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </a>
        </div>
      </div>

      {/* 3×3 photo grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "clamp(10px,1.5vw,20px)", padding: "0 clamp(2rem,6vw,5rem) clamp(3rem,6vw,5rem)" }} className="gallery-grid">
        {PORTFOLIO.map((src, i) => (
          <button
            key={src}
            onClick={() => window.open(INSTAGRAM_URL, "_blank", "noopener,noreferrer")}
            data-reveal="scale"
            data-delay={String(Math.min((i % 3) + 1, 5)) as "1"|"2"|"3"|"4"|"5"}
            style={{ position: "relative", overflow: "hidden", aspectRatio: "1/1", background: "#feeff2", border: "none", cursor: "pointer", padding: 0 }}
          >
            <img
              src={src}
              alt={`${business.name} — trabajo ${i + 1}`}
              loading="lazy"
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", transition: "transform 0.6s ease" }}
              onMouseEnter={e => { (e.currentTarget as HTMLImageElement).style.transform = "scale(1.08)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLImageElement).style.transform = "scale(1)"; }}
            />
            <div
              style={{ position: "absolute", inset: 0, background: "rgba(255,168,198,0)", transition: "background .3s", display: "flex", alignItems: "center", justifyContent: "center" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,168,198,0.18)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,168,198,0)"; }}
            />
          </button>
        ))}
      </div>

      {/* Lightbox */}
      {open && (
        <div
          onClick={() => setOpen(null)}
          style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(26,15,20,0.94)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem" }}
        >
          <img src={open} alt="" style={{ maxHeight: "88vh", maxWidth: "100%", objectFit: "contain" }} />
          <button
            onClick={() => setOpen(null)}
            aria-label="Cerrar"
            style={{ position: "absolute", top: "1.5rem", right: "1.5rem", width: 44, height: 44, borderRadius: "50%", background: "#feeff2", border: "none", cursor: "pointer", fontSize: 20, color: "#2a1a20", display: "flex", alignItems: "center", justifyContent: "center" }}
          >×</button>
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .gallery-header { grid-template-columns: 1fr !important; }
          .gallery-header > div:last-child { border-left: none !important; padding-left: 0 !important; }
          .gallery-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>
    </section>
  );
}
