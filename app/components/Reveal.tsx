"use client";
// /app/components/Reveal.tsx
// Scroll-triggered fade-up wrapper, extracted out of app/page.tsx so that
// file can be a Server Component — IntersectionObserver requires the
// browser, so this piece specifically has to stay client-side, but it just
// renders whatever children it's given (including server-rendered JSX
// passed down from page.tsx, which is exactly how it's used there).

import { useEffect, useRef, useState } from "react";

export function Reveal({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.unobserve(el);
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={`${visible ? "reveal-in" : "reveal-init"} ${className}`}>
      {children}
    </div>
  );
}
