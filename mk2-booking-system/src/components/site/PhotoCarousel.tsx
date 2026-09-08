import { useState, useRef } from "react";
import { INSTAGRAM_URL } from "./data";
import { business } from "@/config/business.config";

const PINK = "#e87fac";
const GOLD = "#d9b850";

export function PhotoCarousel({ images, alt = business.name }: { images: string[]; alt?: string }) {
  const [idx, setIdx] = useState(0);
  const touchX = useRef<number | null>(null);

  function prev() { setIdx(i => (i - 1 + images.length) % images.length); }
  function next() { setIdx(i => (i + 1) % images.length); }

  function onTouchStart(e: React.TouchEvent) { touchX.current = e.touches[0].clientX; }
  function onTouchEnd(e: React.TouchEvent) {
    if (touchX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    if (Math.abs(dx) > 40) dx < 0 ? next() : prev();
    touchX.current = null;
  }

  return (
    <>
      {/* Mobile carousel */}
      <div className="photo-carousel-mobile" style={{ position: "relative", width: "100%", userSelect: "none" }}
        onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        {/* Image */}
        <div onClick={() => window.open(INSTAGRAM_URL, "_blank", "noopener,noreferrer")} style={{ width: "100%", aspectRatio: "4/5", overflow: "hidden", background: "#f5e6ed", cursor: "pointer" }}>
          <img
            src={images[idx]}
            alt={`${alt} ${idx + 1}`}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", transition: "opacity .25s" }}
          />
        </div>

        {/* Prev / Next arrows */}
        <button onClick={prev} aria-label="Anterior"
          style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", width: 38, height: 38, borderRadius: "50%", background: "rgba(26,15,20,0.52)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <button onClick={next} aria-label="Siguiente"
          style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", width: 38, height: 38, borderRadius: "50%", background: "rgba(26,15,20,0.52)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2"><path d="M9 18l6-6-6-6"/></svg>
        </button>

        {/* Counter badge */}
        <div style={{ position: "absolute", bottom: 14, right: 14, background: "rgba(26,15,20,0.6)", color: "#fff", fontFamily: "'Montserrat', sans-serif", fontSize: 10, fontWeight: 600, letterSpacing: "1px", padding: "4px 10px", borderRadius: 99, backdropFilter: "blur(4px)" }}>
          {idx + 1} / {images.length}
        </div>
      </div>

      {/* Dots */}
      <div className="photo-carousel-mobile" style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 14 }}>
        {images.map((_, i) => (
          <button key={i} onClick={() => setIdx(i)}
            style={{ width: i === idx ? 20 : 7, height: 7, borderRadius: 99, background: i === idx ? PINK : "#f0d8e4", border: "none", cursor: "pointer", padding: 0, transition: "all .2s" }}
          />
        ))}
      </div>

      {/* Desktop grid */}
      <div className="photo-carousel-desktop" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "0.75rem" }}>
        {images.map((src, i) => (
          <div key={i} onClick={() => window.open(INSTAGRAM_URL, "_blank", "noopener,noreferrer")} style={{ aspectRatio: "4/5", overflow: "hidden", cursor: "pointer" }}>
            <img src={src} alt={`${alt} ${i + 1}`} loading="lazy"
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", transition: "transform .4s" }}
              onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.06)")}
              onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
            />
          </div>
        ))}
      </div>

      <style>{`
        @media (min-width: 640px) {
          .photo-carousel-mobile { display: none !important; }
          .photo-carousel-desktop { display: grid !important; }
        }
        @media (max-width: 639px) {
          .photo-carousel-desktop { display: none !important; }
        }
      `}</style>
    </>
  );
}
