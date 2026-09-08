import type { RefObject } from "react";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { PHONE } from "./data";
import { business } from "@/config/business.config";

const CARDS = [
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ffa8c6" strokeWidth="1.2">
        <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
    ),
    tag: "En línea · 24/7",
    title: "Agenda tu cita",
    body: "Elige tu servicio, especialista y hora favorita directamente desde la app.",
    cta: "AGENDAR AHORA",
    href: "/#agendar",
    external: false,
    primary: true,
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#d9b850" strokeWidth="1.2">
        <circle cx="12" cy="12" r="10"/><polyline points="20 6 9 17 4 12"/>
      </svg>
    ),
    tag: "Manicura · Cabello · Spa",
    title: "Nuestros servicios",
    body: "Explora todos los servicios que tenemos para hacerte sentir especial.",
    cta: "VER SERVICIOS",
    href: "#servicios",
    external: false,
    primary: false,
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#73815e" strokeWidth="1.2">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
      </svg>
    ),
    tag: "WhatsApp · Llamada",
    title: "Habla con nosotras",
    body: "¿Tienes preguntas? Escríbenos por WhatsApp o llámanos directamente.",
    cta: "WHATSAPP",
    href: `https://wa.me/1${PHONE}`,
    external: true,
    primary: false,
  },
];

export function BookCta() {
  const sectionRef = useScrollReveal() as RefObject<HTMLElement>;

  return (
    <section
      ref={sectionRef}
      style={{ background: "#2a1a20", padding: "5rem 1.5rem", position: "relative", overflow: "hidden" }}
    >
      <div aria-hidden="true" style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)", fontFamily: "'Cinzel Decorative', serif", fontSize: "clamp(200px,35vw,360px)", fontWeight: 400, color: "rgba(255,168,198,0.04)", lineHeight: 1, pointerEvents: "none", userSelect: "none", whiteSpace: "nowrap" }}>
        K
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", position: "relative" }}>
        <div data-reveal style={{ textAlign: "center", marginBottom: "3.5rem" }}>
          <span style={{ display: "block", fontSize: 9, letterSpacing: "5px", color: "#d9b850", fontFamily: "'Cinzel', serif", fontWeight: 600, marginBottom: "1rem", textTransform: "uppercase" }}>
            Tu próxima cita
          </span>
          <h2 style={{ fontFamily: "'Cinzel Decorative', serif", fontSize: "clamp(22px,3.5vw,38px)", fontWeight: 400, color: "#fff", lineHeight: 1.25 }}>
            Está a solo unos clics.
          </h2>
          <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(15px,2vw,19px)", fontStyle: "italic", color: "rgba(255,255,255,0.45)", marginTop: "0.75rem" }}>
            Porque mereces consentirte.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "clamp(12px,2vw,24px)" }}>
          {CARDS.map((card, i) => (
            <a
              key={card.title}
              data-reveal="scale"
              data-delay={String(i + 1) as "1"|"2"|"3"}
              href={card.href}
              target={card.external ? "_blank" : undefined}
              rel={card.external ? "noreferrer" : undefined}
              style={{
                display: "flex", flexDirection: "column",
                padding: "2rem 1.75rem",
                background: card.primary ? "rgba(255,168,198,0.1)" : "rgba(255,255,255,0.04)",
                border: card.primary ? "1px solid rgba(255,168,198,0.35)" : "1px solid rgba(255,255,255,0.1)",
                textDecoration: "none",
                transition: "background .2s, border-color .2s, transform .2s",
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.background = card.primary ? "rgba(255,168,198,0.18)" : "rgba(255,255,255,0.08)";
                (e.currentTarget as HTMLElement).style.borderColor = card.primary ? "rgba(255,168,198,0.6)" : "rgba(255,255,255,0.25)";
                (e.currentTarget as HTMLElement).style.transform = "translateY(-4px)";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.background = card.primary ? "rgba(255,168,198,0.1)" : "rgba(255,255,255,0.04)";
                (e.currentTarget as HTMLElement).style.borderColor = card.primary ? "rgba(255,168,198,0.35)" : "rgba(255,255,255,0.1)";
                (e.currentTarget as HTMLElement).style.transform = "none";
              }}
            >
              <div style={{ marginBottom: "1.25rem" }}>{card.icon}</div>
              <span style={{ fontSize: 9, letterSpacing: "3px", color: "rgba(255,255,255,0.4)", fontFamily: "'Cinzel', serif", marginBottom: "0.6rem", textTransform: "uppercase", display: "block" }}>
                {card.tag}
              </span>
              <h3 style={{ fontFamily: "'Cinzel Decorative', serif", fontSize: "clamp(15px,1.8vw,19px)", fontWeight: 400, color: "#fff", lineHeight: 1.3, marginBottom: "0.75rem" }}>
                {card.title}
              </h3>
              <p style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 11, lineHeight: 1.9, color: "rgba(255,255,255,0.45)", marginBottom: "1.75rem", flexGrow: 1 }}>
                {card.body}
              </p>
              <span style={{ fontSize: 10, letterSpacing: "3px", color: card.primary ? "#ffa8c6" : "rgba(255,255,255,0.55)", fontFamily: "'Cinzel', serif", fontWeight: 600, display: "flex", alignItems: "center", gap: 6, textTransform: "uppercase" }}>
                {card.cta}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </span>
            </a>
          ))}
        </div>

        <div style={{ textAlign: "center", marginTop: "3rem" }}>
          <a href={`tel:${PHONE}`} style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(22px,3vw,30px)", color: "rgba(255,255,255,0.35)", textDecoration: "none", transition: "color .2s" }}
            onMouseEnter={e => (e.currentTarget.style.color = "#ffa8c6")}
            onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.35)")}
          >
            {business.phoneDisplay}
          </a>
          <p style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 9, letterSpacing: "3px", color: "rgba(255,255,255,0.25)", marginTop: "0.4rem", textTransform: "uppercase" }}>
            {business.legalCity} · Walk-ins welcome
          </p>
        </div>
      </div>
    </section>
  );
}
