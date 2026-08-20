"use client";
// A rotating, warmer loading message instead of a static "Chargement…" —
// so a slow connection reads as "still working on it" rather than
// "stuck," the same idea behind status text like "thinking… reading the
// code… almost done" elsewhere. Renders as plain inline text (no
// wrapper styling of its own) so it drops into whatever <p> a page
// already has: <p className="..."><FriendlyLoading /></p>.

import { useEffect, useState } from "react";

const PHRASES = ["Un instant…", "On vérifie tout ça…", "Presque prêt…"];
const INTERVAL_MS = 1600;

export function FriendlyLoading() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % PHRASES.length);
    }, INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  return <span aria-live="polite">{PHRASES[index]}</span>;
}
