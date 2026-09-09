export function StatsBar() {
  const stats = [
    { n: "59+",      l: "RESEÑAS EN GOOGLE" },
    { n: "5.0 ★",   l: "CALIFICACIÓN" },
    { n: "100%",     l: "ARTE ARTESANAL" },
    { n: "Carolina", l: "PUERTO RICO" },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4" style={{ borderTop: "0.5px solid #f0d8e4", borderBottom: "0.5px solid #f0d8e4" }}>
      {stats.map((s, i) => (
        <div
          key={s.l}
          className="flex flex-col items-center justify-center py-5 px-3 text-center"
          style={{
            borderRight: i % 2 === 0 ? "0.5px solid #f0d8e4" : "none",
            borderBottom: i < 2 ? "0.5px solid #f0d8e4" : "none",
          }}
        >
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(22px,4vw,28px)", fontWeight: 400, color: "#e87fac" }}>{s.n}</div>
          <div style={{ fontSize: 9, letterSpacing: "2px", color: "#b09090", marginTop: 4, fontWeight: 500, fontFamily: "'Montserrat', sans-serif" }}>{s.l}</div>
        </div>
      ))}
    </div>
  );
}
