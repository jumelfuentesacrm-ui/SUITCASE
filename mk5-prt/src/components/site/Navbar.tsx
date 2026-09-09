import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import { business } from "@/config/business.config";

const NAV_LINKS = [
  { href: "/",          label: "Inicio" },
  { href: "/servicios", label: "Servicios" },
  { href: "/galeria",   label: "Galería" },
  { href: "/nosotras",  label: "Nosotras" },
  { href: "/contacto",  label: "Contacto" },
];

const BOOKING_CATEGORIES = [
  { label: "Cabello",   href: "/servicios/cabello" },
  { label: "Uñas",     href: "/servicios/manicure" },
  { label: "Pies",     href: "/servicios/pedicure" },
];

export function Navbar() {
  const [scrolled, setScrolled]             = useState(false);
  const [mobileOpen, setMobileOpen]         = useState(false);
  const [dropOpen, setDropOpen]             = useState(false);
  const [mobileAgendarOpen, setMobileAgendarOpen] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const router = useRouter();

  const isHome = router.state.location.pathname === "/";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setDropOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const dark = !isHome || scrolled;

  const navBg  = isHome
    ? (scrolled ? "rgba(254,239,242,0.72)" : "rgba(255,255,255,0.08)")
    : "rgba(26,15,20,0.92)";
  const navBlur = "blur(24px) saturate(180%)";
  const navBorder = isHome
    ? (scrolled ? "0.5px solid rgba(255,168,198,0.35)" : "0.5px solid rgba(255,255,255,0.18)")
    : "0.5px solid rgba(255,168,198,0.18)";
  const linkC   = dark ? (isHome ? "#7a5060" : "rgba(255,255,255,0.82)") : "rgba(255,255,255,0.88)";
  const linkH   = "#ffa8c6";

  const drawerBg = isHome
    ? (scrolled ? "rgba(255,235,242,0.60)" : "rgba(255,220,235,0.10)")
    : "rgba(26,15,20,0.96)";

  function closeMobile() {
    setMobileOpen(false);
    setMobileAgendarOpen(false);
  }

  const backColor = dark ? (isHome ? "#7a5060" : "rgba(255,255,255,0.88)") : "rgba(255,255,255,0.88)";

  return (
    <header style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
      background: navBg,
      backdropFilter: navBlur,
      WebkitBackdropFilter: navBlur,
      borderBottom: navBorder,
      transition: "background 0.4s, border-color 0.4s",
    }}>
      <div style={{
        maxWidth: 1280, margin: "0 auto", padding: "0.8rem 2rem",
        display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center",
      }}>

        {/* Left: desktop nav (first 3 links) + mobile back arrow */}
        <div style={{ gridColumn: 1, display: "flex", alignItems: "center" }}>
          <nav className="desktop-nav" style={{ display: "flex", alignItems: "center", gap: "2rem" }}>
            {NAV_LINKS.slice(0, 3).map(l => (
              <Link key={l.href} to={l.href}
                style={{ fontSize: 10, letterSpacing: "2.5px", color: linkC, fontWeight: 500, textDecoration: "none", fontFamily: "'Cinzel', serif", transition: "color .2s", textTransform: "uppercase" }}
                onMouseEnter={e => (e.currentTarget.style.color = linkH)}
                onMouseLeave={e => (e.currentTarget.style.color = linkC)}
              >{l.label}</Link>
            ))}
          </nav>

          {/* Back arrow (mobile, non-home) */}
          {!isHome && (
            <button
              aria-label="Regresar"
              onClick={() => window.history.back()}
              className="mobile-back-btn"
              style={{ background: "none", border: "none", cursor: "pointer", color: backColor, padding: 4, display: "none", alignItems: "center", gap: 4, fontFamily: "'Cinzel', serif", fontSize: 9, letterSpacing: "2px", textTransform: "uppercase", transition: "color .3s" }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M19 12H5M12 5l-7 7 7 7"/>
              </svg>
            </button>
          )}
        </div>

        {/* Logo — col 2 */}
        <div style={{ gridColumn: 2, display: "flex", justifyContent: "center" }}>
          <Link to="/" style={{ textDecoration: "none", display: "flex", alignItems: "center" }}>
            <img
              src={business.logoUrl}
              alt={business.name}
              style={{ height: "clamp(22px,2.8vw,32px)", width: "auto", display: "block" }}
            />
          </Link>
        </div>

        {/* Right: last 2 links + Agendar (desktop) | hamburger (mobile) */}
        <div style={{ gridColumn: 3, display: "flex", justifyContent: "flex-end", alignItems: "center" }}>
          <nav className="desktop-nav" style={{ display: "flex", alignItems: "center", gap: "2rem" }}>
            {NAV_LINKS.slice(3).map(l => (
              <Link key={l.href} to={l.href}
                style={{ fontSize: 10, letterSpacing: "2.5px", color: linkC, fontWeight: 500, textDecoration: "none", fontFamily: "'Cinzel', serif", transition: "color .2s", textTransform: "uppercase" }}
                onMouseEnter={e => (e.currentTarget.style.color = linkH)}
                onMouseLeave={e => (e.currentTarget.style.color = linkC)}
              >{l.label}</Link>
            ))}

            {/* Agendar dropdown */}
            <div ref={dropRef} style={{ position: "relative" }}>
              <button onClick={() => setDropOpen(v => !v)}
                style={{ fontSize: 10, letterSpacing: "2.5px", padding: "10px 24px", border: "none", color: "#2a1a20", background: "#ffa8c6", fontFamily: "'Cinzel', serif", fontWeight: 600, cursor: "pointer", transition: "background .2s", display: "inline-flex", alignItems: "center", gap: 7, textTransform: "uppercase" }}
                onMouseEnter={e => (e.currentTarget.style.background = "#e87fac")}
                onMouseLeave={e => (e.currentTarget.style.background = "#ffa8c6")}
              >
                Agendar
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ transition: "transform .2s", transform: dropOpen ? "rotate(180deg)" : "none" }}>
                  <path d="M6 9l6 6 6-6"/>
                </svg>
              </button>

              {dropOpen && (
                <div style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, background: "rgba(254,239,242,0.88)", backdropFilter: "blur(20px) saturate(160%)", WebkitBackdropFilter: "blur(20px) saturate(160%)", border: "0.5px solid rgba(255,168,198,0.3)", boxShadow: "0 8px 32px rgba(42,26,32,0.12)", minWidth: 180, zIndex: 100, overflow: "hidden" }}>
                  {BOOKING_CATEGORIES.map((cat, i) => (
                    <Link key={cat.label} to={cat.href} onClick={() => setDropOpen(false)}
                      style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 18px", borderBottom: i < BOOKING_CATEGORIES.length - 1 ? "0.5px solid rgba(255,168,198,0.2)" : "none", fontSize: 10, letterSpacing: "2px", color: "#7a5060", fontFamily: "'Cinzel', serif", textDecoration: "none", fontWeight: 500, transition: "background .15s, color .15s", textTransform: "uppercase" }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.6)"; (e.currentTarget as HTMLElement).style.color = "#ffa8c6"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "#7a5060"; }}
                    >
                      {cat.label}
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </nav>

          {/* Hamburger (mobile) */}
          <button
            aria-label="Menú"
            onClick={() => { if (mobileOpen) closeMobile(); else setMobileOpen(true); }}
            className="mobile-hamburger"
            style={{ background: "none", border: "none", cursor: "pointer", color: isHome && scrolled ? "#2a1a20" : "#fff", padding: 4, transition: "color .3s", display: "none" }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              {mobileOpen ? <path d="M6 6l12 12M18 6L6 18"/> : <path d="M3 7h18M3 12h18M3 17h18"/>}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div style={{
          background: drawerBg,
          backdropFilter: "blur(40px) saturate(220%) brightness(1.08)",
          WebkitBackdropFilter: "blur(40px) saturate(220%) brightness(1.08)",
          borderTop: "0.5px solid rgba(255,255,255,0.18)",
          borderBottom: "0.5px solid rgba(255,168,198,0.15)",
          boxShadow: "0 12px 48px rgba(42,26,32,0.12), inset 0 1px 0 rgba(255,255,255,0.15)",
        }}>
          <ul style={{ listStyle: "none", padding: "0.5rem 2rem 1.5rem", margin: 0 }}>
            {NAV_LINKS.map(l => (
              <li key={l.href}>
                <Link to={l.href} onClick={closeMobile}
                  style={{ display: "block", padding: "15px 0", fontSize: 10, letterSpacing: "3px", color: isHome && scrolled ? "#5a3040" : "#fff", borderBottom: "0.5px solid rgba(255,168,198,0.2)", textDecoration: "none", fontFamily: "'Cinzel', serif", textTransform: "uppercase", textShadow: isHome && !scrolled ? "0 1px 8px rgba(0,0,0,0.4)" : "none" }}>
                  {l.label}
                </Link>
              </li>
            ))}

            {/* Agendar accordion */}
            <li style={{ paddingTop: "1.25rem" }}>
              <button onClick={() => setMobileAgendarOpen(v => !v)}
                style={{ width: "100%", padding: "14px 20px", background: "#ffa8c6", border: "none", cursor: "pointer", fontFamily: "'Cinzel', serif", fontSize: 10, letterSpacing: "3px", color: "#2a1a20", fontWeight: 600, textTransform: "uppercase", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                Agendar
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#2a1a20" strokeWidth="2.5"
                  style={{ transition: "transform .25s", transform: mobileAgendarOpen ? "rotate(180deg)" : "none" }}>
                  <path d="M6 9l6 6 6-6"/>
                </svg>
              </button>
            </li>

            {mobileAgendarOpen && BOOKING_CATEGORIES.map((cat, i) => (
              <li key={cat.label}>
                <Link to={cat.href} onClick={closeMobile}
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 20px", fontSize: 10, letterSpacing: "2px", color: "#fff", borderTop: "0.5px solid rgba(255,168,198,0.2)", background: "rgba(255,168,198,0.08)", textDecoration: "none", fontFamily: "'Cinzel', serif", textTransform: "uppercase" }}>
                  {cat.label}
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ffa8c6" strokeWidth="1.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </Link>
              </li>
            ))}

            <li style={{ height: "1rem" }} />
          </ul>
        </div>
      )}

      <style>{`
        @media (max-width: 900px) {
          .desktop-nav { display: none !important; }
          .mobile-hamburger { display: block !important; }
          .mobile-back-btn { display: flex !important; }
        }
      `}</style>
    </header>
  );
}
