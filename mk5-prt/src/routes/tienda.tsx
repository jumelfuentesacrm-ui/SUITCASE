import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { PHONE } from "@/components/site/data";
import { business } from "@/config/business.config";

export const Route = createFileRoute("/tienda")({
  head: () => ({
    meta: [
      { title: `Tienda | ${business.name}` },
      { name: "description", content: `Gift cards, productos de belleza y paquetes de ${business.name}. ${business.legalCity}.` },
    ],
  }),
  component: TiendaPage,
});

const PINK  = "#e87fac";
const DPINK = "#c4527e";
const GOLD  = "#c9a96e";
const ff    = "'Montserrat', sans-serif";
const ffS   = "'Cormorant Garamond', serif";

const GIFT_CARDS = [
  { amount: "$25",  desc: "Un detalle pequeño con gran impacto" },
  { amount: "$50",  desc: "El más popular — perfecto para regalar" },
  { amount: "$75",  desc: "Para disfrutar varios servicios" },
  { amount: "$100", desc: `Una experiencia completa en ${business.shortName}` },
  { amount: "$150", desc: "Día de belleza total" },
  { amount: "$200", desc: "El regalo definitivo de pamper day" },
];

const PACKAGES = [
  {
    name: `${business.shortName} Duo`,
    desc: "Manicura Color Gel + Pedicura Sencilla Color Gel. El combo perfecto para lucir de pies a manos.",
    price: "Desde $85",
    savings: "Ahorras $10",
    badge: "Popular",
  },
  {
    name: "Pamper Day",
    desc: "Manicura + Pedicura + Servicio de cabello a elegir. Un día completo dedicado a ti.",
    price: "Desde $120",
    savings: "Ahorras $15",
    badge: "Experiencia completa",
  },
  {
    name: `${business.shortName} Primera Visita`,
    desc: "Para clientas nuevas: Manicura Color Gel + consulta personalizada de estilo.",
    price: "Desde $30",
    savings: "10% descuento",
    badge: "Bienvenida",
  },
  {
    name: "Bridal Package",
    desc: "Manicura + Pedicura + Cabello para eventos especiales. Coordinación personalizada.",
    price: "Consultar",
    savings: "Paquete personalizado",
    badge: "Bodas & Eventos",
  },
];

const PRODUCTS = [
  { name: `Cuticle Oil ${business.shortName}`, desc: "Aceite nutritivo para cutículas con vitamina E. Aplicación diaria para uñas saludables.", price: "$12", category: "Cuidado de uñas" },
  { name: "Kit Manicura en Casa", desc: "Lima, buffer, aceite de cutícula y crema de manos. Todo lo que necesitas.", price: "$28", category: "Kits" },
  { name: "Hand & Nail Cream", desc: "Crema hidratante de larga duración con colágeno y manteca de karité.", price: "$18", category: "Hidratación" },
  { name: "Nail Strengthener", desc: "Fortalecedor de uñas para uñas frágiles o dañadas. Base + tratamiento.", price: "$15", category: "Tratamiento" },
  { name: "Gel Base & Top Coat", desc: "Base y top coat profesional para manicuras en casa de larga duración.", price: "$22", category: "Esmaltes" },
  { name: "Shampoo Reparador", desc: "Shampoo profesional con proteínas de seda para cabello dañado.", price: "$24", category: "Cabello" },
];

type Tab = "gift" | "packages" | "products";

function TiendaPage() {
  const [tab, setTab] = useState<Tab>("gift");

  function waLink(msg: string) {
    return "https://wa.me/1" + PHONE + "?text=" + encodeURIComponent(msg);
  }

  return (
    <div style={{ background: "#fff", color: "#2a1a20" }}>
      <Navbar />

      {/* Header */}
      <section style={{ paddingTop: 140, paddingBottom: 60, background: "linear-gradient(160deg, #fdf0f5 0%, #fff 60%)" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 2rem", textAlign: "center" }}>
          <p style={{ fontFamily: ff, fontSize: 10, letterSpacing: "4px", color: PINK, marginBottom: 16, textTransform: "uppercase" }}>Tienda</p>
          <h1 style={{ fontFamily: ffS, fontSize: "clamp(40px,6vw,64px)", fontWeight: 300, color: "#2a1a20", margin: "0 0 20px", lineHeight: 1.1 }}>
            Gift Cards & Productos
          </h1>
          <p style={{ fontFamily: ff, fontSize: 13, lineHeight: 1.9, color: "#7a6070", maxWidth: 480, margin: "0 auto" }}>
            {`Regala una experiencia ${business.shortName} o lleva el cuidado profesional a tu casa.`}
          </p>
        </div>
      </section>

      {/* Tabs */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 2rem 0" }}>
        <div style={{ display: "flex", gap: 0, borderBottom: "1px solid #f0d8e4", marginBottom: 48 }}>
          {([["gift","Gift Cards"],["packages","Paquetes"],["products","Productos"]] as [Tab,string][]).map(([t, label]) => (
            <button key={t} onClick={() => setTab(t)}
              style={{ padding: "12px 28px", background: "none", border: "none", cursor: "pointer", fontFamily: ff, fontSize: 11, letterSpacing: "2px", fontWeight: 500, color: tab === t ? PINK : "#9a7080", textTransform: "uppercase", borderBottom: tab === t ? "2px solid " + PINK : "2px solid transparent", transition: "color .2s" }}>
              {label}
            </button>
          ))}
        </div>

        {/* Gift Cards */}
        {tab === "gift" && (
          <div style={{ paddingBottom: 80 }}>
            <div style={{ marginBottom: 32 }}>
              <h2 style={{ fontFamily: ffS, fontSize: 32, fontWeight: 300, color: "#2a1a20", marginBottom: 8 }}>Gift Cards</h2>
              <p style={{ fontFamily: ff, fontSize: 12, color: "#9a7080", lineHeight: 1.8 }}>Válidas por 12 meses · Se coordinan por WhatsApp · Disponibles para recoger en el salón</p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16 }}>
              {GIFT_CARDS.map(gc => (
                <a key={gc.amount} href={waLink("Hola, me interesa una gift card de " + gc.amount + ` de ${business.name}.`)} target="_blank" rel="noreferrer"
                  style={{ display: "flex", flexDirection: "column", padding: "28px 24px", border: "1px solid #f0d8e4", background: "#fff", textDecoration: "none", transition: "border-color .2s, box-shadow .2s" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = PINK; (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 20px rgba(232,127,172,0.12)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "#f0d8e4"; (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}>
                  <span style={{ fontFamily: ffS, fontSize: 42, color: GOLD, fontWeight: 300, display: "block", marginBottom: 8 }}>{gc.amount}</span>
                  <p style={{ fontFamily: ff, fontSize: 12, color: "#9a7080", flex: 1, marginBottom: 20, lineHeight: 1.7 }}>{gc.desc}</p>
                  <span style={{ fontFamily: ff, fontSize: 10, letterSpacing: "2px", color: PINK, fontWeight: 600, textTransform: "uppercase" }}>Solicitar por WhatsApp →</span>
                </a>
              ))}
            </div>
            <div style={{ marginTop: 24, padding: "16px 20px", background: "#fdf0f5", border: "1px solid #f0d8e4", fontFamily: ff, fontSize: 12, color: "#9a7080", lineHeight: 1.8 }}>
              💡 <strong>¿Quieres un monto diferente?</strong> Escríbenos por WhatsApp y te lo preparamos al instante.
            </div>
          </div>
        )}

        {/* Packages */}
        {tab === "packages" && (
          <div style={{ paddingBottom: 80 }}>
            <div style={{ marginBottom: 32 }}>
              <h2 style={{ fontFamily: ffS, fontSize: 32, fontWeight: 300, color: "#2a1a20", marginBottom: 8 }}>Paquetes</h2>
              <p style={{ fontFamily: ff, fontSize: 12, color: "#9a7080", lineHeight: 1.8 }}>Combina servicios y ahorra. Sujeto a disponibilidad.</p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20 }}>
              {PACKAGES.map(p => (
                <div key={p.name} style={{ border: "1px solid #f0d8e4", padding: "28px 24px", background: "#fff", display: "flex", flexDirection: "column" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
                    <span style={{ fontFamily: ff, fontSize: 9, letterSpacing: "2px", color: "#fff", background: PINK, padding: "4px 10px", textTransform: "uppercase", fontWeight: 600 }}>{p.badge}</span>
                    <span style={{ fontFamily: ffS, fontSize: 22, color: GOLD, fontWeight: 400 }}>{p.price}</span>
                  </div>
                  <h3 style={{ fontFamily: ffS, fontSize: 26, color: "#2a1a20", fontWeight: 300, marginBottom: 10 }}>{p.name}</h3>
                  <p style={{ fontFamily: ff, fontSize: 12, color: "#9a7080", lineHeight: 1.8, flex: 1, marginBottom: 16 }}>{p.desc}</p>
                  <p style={{ fontFamily: ff, fontSize: 10, color: GOLD, letterSpacing: "1px", fontWeight: 600, marginBottom: 20 }}>✦ {p.savings}</p>
                  <a href={waLink("Hola, me interesa el paquete \"" + p.name + `" de ${business.name}. ¿Cuál es la disponibilidad?`)} target="_blank" rel="noreferrer"
                    style={{ display: "block", textAlign: "center", padding: "11px 0", background: PINK, color: "#fff", fontFamily: ff, fontSize: 10, letterSpacing: "2px", textDecoration: "none", transition: "background .2s", fontWeight: 500 }}
                    onMouseEnter={e => (e.currentTarget.style.background = DPINK)}
                    onMouseLeave={e => (e.currentTarget.style.background = PINK)}>
                    CONSULTAR POR WHATSAPP
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Products */}
        {tab === "products" && (
          <div style={{ paddingBottom: 80 }}>
            <div style={{ marginBottom: 32 }}>
              <h2 style={{ fontFamily: ffS, fontSize: 32, fontWeight: 300, color: "#2a1a20", marginBottom: 8 }}>Productos</h2>
              <p style={{ fontFamily: ff, fontSize: 12, color: "#9a7080", lineHeight: 1.8 }}>Productos profesionales disponibles en el salón. Consulta disponibilidad antes de visitar.</p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 20 }}>
              {PRODUCTS.map(p => (
                <div key={p.name} style={{ border: "1px solid #f0d8e4", padding: "24px", background: "#fff", display: "flex", flexDirection: "column" }}>
                  <p style={{ fontFamily: ff, fontSize: 9, letterSpacing: "2px", color: GOLD, textTransform: "uppercase", fontWeight: 600, marginBottom: 10 }}>{p.category}</p>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                    <h3 style={{ fontFamily: ffS, fontSize: 22, color: "#2a1a20", fontWeight: 300, flex: 1, marginRight: 12 }}>{p.name}</h3>
                    <span style={{ fontFamily: ffS, fontSize: 20, color: PINK, fontWeight: 400, flexShrink: 0 }}>{p.price}</span>
                  </div>
                  <p style={{ fontFamily: ff, fontSize: 12, color: "#9a7080", lineHeight: 1.8, flex: 1, marginBottom: 20 }}>{p.desc}</p>
                  <a href={waLink("Hola, ¿tienen disponible \"" + p.name + "\" (" + p.price + `) en ${business.name}?`)} target="_blank" rel="noreferrer"
                    style={{ display: "block", textAlign: "center", padding: "10px 0", border: "1px solid " + PINK, color: PINK, fontFamily: ff, fontSize: 10, letterSpacing: "2px", textDecoration: "none", transition: "background .2s, color .2s", fontWeight: 500 }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = PINK; (e.currentTarget as HTMLElement).style.color = "#fff"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = PINK; }}>
                    PREGUNTAR DISPONIBILIDAD
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
