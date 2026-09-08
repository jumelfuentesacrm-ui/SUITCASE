export function GoldDivider({ text = "LUXURY NAIL & HAIR EXPERIENCE" }: { text?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "1rem", padding: "1.5rem 2.5rem", background: "#f0e6d0" }}>
      <div style={{ flex: 1, height: "0.5px", background: "#c9a96e", opacity: 0.4, maxWidth: 120 }} />
      <svg width="14" height="14" viewBox="0 0 24 24" fill="#c9a96e" opacity="0.8">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
      </svg>
      <span style={{ fontSize: 9, letterSpacing: "5px", color: "#c9a96e", fontWeight: 600, fontFamily: "'Montserrat', sans-serif" }}>{text}</span>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="#c9a96e" opacity="0.8">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
      </svg>
      <div style={{ flex: 1, height: "0.5px", background: "#c9a96e", opacity: 0.4, maxWidth: 120 }} />
    </div>
  );
}
