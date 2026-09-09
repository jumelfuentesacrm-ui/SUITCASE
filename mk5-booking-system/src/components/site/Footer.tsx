import { INSTAGRAM_URL, PHONE } from "./data";
import { business } from "@/config/business.config";

const WHATSAPP_URL = `https://wa.me/${business.whatsapp}`;

const navLinks = [
  { href: "#inicio",         label: "Inicio" },
  { href: "#servicios",      label: "Servicios" },
  { href: "#galeria",        label: "Galería" },
  { href: "#sobre-nosotras", label: "Nosotras" },
  { href: "#contacto",       label: "Contacto" },
];

const socialLinks = [
  { label: "Instagram",         href: INSTAGRAM_URL,  external: true },
  { label: "WhatsApp",          href: WHATSAPP_URL,   external: true },
  { label: business.phoneDisplay, href: `tel:${PHONE}`, external: false },
];

const linkStyle: React.CSSProperties = {
  fontSize: 9, color: "rgba(255,255,255,0.35)", letterSpacing: "3px",
  textDecoration: "none", fontFamily: "'Cinzel', serif",
  transition: "color .2s", textTransform: "uppercase",
};

function scrollTo(id: string) {
  const el = document.querySelector(id);
  if (el) el.scrollIntoView({ behavior: "smooth" });
}

export function Footer() {
  return (
    <footer style={{ background: "#2a1a20" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "3.5rem 2rem 2rem" }}>

        {/* Brand — fully centered, links to admin */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", marginBottom: "3rem" }}>
          <a href="/admin" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
            <img src="/brand/mark.svg" alt="" aria-hidden="true" style={{ width: 32, height: 32, filter: "brightness(0) saturate(100%) invert(75%) sepia(30%) saturate(600%) hue-rotate(5deg) brightness(95%)" }} />
            <div style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "'Cinzel Decorative', serif", fontSize: 18, color: "#ffa8c6", fontWeight: 400, lineHeight: 1 }}>{business.shortName}</div>
              <div style={{ fontFamily: "'Cinzel', serif", fontSize: 8, letterSpacing: "5px", color: "#d9b850", textTransform: "uppercase", marginTop: 3 }}>{business.tagline}</div>
            </div>
          </a>
          {/* Optional wordmark image below the icon+name lockup above — most
              rebrands won't need both, so this is off unless the client has
              a dedicated wordmark file. Point it at /public/brand/logo-wordmark.png. */}
          {business.brandBadge && (
            <a href="/admin" style={{ display: "inline-block" }}>
              <img src="/brand/logo-wordmark.png" alt={business.name} style={{ width: 180, height: "auto", display: "block" }} />
            </a>
          )}
        </div>

        {/* Links — 2 columns, centered */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem 3rem", maxWidth: 400, margin: "0 auto" }}>
          {[...navLinks, ...socialLinks].map(l => (
            "href" in l && l.href.startsWith("#") ? (
              <a
                key={l.label}
                href={l.href}
                onClick={e => { e.preventDefault(); scrollTo(l.href); }}
                style={linkStyle}
                onMouseEnter={e => (e.currentTarget.style.color = "#ffa8c6")}
                onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.35)")}
              >{l.label}</a>
            ) : (
              <a
                key={l.label}
                href={(l as typeof socialLinks[0]).href}
                target={(l as typeof socialLinks[0]).external ? "_blank" : undefined}
                rel={(l as typeof socialLinks[0]).external ? "noreferrer" : undefined}
                style={linkStyle}
                onMouseEnter={e => (e.currentTarget.style.color = "#ffa8c6")}
                onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.35)")}
              >{l.label}</a>
            )
          ))}
        </div>
      </div>

      {/* Bottom */}
      <div style={{ borderTop: "0.5px solid rgba(255,255,255,0.06)", textAlign: "center", padding: "1.25rem 2rem", fontSize: 9, color: "rgba(255,255,255,0.2)", letterSpacing: "2px", fontFamily: "'Cinzel', serif", textTransform: "uppercase" }}>
        © 2025{" "}
        <a href="/admin" style={{ color: "rgba(255,255,255,0.2)", textDecoration: "none", transition: "color .2s" }}
          onMouseEnter={e => (e.currentTarget.style.color = "#ffa8c6")}
          onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.2)")}
        >{business.name}</a>
        {" "}· {business.legalCity} · All rights reserved
      </div>
    </footer>
  );
}
