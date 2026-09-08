import type { RefObject } from "react";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { business } from "@/config/business.config";

export function About() {
  const sectionRef = useScrollReveal() as RefObject<HTMLElement>;

  return (
    <section ref={sectionRef} id="sobre-nosotras" style={{ background: "#1a0f14" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", minHeight: "clamp(500px,70vh,760px)" }} className="about-grid">

        {/* Photo — left, with breathing room */}
        <div
          data-reveal="right"
          style={{ padding: "clamp(2rem,3vw,3.5rem)", display: "flex", alignItems: "stretch" }}
        >
          <div
            className="img-zoom"
            style={{ position: "relative", width: "100%", overflow: "hidden" }}
          >
            <img
              src="/klassy/about-neon-hair.jpg"
              alt={business.name}
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", minHeight: 360 }}
              loading="lazy"
            />
            {/* Dragonfly badge — "Siempre Klassy" is a wordplay tagline unique
                to this client's brand name; not driven by config. */}
            {/* TODO(suitcase): hardcoded brand wordplay, review per client */}
            <div style={{ position: "absolute", bottom: "1.5rem", right: "1.5rem", background: "rgba(26,15,20,0.85)", backdropFilter: "blur(6px)", padding: "1.1rem 1.25rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <span style={{ fontSize: 20, color: "#f4ff3d", textShadow: "0 0 6px rgba(244,255,61,0.6)" }} className="float">✦</span>
              <div>
                <div style={{ fontFamily: "'Cinzel Decorative', serif", fontSize: 11, color: "#f4ff3d", lineHeight: 1.2, textShadow: "0 0 6px rgba(244,255,61,0.6)" }}>Siempre</div>
                <div style={{ fontFamily: "'Cinzel Decorative', serif", fontSize: 11, color: "#f4ff3d", lineHeight: 1.2, textShadow: "0 0 6px rgba(244,255,61,0.6)" }}>Klassy.</div>
              </div>
            </div>
          </div>
        </div>

        {/* Text — right */}
        <div
          data-reveal="left"
          style={{ display: "flex", flexDirection: "column", justifyContent: "center", padding: "clamp(2.5rem,7vw,5rem) clamp(2rem,6vw,5rem)" }}
        >
          <span
            data-reveal data-delay="1"
            style={{ display: "block", fontSize: 9, letterSpacing: "5px", color: "#d9b850", fontWeight: 600, fontFamily: "'Cinzel', serif", marginBottom: "1.5rem", textTransform: "uppercase" }}
          >
            La esencia de {business.shortName}
          </span>

          <h2
            data-reveal data-delay="2"
            style={{ fontFamily: "'Cinzel Decorative', serif", fontSize: "clamp(20px,3.2vw,36px)", fontWeight: 400, color: "#fff", lineHeight: 1.25, marginBottom: "0.25rem" }}
          >
            Humildes comienzos,
          </h2>
          <h2
            data-reveal data-delay="2"
            style={{ fontFamily: "'Cinzel Decorative', serif", fontSize: "clamp(20px,3.2vw,36px)", fontWeight: 400, color: "#ffa8c6", lineHeight: 1.25, marginBottom: "1.75rem" }}
          >
            rica en historia.
          </h2>

          <p
            data-reveal data-delay="3"
            style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(15px,1.8vw,18px)", lineHeight: 1.9, color: "rgba(255,255,255,0.75)", marginBottom: "1.5rem", fontStyle: "italic" }}
          >
            {business.copy.aboutBody || `${business.name} nació con una visión clara: crear un espacio donde la calidad del servicio fuera tan importante como la experiencia de cada clienta. Ubicados en ${business.legalCity}, reunimos profesionales apasionadas por la belleza en un espacio moderno, elegante y acogedor, donde cada detalle está pensado para que te sientas bienvenida.`}
          </p>
          <p
            data-reveal data-delay="3"
            style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(14px,1.6vw,17px)", lineHeight: 1.9, color: "rgba(255,255,255,0.5)", marginBottom: "2.5rem" }}
          >
            Creemos que la confianza se construye con consistencia, profesionalismo y atención personalizada, por eso trabajamos cada día para que cada visita supere tus expectativas.
          </p>

          <div data-reveal data-delay="4" style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "2.5rem" }}>
            {[
              "Atención personalizada",
              "Profesionales apasionadas por su trabajo",
              "Productos de alta calidad",
              "Un ambiente elegante, limpio y acogedor",
              "Citas preferidas · Walk-ins bienvenidos",
            ].map((f, idx) => (
              <div key={f} style={{ display: "flex", alignItems: "center", gap: "0.75rem", fontSize: 11, color: "rgba(255,255,255,0.65)", fontFamily: "'Montserrat', sans-serif", animationDelay: `${idx * 0.1}s` }}>
                <div style={{ width: 20, height: 20, borderRadius: "50%", background: "rgba(255,168,198,0.12)", border: "1px solid rgba(255,168,198,0.4)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#ffa8c6" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                {f}
              </div>
            ))}
          </div>

          <div data-reveal data-delay="5">
            <a
              href="#galeria"
              style={{ alignSelf: "flex-start", padding: "13px 32px", background: "transparent", color: "#fff", border: "1px solid rgba(255,168,198,0.4)", fontSize: 10, letterSpacing: "3px", fontFamily: "'Cinzel', serif", fontWeight: 600, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 8, transition: "all .25s", textTransform: "uppercase" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#ffa8c6"; (e.currentTarget as HTMLElement).style.borderColor = "#ffa8c6"; (e.currentTarget as HTMLElement).style.color = "#2a1a20"; (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,168,198,0.4)"; (e.currentTarget as HTMLElement).style.color = "#fff"; (e.currentTarget as HTMLElement).style.transform = "none"; }}
            >
              Ver nuestra galería
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </a>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .about-grid { grid-template-columns: 1fr !important; }
          .about-grid > div:first-child { min-height: 300px; }
        }
      `}</style>
    </section>
  );
}
