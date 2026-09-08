import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { INSTAGRAM_URL, PHONE, ADDRESS } from "@/components/site/data";
import { business } from "@/config/business.config";

export const Route = createFileRoute("/contacto")({
  head: () => ({
    meta: [
      { title: `Contacto | ${business.name} — ${business.legalCity} · ${business.phoneDisplay}` },
      { name: "description", content: `Contacta a ${business.name} en ${business.legalCity}. Llámanos al ${business.phoneDisplay}, escríbenos por WhatsApp o visítanos frente a Plaza ${business.legalCity.split(",")[0]}. Walk-ins bienvenidos.` },
      { name: "keywords", content: "klassy salon contacto, salon carolina puerto rico telefono, nail salon carolina pr direccion, frente plaza carolina salon" },
      { property: "og:title", content: `Contacto | ${business.name}` },
      { property: "og:description", content: `${business.name} · ${business.legalCity} · ${business.phoneDisplay} · Frente a Plaza ${business.legalCity.split(",")[0]}` },
    ],
  }),
  component: ContactoPage,
});

const PINK = "#ffa8c6";
const GOLD = "#d9b850";
const ff   = "'Montserrat', sans-serif";
const ffS  = "'Cinzel Decorative', serif";
const ffB  = "'Cormorant Garamond', serif";

const HOURS = [
  { day: "Lunes – Viernes", time: "9:00am – 7:00pm" },
  { day: "Sábado",          time: "9:00am – 6:00pm" },
  { day: "Domingo",         time: "Cerrado" },
];

const CONTACTS = [
  {
    label: `${business.phoneDisplay}`,
    sub: "Llamadas",
    href: `tel:${PHONE}`,
    icon: "M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.9 19.79 19.79 0 01.1 1.28 2 2 0 012.06.1h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z",
    external: false,
  },
  {
    label: "WhatsApp",
    sub: "Mensajes rápidos",
    href: `https://wa.me/1${PHONE}`,
    icon: "M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z",
    external: true,
  },
  {
    label: "@klassysalon.pr",
    sub: "Instagram",
    href: INSTAGRAM_URL,
    icon: "M3 3h18v18H3zM12 8a4 4 0 100 8 4 4 0 000-8zM17.5 6.5h.01",
    external: true,
  },
];

function ContactoPage() {
  return (
    <div style={{ background: "#feeff2", color: "#2a1a20", minHeight: "100vh" }}>
      <Navbar />

      {/* Hero */}
      <section style={{ position: "relative", minHeight: "clamp(260px,38vw,400px)", overflow: "hidden", display: "flex", alignItems: "flex-end" }}>
        <img src="/klassy/neon-siempre-klassy.jpg" alt={`Siempre ${business.shortName}`} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(42,26,32,0.85) 0%, rgba(42,26,32,0.2) 100%)" }} />
        <div style={{ position: "relative", zIndex: 10, width: "100%", paddingTop: 120 }}>
          <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 2rem 3rem", textAlign: "center" }}>
            <p style={{ fontFamily: "'Cinzel', serif", fontSize: 9, letterSpacing: "5px", color: GOLD, marginBottom: 16, textTransform: "uppercase" }}>{business.name} · Carolina PR</p>
            <h1 style={{ fontFamily: ffS, fontSize: "clamp(28px,5vw,52px)", fontWeight: 400, color: "#fff", margin: "0 0 16px", lineHeight: 1.2 }}>Contáctanos</h1>
            <p style={{ fontFamily: ffB, fontSize: "clamp(15px,2vw,18px)", fontStyle: "italic", color: "rgba(255,255,255,0.78)", lineHeight: 1.8 }}>Estamos aquí para ayudarte. Walk-ins siempre bienvenidos.</p>
          </div>
        </div>
      </section>

      {/* Main grid */}
      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "80px 2rem", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4rem", alignItems: "start" }}>

        {/* Contact info */}
        <div>
          <p style={{ fontFamily: "'Cinzel', serif", fontSize: 9, letterSpacing: "4px", color: GOLD, marginBottom: 12, textTransform: "uppercase" }}>Háblanos</p>
          <h2 style={{ fontFamily: ffS, fontSize: "clamp(20px,3vw,32px)", fontWeight: 400, color: "#2a1a20", marginBottom: 36 }}>Canales de contacto</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {CONTACTS.map(c => (
              <a key={c.label} href={c.href}
                target={c.external ? "_blank" : undefined}
                rel={c.external ? "noreferrer" : undefined}
                style={{ display: "flex", alignItems: "center", gap: 16, padding: "18px 0", borderBottom: "0.5px solid rgba(255,168,198,0.2)", textDecoration: "none", transition: "all .2s" }}
                onMouseEnter={e => (e.currentTarget.style.paddingLeft = "8px")}
                onMouseLeave={e => (e.currentTarget.style.paddingLeft = "0")}>
                <div style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(255,168,198,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={PINK} strokeWidth="1.5">
                    <path d={c.icon} />
                  </svg>
                </div>
                <div>
                  <div style={{ fontFamily: "'Cinzel', serif", fontSize: 11, color: "#2a1a20", letterSpacing: "1px" }}>{c.label}</div>
                  <div style={{ fontFamily: ff, fontSize: 10, color: "#9a7080", marginTop: 2, letterSpacing: "1px" }}>{c.sub}</div>
                </div>
              </a>
            ))}
          </div>

          {/* Hours */}
          <div style={{ marginTop: 48 }}>
            <p style={{ fontFamily: "'Cinzel', serif", fontSize: 9, letterSpacing: "4px", color: GOLD, marginBottom: 20, textTransform: "uppercase" }}>Horario</p>
            {HOURS.map(h => (
              <div key={h.day} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "0.5px solid rgba(255,168,198,0.15)" }}>
                <span style={{ fontFamily: ff, fontSize: 12, color: "#7a6070" }}>{h.day}</span>
                <span style={{ fontFamily: "'Cinzel', serif", fontSize: 10, color: h.time === "Cerrado" ? "#b09090" : "#2a1a20", letterSpacing: "1px" }}>{h.time}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Location */}
        <div>
          <p style={{ fontFamily: "'Cinzel', serif", fontSize: 9, letterSpacing: "4px", color: GOLD, marginBottom: 12, textTransform: "uppercase" }}>Ubicación</p>
          <h2 style={{ fontFamily: ffS, fontSize: "clamp(20px,3vw,32px)", fontWeight: 400, color: "#2a1a20", marginBottom: 24 }}>Encuéntranos</h2>
          <p style={{ fontFamily: ffB, fontSize: 16, fontStyle: "italic", color: "#7a5060", lineHeight: 1.8, marginBottom: 8 }}>Frente a Plaza Carolina</p>
          <p style={{ fontFamily: ff, fontSize: 12, color: "#9a7080", lineHeight: 1.9, marginBottom: 32 }}>{ADDRESS}</p>

          {/* Map embed */}
          <div style={{ width: "100%", aspectRatio: "4/3", overflow: "hidden", border: "0.5px solid rgba(255,168,198,0.25)" }}>
            <iframe
              title={`${business.name} ubicación`}
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3784.6!2d-65.9789!3d18.4009!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x8c036796c0000001%3A0x1!2sPlaza+Carolina%2C+Carolina%2C+Puerto+Rico!5e0!3m2!1ses!2spr!4v1"
              width="100%" height="100%" style={{ border: 0 }} allowFullScreen loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>

          <a href={`https://maps.google.com/?q=${encodeURIComponent(ADDRESS)}`} target="_blank" rel="noreferrer"
            style={{ display: "inline-block", marginTop: 16, padding: "11px 24px", border: `1px solid ${PINK}`, color: PINK, fontFamily: "'Cinzel', serif", fontSize: 9, letterSpacing: "2px", textDecoration: "none", transition: "all .2s", textTransform: "uppercase" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = PINK; (e.currentTarget as HTMLElement).style.color = "#2a1a20"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = PINK; }}>
            Abrir en Maps
          </a>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: "40px 2rem 80px", textAlign: "center", background: "rgba(255,168,198,0.06)" }}>
        <p style={{ fontFamily: ffB, fontSize: 16, fontStyle: "italic", color: "#9a7080", marginBottom: 20 }}>¿Lista para reservar tu cita?</p>
        <a href="/servicios" style={{ display: "inline-block", padding: "14px 36px", background: PINK, color: "#2a1a20", fontFamily: "'Cinzel', serif", fontSize: 10, letterSpacing: "3px", textDecoration: "none", transition: "background .2s", textTransform: "uppercase" }}
          onMouseEnter={e => (e.currentTarget.style.background = "#e87fac")}
          onMouseLeave={e => (e.currentTarget.style.background = PINK)}>
          Ver servicios
        </a>
      </section>

      <Footer />

      <style>{`
        @media (max-width: 768px) {
          section > div[style*="grid-template-columns: 1fr 1fr"] {
            grid-template-columns: 1fr !important;
            gap: 3rem !important;
          }
        }
      `}</style>
    </div>
  );
}
