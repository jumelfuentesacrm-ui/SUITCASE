import { useState } from "react";
import { SERVICE_CATEGORIES } from "./data";

const ROSE  = "#9c3b52";
const GOLD  = "#c9a13b";
const INK   = "#1b1410";
const PAPER = "#f7f0e6";
const MUTED = "rgba(27,20,16,.58)";

export function ServiceMenu() {
  const [open, setOpen] = useState<string | null>("pestanas");

  return (
    <section id="menu" style={{ background: INK, padding: "108px 0" }}>
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "0 28px" }}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 10, fontFamily: "'JetBrains Mono', monospace", fontSize: ".74rem", letterSpacing: ".18em", textTransform: "uppercase" as const, color: GOLD, marginBottom: 18 }}>
            <svg viewBox="0 0 40 16" width={34} height={14}>
              <path d="M2 12 C12 -2, 28 -2, 38 12" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round"/>
            </svg>
            Menú & Precios
          </span>
          <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: "clamp(2rem,4vw,3rem)", color: PAPER, margin: 0, fontWeight: 600, lineHeight: 1.05 }}>
            Todo lo que <em style={{ fontStyle: "italic", color: GOLD }}>ofrecemos</em>
          </h2>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {SERVICE_CATEGORIES.map(cat => (
            <div key={cat.id} id={`menu-${cat.id}`} style={{ border: `1px solid rgba(247,240,230,.12)`, borderRadius: 14, overflow: "hidden" }}>
              <button
                onClick={() => setOpen(open === cat.id ? null : cat.id)}
                style={{ width: "100%", padding: "22px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", background: open === cat.id ? "rgba(247,240,230,.06)" : "transparent", border: "none", cursor: "pointer", textAlign: "left" as const }}>
                <span style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <span style={{ fontSize: "1.3rem" }}>{cat.icon}</span>
                  <span style={{ fontFamily: "'Fraunces', serif", fontSize: "1.2rem", color: PAPER, fontWeight: 600 }}>{cat.title}</span>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: ".75rem", color: MUTED }}>
                    {cat.services.length} servicios
                  </span>
                </span>
                <span style={{ color: GOLD, fontSize: "1.2rem", transition: "transform .25s", transform: open === cat.id ? "rotate(180deg)" : "none", display: "inline-block" }}>
                  ↓
                </span>
              </button>

              {open === cat.id && (
                <div style={{ padding: "0 28px 24px" }}>
                  <div style={{ borderTop: "1px solid rgba(247,240,230,.08)", paddingTop: 16, display: "flex", flexDirection: "column", gap: 0 }}>
                    {cat.services.map((s, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, padding: "14px 0", borderBottom: i < cat.services.length - 1 ? "1px solid rgba(247,240,230,.06)" : "none" }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontFamily: "'Sora', sans-serif", fontSize: ".97rem", color: PAPER, fontWeight: 500 }}>{s.name}</div>
                          {s.description && <div style={{ fontFamily: "'Sora', sans-serif", fontSize: ".83rem", color: MUTED, marginTop: 4, lineHeight: 1.5 }}>{s.description}</div>}
                          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: ".76rem", color: GOLD, marginTop: 5, opacity: .7 }}>{s.duration}</div>
                        </div>
                        <div style={{ fontFamily: "'Fraunces', serif", fontSize: "1.1rem", color: GOLD, fontWeight: 600, whiteSpace: "nowrap" as const, paddingTop: 2 }}>{s.price}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <p style={{ fontFamily: "'Sora', sans-serif", fontSize: ".86rem", color: "rgba(247,240,230,.38)", textAlign: "center", marginTop: 28 }}>
          * Los precios pueden variar según largo y cantidad de pestañas naturales. Se requiere depósito para citas de $100+.
        </p>
      </div>
    </section>
  );
}
