"use client";
// /app/components/VenueSheet.tsx
// The modal that answers "Curiosite il veut savoir" — verbatim user
// feedback, alongside "Adress not / Je rentre".
//
// The observed behaviour: someone reads a real street address on a
// proposal and their attention shifts from appreciating the idea to
// planning the trip — which arrondissement, which metro, is it the kind
// of place you can actually talk in. The app was showing the address as
// dead text and ending the thought there, so the visitor left the page to
// finish it somewhere else. This sheet finishes it in place: address,
// nearest stations, what the place is like, and a one-tap handoff to a
// real mapping app.
//
// What it deliberately does not show: an average price and a numeric
// noise score. Ittsui has no live data source for either (no Places
// integration — see AGENTS.md's venue-coverage section), and a plausible
// invented number about a real business is worse than an absent one.

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { INK, MUTED, ACCENT, BORDER } from "@/lib/theme";
import { googleMapsLink, citymapperLink } from "@/lib/mapsLink";
import type { SandboxVenue } from "@/lib/sandboxScenarios";

export function VenueSheet({ venue, onClose }: { venue: SandboxVenue | null; onClose: () => void }) {
  // Portalled to <body>, and it has to be. The card that opens this sheet
  // lives inside app/components/Reveal.tsx, whose fade-up leaves a
  // `transform` on the wrapper — and a transformed ancestor becomes the
  // containing block for `position: fixed` descendants. Rendered in place,
  // the "full-screen" overlay covered only the sandbox column: the
  // backdrop stopped at its edges and the sheet was boxed into the right
  // half of the page. Mount-gated so server render and first client render
  // agree (both null) and hydration doesn't mismatch.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Escape closes, and the page behind stops scrolling while it's up.
  useEffect(() => {
    if (!venue) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [venue, onClose]);

  if (!venue || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:px-6"
      role="dialog"
      aria-modal="true"
      aria-label={venue.name}
      onClick={onClose}
    >
      <div
        className="max-h-[88vh] w-full max-w-sm overflow-y-auto rounded-t-3xl bg-white sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative h-44 w-full">
          <Image src={venue.photo} alt={venue.photoAlt} fill sizes="384px" className="object-cover" />
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-lg leading-none"
            style={{ color: INK }}
          >
            ×
          </button>
        </div>

        <div className="p-6">
          <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: "1.35rem" }}>{venue.name}</h3>
          <p className="mt-1 text-sm" style={{ color: MUTED }}>
            {venue.address}
          </p>

          <div className="mt-4 flex flex-wrap gap-1.5">
            {venue.ambience.map((tag) => (
              <span
                key={tag}
                className="rounded-full px-2.5 py-1 text-[11px] font-medium"
                style={{ backgroundColor: `${ACCENT}14`, color: ACCENT }}
              >
                {tag}
              </span>
            ))}
          </div>

          <div className="mt-4 rounded-2xl border p-4" style={{ borderColor: BORDER }}>
            <p className="text-xs uppercase tracking-[0.12em]" style={{ color: MUTED }}>
              Y aller
            </p>
            <p className="mt-1.5 text-sm" style={{ color: INK }}>
              {venue.metro}
            </p>
          </div>

          <div className="mt-4 flex flex-col gap-2">
            <a
              href={googleMapsLink(venue.name, venue.address)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[44px] items-center justify-center rounded-full text-sm font-medium text-white"
              style={{ backgroundColor: ACCENT }}
            >
              Ouvrir dans Google Maps
            </a>
            <a
              href={citymapperLink(venue.name, venue.address)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[44px] items-center justify-center rounded-full border text-sm font-medium"
              style={{ borderColor: BORDER, color: INK }}
            >
              Itinéraire Citymapper
            </a>
          </div>

          <p className="mt-4 text-xs" style={{ color: MUTED }}>
            Exemple de lieu. Ittsui propose une adresse réelle près de chez vous — vous n&apos;avez rien à chercher.
          </p>
        </div>
      </div>
    </div>,
    document.body,
  );
}
