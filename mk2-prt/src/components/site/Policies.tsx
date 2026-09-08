import { useState } from "react";

const policies = [
  {
    title: "Depósito requerido",
    body: "Para reservar tu cita se requiere un depósito de $15 por servicio, aplicable al total de tu servicio. El depósito no es reembolsable ni transferible si cancelas con menos de 24 horas de anticipación o no asistes a tu cita.",
  },
  {
    title: "Cancelaciones y reagendamientos",
    body: "Para reagendar tu cita debes avisarnos con al menos 24 horas de anticipación. Cancelaciones con menos de 24 horas resultan en la pérdida del depósito.",
  },
  {
    title: "Puntualidad",
    body: "Llegadas de más de 10 minutos tarde pueden resultar en ajustes al servicio o cancelación de la cita. Te pedimos llegar a tiempo para garantizar la mejor experiencia.",
  },
  {
    title: "Métodos de pago",
    body: "Aceptamos ATH Móvil, débito, Visa y Mastercard. El depósito de $15 por servicio es requerido al momento de reservar.",
  },
  {
    title: "Ambiente y admisión",
    body: "Nos reservamos el derecho de admisión para garantizar un ambiente cómodo y respetuoso para todas nuestras clientas y personal.",
  },
];

export function Policies() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section id="politicas" style={{ padding: "4rem 2.5rem", background: "#f7f5f3", borderTop: "0.5px solid #f0d8e4" }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <div style={{ marginBottom: "2.5rem" }}>
          <span style={{ fontSize: 9, letterSpacing: "5px", color: "#c9a96e", fontWeight: 600, display: "block", marginBottom: "0.75rem", fontFamily: "'Montserrat', sans-serif" }}>
            POLÍTICAS
          </span>
          <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 34, fontWeight: 300, color: "#2a1a20" }}>
            Lo que necesitas saber
          </h2>
        </div>

        <div style={{ borderTop: "0.5px solid #f0d8e4" }}>
          {policies.map((p, i) => (
            <div key={i} style={{ borderBottom: "0.5px solid #f0d8e4" }}>
              <button
                onClick={() => setOpen(open === i ? null : i)}
                style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1.25rem 0", textAlign: "left", gap: 16, background: "none", border: "none", cursor: "pointer" }}
              >
                <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, fontWeight: 400, color: "#2a1a20" }}>{p.title}</span>
                <svg
                  width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a07080" strokeWidth="1.5"
                  style={{ flexShrink: 0, transition: "transform .2s", transform: open === i ? "rotate(180deg)" : "none" }}
                >
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>
              {open === i && (
                <p style={{ paddingBottom: "1.25rem", fontSize: 13, color: "#8a7080", lineHeight: 1.9, marginTop: -4, fontFamily: "'Montserrat', sans-serif" }}>
                  {p.body}
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Payment badges */}
        <div style={{ marginTop: "2rem", display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          {["ATH Móvil", "Débito", "Visa", "Mastercard"].map(m => (
            <span key={m} style={{ fontSize: 10, letterSpacing: "2px", padding: "6px 14px", border: "1px solid #f2c5d8", color: "#e87fac", fontFamily: "'Montserrat', sans-serif", fontWeight: 500 }}>
              {m.toUpperCase()}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
