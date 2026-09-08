import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { business } from "@/config/business.config";

const HAIR_GALLERY = [
  "/klassy/hair-highlights-waves.jpg",
  "/klassy/hair-keratin-product.jpg",
  "/klassy/hair-dark-long-klassy.jpg",
  "/klassy/hair-caramel-curls.jpg",
  "/klassy/hair-dark-long-salon.jpg",
  "/klassy/hair-black-long-mirror.jpg",
  "/klassy/hair-brown-straight.jpg",
  "/klassy/hair-highlight-side.jpg",
  "/klassy/hair-dark-short-pink.jpg",
  "/klassy/hair-dark-long-marble.jpg",
];
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { Booking } from "@/components/site/Booking";
import { PhotoCarousel } from "@/components/site/PhotoCarousel";
import { useServices, type DbService } from "@/hooks/useServices";
import { groupBySubgroup } from "@/lib/serviceGrouping";

export const Route = createFileRoute("/servicios/cabello")({
  head: () => ({
    meta: [
      { title: `Cabello en ${business.legalCity} | ${business.name} — Balayage, FIOS, Keratina` },
      { name: "description", content: "Cabello profesional en Carolina, PR. Balayage, FIOS, Keratina, color, cortes y peinados. Desde $8. Frente a Plaza Carolina." },
      { name: "keywords", content: "balayage carolina puerto rico, keratina carolina pr, FIOS carolina pr, hair salon carolina pr" },
      { property: "og:image", content: "/klassy/inspo-3.jpg" },
    ],
  }),
  component: CabelloPage,
});

// Visual sub-grouping only (not stored in the DB) — keeps the page organized
// by section while prices/descriptions always come live from the services table.
const SUBGROUP_ORDER = ["Lavado & Peinado", "Cortes", "Color & Mechas", "Tratamientos Premium", "Depilación", "Otros"];
const SUBGROUP_BY_NAME: Record<string, string> = {
  "Lavado, Secado y Planchado": "Lavado & Peinado",
  "Lavado, Secado y Ondas": "Lavado & Peinado",
  "Peinados": "Lavado & Peinado",
  "Corte de Puntas": "Cortes",
  "Corte con Estilo": "Cortes",
  "Corte de Pollina": "Cortes",
  "Full Color": "Color & Mechas",
  "Retoque de Color": "Color & Mechas",
  "Highlights Parcial": "Color & Mechas",
  "Highlights Full": "Color & Mechas",
  "Balayage": "Color & Mechas",
  "Toner": "Color & Mechas",
  "Remoción de Color": "Color & Mechas",
  "Cirugía Plástica FIOS": "Tratamientos Premium",
  "Shot FIOS": "Tratamientos Premium",
  "Keratina": "Tratamientos Premium",
  "Shot Keratina": "Tratamientos Premium",
  "Botox Capilar": "Tratamientos Premium",
  "Mascarilla Hidratante": "Tratamientos Premium",
  "Ampolla Reconstructora": "Tratamientos Premium",
  "Depilación de Cejas": "Depilación",
  "Depilación de Bozo": "Depilación",
};

function groupCabelloServices(services: DbService[]) {
  // Legacy services never got an explicit subgroup assigned in the admin
  // form — fall back to the name-based map so they keep their section.
  // Anything with an explicit subgroup (including a brand-new one an admin
  // just typed in) wins over the legacy name map.
  const withFallback = services.map(s => ({ ...s, subgroup: s.subgroup || SUBGROUP_BY_NAME[s.name] }));
  return groupBySubgroup(withFallback, SUBGROUP_ORDER) ?? [];
}

function ServiceItem({ s, onBook }: { s: DbService; onBook: (svcName: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: "0.5px solid #f0d8e4" }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1.1rem 1.25rem", background: "transparent", border: "1px solid #f2c5d8", cursor: "pointer", marginBottom: open ? 0 : "0.75rem", gap: "1rem", transition: "background .15s" }}
        onMouseEnter={e => (e.currentTarget.style.background = "#fdf0f5")}
        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
      >
        <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(16px,2.5vw,20px)", fontWeight: 400, color: "#2a1a20", textAlign: "left" }}>{s.name}</span>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexShrink: 0 }}>
          <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, color: "#e87fac" }}>{s.price}</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#e87fac" strokeWidth="2" style={{ transition: "transform .2s", transform: open ? "rotate(180deg)" : "none", flexShrink: 0 }}><path d="M6 9l6 6 6-6"/></svg>
        </div>
      </button>
      {open && (
        <div style={{ padding: "0.75rem 1.25rem 1.25rem", background: "#fdf0f5", marginBottom: "0.75rem" }}>
          <p style={{ fontSize: 10, letterSpacing: "2px", color: "#b09090", fontFamily: "'Montserrat', sans-serif", marginBottom: "0.5rem" }}>{s.duration}</p>
          <p style={{ fontSize: 12, color: "#8a7080", fontFamily: "'Montserrat', sans-serif", lineHeight: 1.9, marginBottom: "1rem" }}>{s.description}</p>
          <button
            onClick={() => onBook(s.name)}
            style={{ display: "inline-block", padding: "10px 22px", background: "#e87fac", color: "#fff", fontSize: 10, letterSpacing: "3px", fontFamily: "'Montserrat', sans-serif", fontWeight: 500, border: "none", cursor: "pointer", transition: "background .2s" }}
            onMouseEnter={e => (e.currentTarget.style.background = "#c4527e")}
            onMouseLeave={e => (e.currentTarget.style.background = "#e87fac")}
          >AGENDAR ESTE SERVICIO →</button>
        </div>
      )}
    </div>
  );
}

function CabelloPage() {
  const [preselected, setPreselected] = useState<{ categoryId: string; serviceName: string } | null>(null);
  const { groups: dbGroups } = useServices();
  const groups = groupCabelloServices(dbGroups.find(g => g.id === "cabello")?.services ?? []);

  function handleBook(svcName: string) {
    setPreselected({ categoryId: "cabello", serviceName: svcName });
    setTimeout(() => document.getElementById("agendar")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }

  return (
    <div style={{ background: "#fff", color: "#2a1a20" }}>
      <Navbar />
      <main style={{ paddingTop: "80px" }}>
        <section className="relative flex items-end" style={{ minHeight: "clamp(260px,40vw,400px)", background: "#1a0f14", overflow: "hidden" }}>
          <img src="/klassy/hair-cabello.jpg" alt={`Cabello ${business.name}`} className="absolute inset-0 w-full h-full object-cover" style={{ opacity: 0.5 }} />
          <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(26,15,20,0.9) 0%, rgba(26,15,20,0.2) 100%)" }} />
          <div className="relative z-10 px-6 sm:px-10 pb-10 max-w-3xl">
            <a href="/" style={{ fontSize: 10, letterSpacing: "2px", color: "#c9a96e", fontFamily: "'Montserrat', sans-serif", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "0.3rem", marginBottom: "1rem" }}>← INICIO</a>
            <p style={{ fontSize: 9, letterSpacing: "5px", color: "#c9a96e", fontWeight: 600, fontFamily: "'Montserrat', sans-serif", marginBottom: "0.5rem" }}>KLASSY SALON · CAROLINA, PR</p>
            <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(34px,6vw,54px)", fontWeight: 300, color: "#fff", lineHeight: 1.1, marginBottom: "0.5rem" }}>Cabello</h1>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.65)", fontFamily: "'Montserrat', sans-serif" }}>Balayage · FIOS · Keratina · Color · Cortes · Peinados</p>
          </div>
        </section>

        <section className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
          <p style={{ fontSize: 11, color: "#b09090", fontFamily: "'Montserrat', sans-serif", letterSpacing: "1px", marginBottom: "2rem" }}>Toca un servicio para ver la descripción y agendar tu cita.</p>
          {groups.map(group => (
            <div key={group.label} className="mb-10">
              <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1rem" }}>
                <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(18px,3vw,24px)", fontWeight: 300, color: "#2a1a20", whiteSpace: "nowrap" }}>{group.label}</h2>
                <div style={{ flex: 1, height: "0.5px", background: "#f0d8e4" }} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {group.services.map(s => <ServiceItem key={s.name} s={s} onBook={handleBook} />)}
              </div>
            </div>
          ))}
        </section>

        {/* Hair gallery */}
        <section style={{ background: "#feeff2", padding: "4rem 1.5rem" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto" }}>
            <p style={{ fontFamily: "'Cinzel', serif", fontSize: 9, letterSpacing: "5px", color: "#d9b850", textTransform: "uppercase", marginBottom: "0.75rem", textAlign: "center" }}>Nuestros trabajos</p>
            <h2 style={{ fontFamily: "'Cinzel Decorative', serif", fontSize: "clamp(20px,3vw,32px)", fontWeight: 400, color: "#2a1a20", textAlign: "center", marginBottom: "2.5rem" }}>
              Resultados que transforman
            </h2>
            <PhotoCarousel images={HAIR_GALLERY} alt={`Cabello ${business.name}`} />
          </div>
        </section>

        <Booking preselected={preselected} onConsumePreselected={() => setPreselected(null)} />
      </main>
      <Footer />
    </div>
  );
}
