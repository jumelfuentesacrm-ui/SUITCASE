import { useEffect, useState } from "react";
import { business } from "@/config/business.config";

const SLIDES = [
  { src: "/klassy/luis-hero-reception.jpg" },
  { src: "/klassy/luis-hero-nails-champagne.jpg" },
  { src: "/klassy/luis-hero-hair-straight.jpg" },
  { src: "/klassy/luis-hero-desk-flowers.jpg" },
];

const STATS = [
  { value: `${business.googleRating.value}★`, label: "Google" },
  { value: `${business.googleRating.count}+`, label: "Reseñas verificadas" },
  { value: business.legalCity.split(",")[0], label: "Puerto Rico" },
  { value: "Walk-ins", label: "Bienvenidos" },
];

export function Hero() {
  const [current, setCurrent] = useState(0);
  const [animating, setAnimating] = useState(false);

  const goTo = (i: number) => {
    if (animating || i === current) return;
    setAnimating(true);
    setCurrent(i);
    setTimeout(() => setAnimating(false), 1000);
  };

  useEffect(() => {
    const t = setInterval(() => goTo((current + 1) % SLIDES.length), 5500);
    return () => clearInterval(t);
  }, [current, animating]);

  return (
    <section
      id="inicio"
      style={{ position: "relative", width: "100%", height: "100vh", minHeight: 600, overflow: "hidden", background: "#1a0f14" }}
    >
      {SLIDES.map((s, i) => (
        <div
          key={s.src}
          style={{
            position: "absolute", inset: 0,
            backgroundImage: `url(${s.src})`,
            backgroundSize: "cover", backgroundPosition: "center",
            opacity: i === current ? 1 : 0,
            transition: "opacity 1.2s ease-in-out",
            zIndex: i === current ? 1 : 0,
          }}
        />
      ))}

      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(26,15,20,0.45) 0%, rgba(26,15,20,0.1) 40%, rgba(26,15,20,0.75) 85%, rgba(26,15,20,0.92) 100%)", zIndex: 2 }} />

      {/* Main content */}
      <div
        className="hero-content"
        style={{
          position: "absolute", inset: 0, zIndex: 3,
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          paddingLeft: "1.5rem", paddingRight: "1.5rem",
          paddingTop: "80px",
          paddingBottom: "7rem",
          textAlign: "center",
        }}
      >
        <div style={{ marginBottom: "1.5rem", textAlign: "center" }}>
          <span style={{ fontFamily: "'Cinzel', serif", fontSize: "clamp(9px,1.2vw,11px)", letterSpacing: "6px", color: "#d9b850", fontWeight: 500, display: "block", textTransform: "uppercase" }}>
            {business.name}
          </span>
          <span style={{ fontFamily: "'Cinzel', serif", fontSize: "clamp(8px,1vw,10px)", letterSpacing: "4px", color: "rgba(217,184,80,0.7)", fontWeight: 400, display: "block", marginTop: "4px", textTransform: "uppercase" }}>
            {business.legalCity}
          </span>
        </div>

        <h1
          style={{
            fontFamily: "'Cinzel Decorative', serif",
            fontSize: "clamp(32px, 5.5vw, 72px)",
            fontWeight: 400, lineHeight: 1.2,
            color: "#fff", marginBottom: "1.25rem",
            letterSpacing: "0.02em",
          }}
        >
          Realzamos tu <span style={{ color: "#ffa8c6" }}>belleza.</span><br />
          Elevamos tu Experiencia.
        </h1>

        <p
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: "clamp(16px, 2vw, 20px)",
            fontStyle: "italic",
            color: "rgba(255,255,255,0.7)",
            marginBottom: "2.5rem",
            maxWidth: 520, lineHeight: 1.7,
          }}
        >
          Manicura · Pedicura · Cabello y Más<br />
          Frente a Plaza Carolina
        </p>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center", marginBottom: "2.5rem" }}>
          <a
            href="#agendar"
            style={{ padding: "14px 36px", background: "#ffa8c6", color: "#2a1a20", fontSize: 11, letterSpacing: "3px", fontFamily: "'Cinzel', serif", fontWeight: 600, textDecoration: "none", display: "inline-block", transition: "background .2s" }}
            onMouseEnter={e => (e.currentTarget.style.background = "#e87fac")}
            onMouseLeave={e => (e.currentTarget.style.background = "#ffa8c6")}
          >
            RESERVA TU CITA
          </a>
          <a
            href="#servicios"
            style={{ padding: "14px 36px", background: "transparent", color: "#fff", border: "1px solid rgba(255,255,255,0.45)", fontSize: 11, letterSpacing: "3px", fontFamily: "'Cinzel', serif", fontWeight: 500, textDecoration: "none", display: "inline-block", transition: "all .2s" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "#fff"; (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.08)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.45)"; (e.currentTarget as HTMLElement).style.background = "transparent"; }}
          >
            NUESTROS SERVICIOS
          </a>
        </div>

        {/* Slide dots */}
        <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              style={{ width: i === current ? 28 : 7, height: 7, borderRadius: 99, background: i === current ? "#ffa8c6" : "rgba(255,255,255,0.35)", border: "none", cursor: "pointer", padding: 0, transition: "all .4s" }}
            />
          ))}
        </div>
      </div>

      {/* Stats bar — pinned to bottom */}
      <div
        style={{
          position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 4,
          display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
          background: "rgba(26,15,20,0.85)",
          backdropFilter: "blur(8px)",
          borderTop: "0.5px solid rgba(217,184,80,0.3)",
        }}
      >
        {STATS.map((s, i) => (
          <div
            key={i}
            style={{
              padding: "1rem 0.75rem",
              textAlign: "center",
              borderRight: i < 3 ? "0.5px solid rgba(255,255,255,0.1)" : "none",
            }}
          >
            <div style={{ fontFamily: "'Cinzel Decorative', serif", fontSize: "clamp(16px,2.5vw,22px)", color: "#ffa8c6", fontWeight: 400, lineHeight: 1 }}>
              {s.value}
            </div>
            <div style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 9, letterSpacing: "2px", color: "rgba(255,255,255,0.5)", marginTop: "0.4rem", textTransform: "uppercase" }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* Scroll hint */}
      <div style={{ position: "absolute", bottom: "6rem", right: "2rem", zIndex: 4, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, opacity: 0.4 }}>
        <div style={{ width: 1, height: 36, background: "#fff", animation: "scrollLine 2s ease-in-out infinite" }} />
        <span style={{ fontSize: 9, letterSpacing: "3px", color: "#fff", fontFamily: "'Montserrat', sans-serif", writingMode: "vertical-rl" }}>SCROLL</span>
      </div>

      <style>{`
        @keyframes scrollLine {
          0%, 100% { opacity: 0.3; transform: scaleY(1); }
          50%       { opacity: 0.9; transform: scaleY(1.15); }
        }
        @media (max-width: 640px) {
          #inicio { min-height: 100svh !important; }
        }
        @media (min-width: 641px) {
          .hero-content { padding-top: 160px !important; }
        }
        @media (max-width: 500px) {
          #inicio [style*="grid-template-columns: repeat(4"] {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
      `}</style>
    </section>
  );
}
