"use client";
// /app/components/HeaderNav.tsx
// Sticky homepage nav, extracted out of app/page.tsx so that file can be a
// Server Component — the scroll-tracked "scrolled" state is the only hook
// Home() itself used to hold, so pulling it out here is what actually lets
// page.tsx drop "use client".
//
// Sticky so the primary CTA stays reachable across a long single-page
// scroll (many sections below), transparent at rest over the hero and only
// gaining a background/hairline once there's real content behind it.

import { useEffect, useState } from "react";
import Link from "next/link";
import { INK, MUTED, ACCENT, BORDER } from "@/lib/theme";
import { MascotAvatar } from "@/app/components/MascotAvatar";

export function HeaderNav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className="sticky top-0 z-40 transition-[background-color,border-color,backdrop-filter] duration-300"
      style={{
        backgroundColor: scrolled ? "rgba(255,253,249,0.85)" : "transparent",
        backdropFilter: scrolled ? "blur(10px)" : "none",
        borderBottom: `1px solid ${scrolled ? BORDER : "transparent"}`,
      }}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link href="/" className="flex items-center gap-2">
          <MascotAvatar characterId="kokoro" variant="bust" size={32} />
          <span style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: "1.35rem", color: INK }}>Ittsui</span>
          <span className="text-sm" style={{ color: MUTED }}>一対</span>
        </Link>
        <div className="flex items-center gap-6">
          <Link href="/download" className="hidden text-sm transition-colors sm:inline" style={{ color: MUTED }}>
            App mobile
          </Link>
          <Link href="/setup" className="text-sm transition-colors" style={{ color: MUTED }}>
            Connexion
          </Link>
          <Link
            href="/setup"
            className="inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-sm text-white transition-transform hover:scale-[1.02]"
            style={{ backgroundColor: ACCENT }}
          >
            Commencer
          </Link>
        </div>
      </div>
    </header>
  );
}
