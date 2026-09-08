import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { INSTAGRAM_URL, PHONE } from "./data";
import { business } from "@/config/business.config";

type DayHours = { day: number; open: string; close: string; closed: boolean };

const DAY_NAMES = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

// Falls back to these if salon_settings.hours hasn't been set yet in the DB.
const DEFAULT_HOURS: DayHours[] = [
  { day: 0, open: "8:00 AM", close: "5:30 PM", closed: true },
  { day: 1, open: "8:00 AM", close: "5:30 PM", closed: true },
  { day: 2, open: "8:00 AM", close: "5:30 PM", closed: false },
  { day: 3, open: "8:00 AM", close: "5:30 PM", closed: false },
  { day: 4, open: "8:00 AM", close: "5:30 PM", closed: false },
  { day: 5, open: "8:00 AM", close: "5:30 PM", closed: false },
  { day: 6, open: "8:00 AM", close: "4:30 PM", closed: false },
];

function groupHours(hours: DayHours[]): { label: string; value: string }[] {
  const byDay = [...hours].sort((a, b) => a.day - b.day);
  const rows: { label: string; value: string }[] = [];
  let i = 0;
  while (i < byDay.length) {
    const start = byDay[i];
    let j = i;
    while (j + 1 < byDay.length && byDay[j + 1].closed === start.closed && byDay[j + 1].open === start.open && byDay[j + 1].close === start.close) j++;
    const label = j > i + 1 ? `${DAY_NAMES[start.day]} – ${DAY_NAMES[byDay[j].day]}` : j === i + 1 ? `${DAY_NAMES[start.day]} y ${DAY_NAMES[byDay[j].day]}` : DAY_NAMES[start.day];
    rows.push({ label, value: start.closed ? "Cerrado" : `${start.open} – ${start.close}` });
    i = j + 1;
  }
  return rows;
}

export function Contact() {
  const [hours, setHours] = useState<DayHours[]>(DEFAULT_HOURS);

  useEffect(() => {
    supabase.from("salon_settings").select("hours").limit(1).maybeSingle().then(({ data }) => {
      if (data?.hours && Array.isArray(data.hours) && data.hours.length === 7) setHours(data.hours);
    });
  }, []);

  const rows = groupHours(hours);

  return (
    <section id="contacto" className="grid grid-cols-1 lg:grid-cols-2" style={{ borderTop: "0.5px solid rgba(255,168,198,0.2)" }}>
      {/* Hours */}
      <div className="px-6 py-10 lg:px-10 lg:py-14" style={{ background: "#fff", borderBottom: "0.5px solid rgba(255,168,198,0.15)" }}>
        <h3 style={{ fontFamily: "'Cinzel Decorative', serif", fontSize: "clamp(28px,3.5vw,38px)", fontWeight: 400, color: "#2a1a20", marginBottom: "1.5rem", letterSpacing: "0.04em" }}>Horario</h3>
        {rows.map(r => (
          <div key={r.label} className="flex justify-between py-3" style={{ fontSize: 11, borderBottom: "0.5px solid #f8eff3", color: "#9a7080", fontFamily: "'Montserrat', sans-serif" }}>
            <span>{r.label}</span>
            <strong style={{ color: "#2a1a20", fontWeight: 500 }}>{r.value}</strong>
          </div>
        ))}
        <div className="inline-flex items-center gap-2 mt-5" style={{ fontSize: 9, letterSpacing: "2px", color: "#73815e", background: "#eef3ea", padding: "6px 14px", fontFamily: "'Cinzel', serif", textTransform: "uppercase" }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="20 6 9 17 4 12"/></svg>
          Walk-ins welcome
        </div>
      </div>

      {/* Contact */}
      <div className="px-6 py-10 lg:px-10 lg:py-14" style={{ background: "#feeff2", borderBottom: "0.5px solid rgba(255,168,198,0.15)" }}>
        <h3 style={{ fontFamily: "'Cinzel Decorative', serif", fontSize: "clamp(28px,3.5vw,38px)", fontWeight: 400, color: "#2a1a20", marginBottom: "1.5rem", letterSpacing: "0.04em" }}>Encuéntranos</h3>

        {[
          { href: `tel:${PHONE}`, icon: "M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.9 19.79 19.79 0 01.1 1.28 2 2 0 012.06.1h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z", label: business.phoneDisplay, external: false },
          { href: `https://wa.me/${business.whatsapp}`, icon: "M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z", label: "WhatsApp", external: true },
          { href: INSTAGRAM_URL, icon: "M3 3h18v18H3zM12 8a4 4 0 100 8 4 4 0 000-8zM17.5 6.5h.01", label: business.instagramUrl.replace(/^https?:\/\/(www\.)?instagram\.com\//, "@").replace(/\/$/, ""), external: true },
        ].map(item => (
          <a
            key={item.label}
            href={item.href}
            target={item.external ? "_blank" : undefined}
            rel={item.external ? "noreferrer" : undefined}
            className="flex items-center gap-3 py-3 transition-colors"
            style={{ fontSize: 12, color: "#9a7080", borderBottom: "0.5px solid rgba(255,168,198,0.15)", textDecoration: "none", fontFamily: "'Montserrat', sans-serif" }}
            onMouseEnter={e => (e.currentTarget.style.color = "#ffa8c6")}
            onMouseLeave={e => (e.currentTarget.style.color = "#9a7080")}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffa8c6" strokeWidth="1.5" style={{ flexShrink: 0 }}>
              <path d={item.icon}/>
            </svg>
            {item.label}
          </a>
        ))}

        <div className="flex flex-wrap gap-2 mt-6">
          {[
            { label: "Instagram", href: INSTAGRAM_URL },
            { label: "WhatsApp",  href: `https://wa.me/1${PHONE}` },
          ].map(b => (
            <a
              key={b.label}
              href={b.href}
              target="_blank"
              rel="noreferrer"
              style={{ padding: "7px 16px", border: "1px solid rgba(255,168,198,0.4)", color: "#ffa8c6", fontSize: 9, letterSpacing: "2px", fontFamily: "'Cinzel', serif", background: "transparent", textDecoration: "none", transition: "all .2s", textTransform: "uppercase" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#ffa8c6"; (e.currentTarget as HTMLElement).style.color = "#fff"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "#ffa8c6"; }}
            >
              {b.label}
            </a>
          ))}
        </div>

        <div style={{ marginTop: "1.5rem", fontSize: 11, color: "#b09090", fontFamily: "'Montserrat', sans-serif", lineHeight: 1.9 }}>
          3KS-5 Cll Via Mirta local #1<br />
          Carolina, 00983, Puerto Rico<br />
          <span style={{ color: "#ffa8c6" }}>Frente a Plaza Carolina</span>
        </div>
      </div>
    </section>
  );
}
