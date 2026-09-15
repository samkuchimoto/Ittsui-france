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
//
// ---------------------------------------------------------------------
// The mascot is gone from here, and only from here.
//
// Verbatim tester reaction: "Mascot misleading as products", alongside
// "Le nom ne lui parle pas" and "L'explication n'est pas dans le nom".
// Those are the same failure seen from two sides. The first element a
// French visitor met was an unreadable foreign name next to a single
// cartoon bear — and the category cues that combination sends are
// children's merchandise or a gamified dating app, both of which this
// product then has to spend the rest of the page arguing against.
//
// Two further problems specific to putting Kokoro here. The characters
// are a *pair* system (Ittsui, 一対, means exactly that), so showing one
// of them alone inverts the concept it is supposed to carry. And a
// mascot's job is to make an already-understood utility feel warm; it
// cannot establish what the utility is. Line and Kakao both earned their
// characters after being indispensable, not before.
//
// This is a Zone 0 decision, not a retirement. The full cast stays
// everywhere it explains a relationship rather than the software: the
// duo-type picker in setup, the dashboard, the invite and gesture flows,
// the origin-story sheet. See lib/mascots.config.ts.
// ---------------------------------------------------------------------

import { useEffect, useState } from "react";
import Link from "next/link";
import { INK, MUTED, ACCENT, BORDER, CREAM } from "@/lib/theme";

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
        {/* Typographic monogram plus a descriptor, because the name alone
            explains nothing to the audience it's being shown to. The
            descriptor is the first thing that has to be legible — 一対
            stays as a quiet editorial mark beside it, not as the thing
            carrying the meaning. */}
        <Link href="/" className="flex items-baseline gap-2.5">
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 600,
              fontSize: "1.35rem",
              // Light over the hero footage, ink once the bar has its own
              // cream background. Without this the header read as a white
              // band pasted on top of a cinematic hero.
              color: scrolled ? INK : CREAM,
              textShadow: scrolled ? undefined : "0 1px 14px rgba(12,10,9,0.55)",
              transition: "color 0.3s ease",
            }}
          >
            Ittsui
          </span>
          <span
            className="hidden text-[13px] sm:inline"
            style={{ color: scrolled ? MUTED : "rgba(255,253,249,0.78)", transition: "color 0.3s ease" }}
          >
            L&apos;organisateur de vos moments partagés
          </span>
          <span
            className="text-sm sm:hidden"
            style={{ color: scrolled ? MUTED : "rgba(255,253,249,0.78)", transition: "color 0.3s ease" }}
          >
            一対
          </span>
        </Link>
        <div className="flex items-center gap-6">
          <Link href="/download" className="hidden text-sm transition-colors sm:inline" style={{ color: scrolled ? MUTED : "rgba(255,253,249,0.82)" }}>
            App mobile
          </Link>
          <Link href="/setup" className="text-sm transition-colors" style={{ color: scrolled ? MUTED : "rgba(255,253,249,0.82)" }}>
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
