import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { supabase } from "@/lib/supabase";
import { business } from "@/config/business.config";

export const Route = createFileRoute("/nosotras")({
  head: () => ({
    meta: [
      { title: `Nosotras | ${business.name} — Equipo de Técnicas en ${business.legalCity}` },
      { name: "description", content: `Conoce el equipo de ${business.name} en ${business.legalCity}. Técnicas especializadas en uñas, cabello y estética. Más de 5 años mimando a nuestras clientas.` },
      { name: "keywords", content: "salon equipo, tecnicas unas, salon belleza nosotras" },
      { property: "og:title", content: `Nosotras | ${business.name}` },
      { property: "og:description", content: `El equipo detrás de ${business.name} en ${business.legalCity}.` },
      { property: "og:image", content: "/brand/nosotras-hero.jpg" },
    ],
  }),
  component: NosotrasPage,
});

type Specialist = { id: string; full_name: string; avatar_url: string | null; bio: string | null; role_label: string | null };

const PINK = "#ffa8c6";
const ff   = "'Montserrat', sans-serif";
const ffS  = "'Cinzel Decorative', serif";
const ffB  = "'Cormorant Garamond', serif";

const HISTORIA_PARAS = [
  `${business.name} nació con una visión clara: crear un espacio donde la calidad del servicio fuera tan importante como la experiencia de cada clienta.`,
  "Ubicados en Carolina, Puerto Rico, reunimos a profesionales apasionadas por la belleza en un ambiente elegante, acogedor y cuidadosamente diseñado para que cada visita sea especial.",
  "Cada día trabajamos con el compromiso de ofrecer un servicio personalizado, mantener altos estándares de calidad y seguir construyendo un lugar donde nuestras clientas siempre quieran regresar.",
];

const EXPERIENCIA = [
  { title: "Atención personalizada",      desc: "Nos tomamos el tiempo para conocer tus necesidades y ayudarte a elegir el servicio ideal para ti." },
  { title: "Profesionales apasionadas",   desc: "Nuestro equipo está comprometido a brindar un servicio de calidad, cuidando cada detalle de tu experiencia." },
  { title: "Ambiente diseñado para ti",   desc: "Queremos que cada visita sea un momento para relajarte, desconectarte y disfrutar mientras realzamos tu belleza." },
  { title: "Calidad en cada servicio",    desc: "Trabajamos con productos profesionales y seguimos protocolos de higiene para ofrecer resultados seguros y duraderos." },
];

const VALUES = [
  { icon: "✦", title: "Calidad",                desc: "Trabajamos con productos profesionales y técnicas actualizadas para ofrecer resultados consistentes y duraderos." },
  { icon: "♡", title: "Atención personalizada", desc: "Cada clienta es diferente. Escuchamos tus necesidades para brindarte una experiencia adaptada a ti." },
  { icon: "◇", title: "Higiene",                desc: "Seguimos estrictos protocolos de limpieza y esterilización para ofrecer un servicio seguro y confiable." },
  { icon: "★", title: "Experiencia",            desc: "Más que un servicio de belleza, queremos que cada visita sea un momento para consentirte y sentirte bien." },
];

function NosotrasPage() {
  const [team, setTeam] = useState<Specialist[]>([]);

  useEffect(() => {
    supabase.from("profiles").select("id, full_name, avatar_url, bio, role_label").eq("role", "specialist").eq("active", true).order("full_name")
      .then(({ data }) => setTeam(data ?? []));
  }, []);

  return (
    <div style={{ background: "#feeff2", color: "#2a1a20", minHeight: "100vh" }}>
      <Navbar />

      {/* Hero */}
      <section style={{ position: "relative", minHeight: "clamp(280px,40vw,420px)", overflow: "hidden", display: "flex", alignItems: "flex-end" }}>
        <img src="/brand/nosotras-hero.jpg" alt={`${business.name} equipo`} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(42,26,32,0.82) 0%, rgba(42,26,32,0.1) 100%)" }} />
        <div style={{ position: "relative", zIndex: 10, width: "100%", paddingTop: 120 }}>
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 2rem 3rem", textAlign: "center" }}>
          <p style={{ fontFamily: "'Cinzel', serif", fontSize: 9, letterSpacing: "5px", color: "#d9b850", marginBottom: 16, textTransform: "uppercase" }}>{business.name} · Carolina PR</p>
          <h1 style={{ fontFamily: ffS, fontSize: "clamp(28px,5vw,56px)", fontWeight: 400, color: "#fff", margin: "0 0 24px", lineHeight: 1.2 }}>
            Nuestra Esencia
          </h1>
          <p style={{ fontFamily: ffB, fontSize: "clamp(15px,2vw,18px)", fontStyle: "italic", color: "rgba(255,255,255,0.80)", maxWidth: 560, margin: "0 auto", lineHeight: 1.8 }}>
            {`En ${business.name} creemos que cada visita debe sentirse especial. Nos enfocamos en ofrecer un servicio profesional, una atención personalizada y un ambiente donde puedas relajarte mientras realzamos tu belleza.`}
          </p>
        </div>
        </div>
      </section>

      {/* Historia */}
      <section style={{ padding: "80px 2rem", maxWidth: 900, margin: "0 auto" }}>
        <p style={{ fontFamily: "'Cinzel', serif", fontSize: 9, letterSpacing: "4px", color: "#d9b850", marginBottom: 12, textTransform: "uppercase" }}>Nuestra historia</p>
        <h2 style={{ fontFamily: ffS, fontSize: "clamp(22px,3.5vw,38px)", fontWeight: 400, color: "#2a1a20", marginBottom: 36 }}>Donde la belleza y el servicio se encuentran</h2>
        {HISTORIA_PARAS.map((p, i) => (
          <p key={i} style={{ fontFamily: ff, fontSize: 14, lineHeight: 1.95, color: "#7a6070", marginBottom: i < HISTORIA_PARAS.length - 1 ? 20 : 0, maxWidth: 720 }}>{p}</p>
        ))}
      </section>

      {/* ¿Qué puedes esperar de tu visita? */}
      <section style={{ padding: "60px 2rem 80px", background: "rgba(255,168,198,0.04)" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <p style={{ fontFamily: "'Cinzel', serif", fontSize: 9, letterSpacing: "4px", color: "#d9b850", marginBottom: 12, textTransform: "uppercase" }}>Tu experiencia</p>
          <h2 style={{ fontFamily: ffS, fontSize: "clamp(22px,3.5vw,38px)", fontWeight: 400, color: "#2a1a20", marginBottom: 48 }}>¿Qué puedes esperar de tu visita?</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 28 }}>
            {EXPERIENCIA.map(e => (
              <div key={e.title} style={{ borderLeft: `2px solid ${PINK}`, paddingLeft: 20 }}>
                <h3 style={{ fontFamily: ffS, fontSize: 15, color: "#2a1a20", fontWeight: 400, marginBottom: 10 }}>{e.title}</h3>
                <p style={{ fontFamily: ff, fontSize: 12, lineHeight: 1.9, color: "#7a6070" }}>{e.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Values */}
      <section style={{ padding: "80px 2rem", background: "rgba(255,168,198,0.06)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <p style={{ fontFamily: "'Cinzel', serif", fontSize: 9, letterSpacing: "4px", color: "#d9b850", marginBottom: 12, textTransform: "uppercase" }}>Lo que nos define</p>
          <h2 style={{ fontFamily: ffS, fontSize: "clamp(22px,3.5vw,38px)", fontWeight: 400, color: "#2a1a20", marginBottom: 48 }}>Nuestros valores</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 32 }}>
            {VALUES.map(v => (
              <div key={v.title}>
                <span style={{ fontFamily: ffB, fontSize: 28, color: PINK, display: "block", marginBottom: 12 }}>{v.icon}</span>
                <h3 style={{ fontFamily: ffS, fontSize: 16, color: "#2a1a20", marginBottom: 10, fontWeight: 400 }}>{v.title}</h3>
                <p style={{ fontFamily: ff, fontSize: 12, lineHeight: 1.9, color: "#7a6070" }}>{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section style={{ padding: "80px 2rem" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <p style={{ fontFamily: "'Cinzel', serif", fontSize: 9, letterSpacing: "4px", color: "#d9b850", marginBottom: 12, textTransform: "uppercase" }}>Nuestro equipo</p>
          <h2 style={{ fontFamily: ffS, fontSize: "clamp(22px,3.5vw,38px)", fontWeight: 400, color: "#2a1a20", marginBottom: 48 }}>Las personas detrás de {business.shortName}</h2>
          {team.length === 0 ? (
            <p style={{ fontFamily: ffB, fontSize: 16, fontStyle: "italic", color: "#b09090" }}>Equipo próximamente…</p>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 28 }}>
              {team.map(t => (
                <div key={t.id} style={{ textAlign: "center" }}>
                  <div style={{ width: 120, height: 120, borderRadius: "50%", margin: "0 auto 16px", overflow: "hidden", background: "#fbe6ef", border: "2px solid rgba(255,168,198,0.3)" }}>
                    {t.avatar_url ? (
                      <img src={t.avatar_url} alt={t.full_name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: ffS, fontSize: 32, color: PINK }}>
                        {(t.full_name || "?").split(" ").map(w => w[0]).slice(0, 2).join("")}
                      </div>
                    )}
                  </div>
                  <h3 style={{ fontFamily: ffS, fontSize: 16, color: "#2a1a20", fontWeight: 400, marginBottom: 4 }}>{t.full_name}</h3>
                  <p style={{ fontFamily: "'Cinzel', serif", fontSize: 8, letterSpacing: "3px", color: PINK, marginBottom: 10, textTransform: "uppercase" }}>{t.role_label || "Técnica especialista"}</p>
                  {t.bio && <p style={{ fontFamily: ff, fontSize: 12, lineHeight: 1.8, color: "#7a6070", maxWidth: 200, margin: "0 auto" }}>{t.bio}</p>}
                  <a href={`/servicios?tech=${t.id}`} style={{ display: "inline-block", marginTop: 14, padding: "9px 20px", background: "transparent", border: `1px solid ${PINK}`, color: PINK, fontFamily: "'Cinzel', serif", fontSize: 9, letterSpacing: "2px", textDecoration: "none", transition: "background .2s, color .2s", textTransform: "uppercase" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = PINK; (e.currentTarget as HTMLElement).style.color = "#2a1a20"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = PINK; }}>
                    Agendar con ella
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: "60px 2rem 80px", textAlign: "center", background: "rgba(255,168,198,0.06)" }}>
        <h2 style={{ fontFamily: ffS, fontSize: "clamp(22px,3.5vw,40px)", fontWeight: 400, color: "#2a1a20", marginBottom: 24 }}>¿Lista para tu próxima cita?</h2>
        <a href="/servicios" style={{ display: "inline-block", padding: "14px 36px", background: PINK, color: "#2a1a20", fontFamily: "'Cinzel', serif", fontSize: 10, letterSpacing: "3px", textDecoration: "none", transition: "background .2s", textTransform: "uppercase" }}
          onMouseEnter={e => (e.currentTarget.style.background = "#e87fac")}
          onMouseLeave={e => (e.currentTarget.style.background = PINK)}>
          Ver servicios
        </a>
      </section>

      <Footer />
    </div>
  );
}
