import { useEffect, useRef, RefObject } from "react";

export function useScrollReveal(): RefObject<HTMLElement> {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const targets = el.querySelectorAll<HTMLElement>("[data-reveal]");
    if (!targets.length) return;

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );

    targets.forEach((t) => io.observe(t));
    return () => io.disconnect();
  }, []);

  return ref as RefObject<HTMLElement>;
}
