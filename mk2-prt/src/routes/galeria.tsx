import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { PORTFOLIO, INSTAGRAM_URL } from "@/components/site/data";
import { business } from "@/config/business.config";

export const Route = createFileRoute("/galeria")({
  head: () => ({
    meta: [
      { title: `Galería | ${business.name} — Manicure, Pedicure & Cabello ${business.legalCity}` },
      { name: "description", content: `Galería de trabajos de ${business.name} en ${business.legalCity}. Nail art, manicure, pedicure, cabello, balayage y más. ¡Inspírate!` },
      { name: "keywords", content: "galería nail art carolina pr, manicure carolina puerto rico, uñas diseño carolina pr, nail salon carolina pr fotos" },
      { property: "og:title", content: `Galería | ${business.name}` },
      { property: "og:description", content: "Mira nuestros trabajos de manicure, pedicure y cabello en Carolina, PR." },
      { property: "og:image", content: "/brand/galeria-1.jpg" },
    ],
  }),
  component: GaleriaPage,
});

const PINK = "#ffa8c6";
const ff   = "'Montserrat', sans-serif";
const ffS  = "'Cinzel Decorative', serif";
const ffB  = "'Cormorant Garamond', serif";

const SALON = [
  "/brand/galeria-1.jpg",
  "/brand/galeria-2.jpg",
  "/brand/galeria-3.jpg",
  "/brand/galeria-4.jpg",
  "/brand/galeria-5.jpg",
  "/brand/galeria-6.jpg",
  "/brand/galeria-7.jpg",
  "/brand/galeria-8.jpg",
];

type Tab = "trabajos" | "salon";

function GaleriaPage() {
  const [tab, setTab] = useState<Tab>("trabajos");
  const [lightbox, setLightbox] = useState<string | null>(null);
  const imgs = tab === "trabajos" ? PORTFOLIO : SALON;

  return (
    <div style={{ background: "#feeff2", color: "#2a1a20", minHeight: "100vh" }}>
      <Navbar />

      {/* Header */}
      <section style={{ position: "relative", minHeight: "clamp(260px,38vw,400px)", overflow: "hidden", display: "flex", alignItems: "flex-end" }}>
        <img src="/brand/galeria-1.jpg" alt={`Galería ${business.name}`} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(42,26,32,0.85) 0%, rgba(42,26,32,0.15) 100%)" }} />
        <div style={{ position: "relative", zIndex: 10, width: "100%", paddingTop: 120 }}>
          <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 2rem 3rem", textAlign: "center" }}>
            <p style={{ fontFamily: "'Cinzel', serif", fontSize: 9, letterSpacing: "5px", color: "#d9b850", marginBottom: 16, textTransform: "uppercase" }}>{business.name} · Carolina PR</p>
            <h1 style={{ fontFamily: ffS, fontSize: "clamp(30px,5vw,56px)", fontWeight: 400, color: "#fff", margin: "0 0 16px", lineHeight: 1.2 }}>Galería</h1>
            <p style={{ fontFamily: ffB, fontSize: "clamp(15px,2vw,18px)", fontStyle: "italic", color: "rgba(255,255,255,0.78)", lineHeight: 1.8 }}>Nuestros trabajos hablan por nosotras</p>
          </div>
        </div>
      </section>

      {/* Tabs */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 2rem 0" }}>
        <div style={{ display: "flex", gap: 0, borderBottom: "1px solid rgba(255,168,198,0.25)", marginBottom: 40 }}>
          {(["trabajos", "salon"] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{
                padding: "12px 28px", background: "none", border: "none", cursor: "pointer",
                fontFamily: "'Cinzel', serif", fontSize: 9, letterSpacing: "3px", fontWeight: 500,
                color: tab === t ? PINK : "#9a7080", textTransform: "uppercase",
                borderBottom: tab === t ? `2px solid ${PINK}` : "2px solid transparent",
                transition: "color .2s",
              }}>
              {t === "trabajos" ? "Trabajos realizados" : "El salón"}
            </button>
          ))}
        </div>

        {/* Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem", paddingBottom: 80 }}>
          {imgs.map((src, i) => (
            <div key={i} onClick={() => window.open(INSTAGRAM_URL, "_blank", "noopener,noreferrer")}
              style={{ aspectRatio: "1/1", overflow: "hidden", cursor: "pointer", position: "relative" }}>
              <img src={src} alt={`${business.name} trabajo ${i + 1}`} loading="lazy"
                style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform .4s" }}
                onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.06)")}
                onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")} />
              <div style={{ position: "absolute", inset: 0, background: "rgba(42,26,32,0)", transition: "background .3s" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(42,26,32,0.2)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(42,26,32,0)"; }} />
            </div>
          ))}
        </div>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div onClick={() => setLightbox(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center", cursor: "zoom-out" }}>
          <img src={lightbox} alt="foto" style={{ maxWidth: "90vw", maxHeight: "90vh", objectFit: "contain" }} onClick={e => e.stopPropagation()} />
          <button onClick={() => setLightbox(null)}
            style={{ position: "absolute", top: 24, right: 24, background: "rgba(255,255,255,0.1)", border: "none", color: "#fff", width: 40, height: 40, borderRadius: "50%", cursor: "pointer", fontSize: 20, display: "flex", alignItems: "center", justifyContent: "center" }}>
            ×
          </button>
        </div>
      )}

      {/* CTA */}
      <section style={{ padding: "40px 2rem 80px", textAlign: "center", background: "#fbe6ef" }}>
        <p style={{ fontFamily: ffB, fontSize: 16, fontStyle: "italic", color: "#9a7080", marginBottom: 20 }}>¿Te gustó lo que ves?</p>
        <a href="/servicios" style={{ display: "inline-block", padding: "14px 36px", background: PINK, color: "#2a1a20", fontFamily: "'Cinzel', serif", fontSize: 10, letterSpacing: "3px", textDecoration: "none", transition: "background .2s" }}
          onMouseEnter={e => (e.currentTarget.style.background = "#e87fac")}
          onMouseLeave={e => (e.currentTarget.style.background = PINK)}>
          VER SERVICIOS
        </a>
      </section>

      <Footer />
    </div>
  );
}
