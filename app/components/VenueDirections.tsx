"use client";
// /app/components/VenueDirections.tsx
// The address line, finished.
//
// Verbatim tester feedback: "Adress not", "Je rentre", "Curiosite il veut
// savoir". Seeing a real street address flips someone from reading a
// proposal to planning the trip — and until now the app printed the
// address as inert text and left them to retype it into another app.
//
// Two links, no data fetching, no API key: both are plain URL
// construction against each service's documented public query format
// (lib/mapsLink.ts). Renders nothing at all when there's no address to
// point at, so a week from before venueAddress existed, or a "chez l'un
// des deux" proposal, degrades to exactly what it showed before.

import { INK, MUTED, BORDER } from "@/lib/theme";
import { googleMapsLink, citymapperLink } from "@/lib/mapsLink";

export function VenueDirections({
  venueName,
  venueAddress,
  className,
}: {
  venueName?: string;
  venueAddress?: string;
  className?: string;
}) {
  if (!venueName || !venueAddress) return null;

  return (
    <div className={className}>
      <p className="text-sm" style={{ color: MUTED }}>
        {venueAddress}
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        <a
          href={googleMapsLink(venueName, venueAddress)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-[36px] items-center rounded-full border px-3.5 text-xs font-medium"
          style={{ borderColor: BORDER, color: INK }}
        >
          Ouvrir dans Maps
        </a>
        <a
          href={citymapperLink(venueName, venueAddress)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-[36px] items-center rounded-full border px-3.5 text-xs font-medium"
          style={{ borderColor: BORDER, color: INK }}
        >
          Itinéraire
        </a>
      </div>
    </div>
  );
}
