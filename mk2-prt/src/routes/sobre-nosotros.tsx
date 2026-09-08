import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { supabase } from "@/lib/supabase";
import { INSTAGRAM_URL } from "@/components/site/data";
import { business } from "@/config/business.config";

export const Route = createFileRoute("/sobre-nosotros")({
  head: () => ({
    meta: [
      { title: `Sobre Nosotros | ${business.name}` },
      { name: "description", content: `Conoce el equipo de ${business.name} en ${business.legalCity}. Técnicas especializadas en uñas, cabello y estética.` },
    ],
  }),
  component: SobreNosotros,
});

type Specialist = { id: string; full_name: string; avatar_url: string | null; bio: string | null };

const PINK = "#e87fac";
const ff   = "'Montserrat', sans-serif";
const ffS  = "'Cormorant Garamond', serif";

const STORY = [
  { year: "2019", text: `${business.name} abre sus puertas frente a Plaza ${business.legalCity.split(",")[0]} con la misión de ofrecer servicios de belleza de alta calidad en un ambiente acogedor.` },
  { year: "2021", text: "Expandimos nuestro equipo y servicios para incluir cabello, depilado y tratamientos especializados." },
  { year: "2023", text: "Nos certificamos en las técnicas más recientes de nail art y ampliamos nuestra tienda de productos profesionales." },
  { year: "Hoy",  text: `Seguimos creciendo, con un equipo apasionado y un compromiso total con hacer que cada clienta salga ${business.shortName}.` },
];

const VALUES = [
  { icon: "✦", title: "Calidad", desc: "Usamos solo productos premium para garantizar resultados duraderos y seguros para tus uñas y cabello." },
  { icon: "♡", title: "Atención personalizada", desc: "Cada clienta es única. Nos tomamos el tiempo para entender lo que necesitas y superar tus expectativas." },
  { icon: "◇", title: "Higiene", desc: "Protocolo estricto de esterilización en cada servicio. Tu salud y seguridad son nuestra prioridad." },
  { icon: "★", title: "Experiencia", desc: "Un ambiente relajado y elegante donde vendrás a mimarte y saldrás sintiéndote increíble." },
];

function SobreNosotros() {
  const [team, setTeam] = useState<Specialist[]>([]);

  useEffect(() => {
    supabase.from("profiles").select("id, full_name, avatar_url, bio").eq("role", "specialist").eq("active", true).order("full_name")
      .then(({ data }) => setTeam(data ?? []));
  }, []);

  return (
    <div style={{ background: "#fff", color: "#2a1a20" }}>
      <Navbar />

      {/* Hero */}
      <section style={{ paddingTop: 140, paddingBottom: 80, background: "linear-gradient(160deg, #fdf0f5 0%, #fff 60%)" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 2rem", textAlign: "center" }}>
          <p style={{ fontFamily: ff, fontSize: 10, letterSpacing: "4px", color: PINK, marginBottom: 16, textTransform: "uppercase" }}>Sobre Nosotros</p>
          <h1 style={{ fontFamily: ffS, fontSize: "clamp(40px,6vw,72px)", fontWeight: 300, color: "#2a1a20", margin: "0 0 24px", lineHeight: 1.1 }}>
            Más que un salón,<br/>una experiencia
          </h1>
          <p style={{ fontFamily: ff, fontSize: 14, lineHeight: 1.9, color: "#7a6070", maxWidth: 560, margin: "0 auto" }}>
            {`En ${business.name} creemos que la belleza es una forma de expresión personal. Nuestro equipo de técnicas certificadas está aquí para ayudarte a encontrar tu mejor versión.`}
          </p>
        </div>
      </section>

      {/* Story timeline */}
      <section style={{ padding: "80px 2rem", maxWidth: 900, margin: "0 auto" }}>
        <p style={{ fontFamily: ff, fontSize: 10, letterSpacing: "4px", color: "#c9a96e", marginBottom: 12, textTransform: "uppercase" }}>Nuestra historia</p>
        <h2 style={{ fontFamily: ffS, fontSize: "clamp(28px,4vw,44px)", fontWeight: 300, color: "#2a1a20", marginBottom: 48 }}>Cómo llegamos aquí</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 0, borderLeft: "1px solid #f0d8e4", marginLeft: 24 }}>
          {STORY.map((s, i) => (
            <div key={i} style={{ display: "flex", gap: 32, paddingBottom: i < STORY.length - 1 ? 48 : 0, position: "relative" }}>
              <div style={{ position: "absolute", left: -37, top: 4, width: 26, height: 26, borderRadius: "50%", background: i === STORY.length - 1 ? PINK : "#fff", border: "1.5px solid " + (i === STORY.length - 1 ? PINK : "#f0d8e4"), display: "flex", alignItems: "center", justifyContent: "center" }}>
                {i === STORY.length - 1 && <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#fff" }}/>}
              </div>
              <div style={{ paddingLeft: 24 }}>
                <p style={{ fontFamily: ffS, fontSize: 22, color: PINK, marginBottom: 8, fontWeight: 500 }}>{s.year}</p>
                <p style={{ fontFamily: ff, fontSize: 13, lineHeight: 1.8, color: "#7a6070", maxWidth: 560 }}>{s.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Establishment photos */}
      <section style={{ background: "#fdf0f5", padding: "80px 2rem" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <p style={{ fontFamily: ff, fontSize: 10, letterSpacing: "4px", color: "#c9a96e", marginBottom: 12, textTransform: "uppercase" }}>El salón</p>
          <h2 style={{ fontFamily: ffS, fontSize: "clamp(28px,4vw,44px)", fontWeight: 300, color: "#2a1a20", marginBottom: 40 }}>Nuestro espacio</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
            {["/brand/sobre-nosotros-1.jpg","/brand/sobre-nosotros-2.jpg","/brand/sobre-nosotros-3.jpg"].map((src, i) => (
              <div key={i} onClick={() => window.open(INSTAGRAM_URL, "_blank", "noopener,noreferrer")} style={{ aspectRatio: i === 0 ? "4/3" : "1/1", overflow: "hidden", cursor: "pointer" }}>
                <img src={src} alt={`${business.name}`} style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform .4s" }}
                  onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.04)")}
                  onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}/>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Values */}
      <section style={{ padding: "80px 2rem", maxWidth: 1100, margin: "0 auto" }}>
        <p style={{ fontFamily: ff, fontSize: 10, letterSpacing: "4px", color: "#c9a96e", marginBottom: 12, textTransform: "uppercase" }}>Lo que nos define</p>
        <h2 style={{ fontFamily: ffS, fontSize: "clamp(28px,4vw,44px)", fontWeight: 300, color: "#2a1a20", marginBottom: 48 }}>Nuestros valores</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 32 }}>
          {VALUES.map(v => (
            <div key={v.title}>
              <span style={{ fontFamily: ffS, fontSize: 28, color: PINK, display: "block", marginBottom: 12 }}>{v.icon}</span>
              <h3 style={{ fontFamily: ffS, fontSize: 22, color: "#2a1a20", marginBottom: 10, fontWeight: 400 }}>{v.title}</h3>
              <p style={{ fontFamily: ff, fontSize: 12, lineHeight: 1.9, color: "#7a6070" }}>{v.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Team */}
      <section style={{ background: "#fdf0f5", padding: "80px 2rem" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <p style={{ fontFamily: ff, fontSize: 10, letterSpacing: "4px", color: "#c9a96e", marginBottom: 12, textTransform: "uppercase" }}>Nuestro equipo</p>
          <h2 style={{ fontFamily: ffS, fontSize: "clamp(28px,4vw,44px)", fontWeight: 300, color: "#2a1a20", marginBottom: 48 }}>Las personas detrás de {business.shortName}</h2>
          {team.length === 0 ? (
            <p style={{ fontFamily: ff, fontSize: 13, color: "#b09090" }}>Equipo próximamente…</p>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 28 }}>
              {team.map(t => (
                <div key={t.id} style={{ textAlign: "center" }}>
                  <div style={{ width: 120, height: 120, borderRadius: "50%", margin: "0 auto 16px", overflow: "hidden", background: "#f8eef3", border: "2px solid #f0d8e4" }}>
                    {t.avatar_url ? (
                      <img src={t.avatar_url} alt={t.full_name} style={{ width: "100%", height: "100%", objectFit: "cover" }}/>
                    ) : (
                      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: ffS, fontSize: 40, color: PINK, fontWeight: 300 }}>
                        {(t.full_name || "?").split(" ").map(w => w[0]).slice(0,2).join("")}
                      </div>
                    )}
                  </div>
                  <h3 style={{ fontFamily: ffS, fontSize: 20, color: "#2a1a20", fontWeight: 400, marginBottom: 4 }}>{t.full_name}</h3>
                  <p style={{ fontFamily: ff, fontSize: 10, letterSpacing: "2px", color: PINK, marginBottom: 10, textTransform: "uppercase" }}>Técnica especialista</p>
                  {t.bio && <p style={{ fontFamily: ff, fontSize: 12, lineHeight: 1.8, color: "#7a6070", maxWidth: 200, margin: "0 auto" }}>{t.bio}</p>}
                  <a href={"/?tech=" + t.id + "#agendar"} style={{ display: "inline-block", marginTop: 14, padding: "9px 20px", background: "transparent", border: "1px solid " + PINK, color: PINK, fontFamily: ff, fontSize: 10, letterSpacing: "2px", textDecoration: "none", transition: "background .2s, color .2s" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = PINK; (e.currentTarget as HTMLElement).style.color = "#fff"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = PINK; }}>
                    AGENDAR CON ELLA
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: "80px 2rem", textAlign: "center" }}>
        <h2 style={{ fontFamily: ffS, fontSize: "clamp(28px,4vw,48px)", fontWeight: 300, color: "#2a1a20", marginBottom: 24 }}>¿Lista para tu próxima cita?</h2>
        <a href="/#agendar" style={{ display: "inline-block", padding: "14px 36px", background: PINK, color: "#fff", fontFamily: ff, fontSize: 11, letterSpacing: "3px", textDecoration: "none", transition: "background .2s" }}
          onMouseEnter={e => (e.currentTarget.style.background = "#c4527e")}
          onMouseLeave={e => (e.currentTarget.style.background = PINK)}>
          RESERVAR CITA
        </a>
      </section>

      <Footer />
    </div>
  );
}
