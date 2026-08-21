"use client";
// /app/components/DiscoveryGrid.tsx
// Responsive 2-column visual tile grid for picking venue-type preferences
// — a visual upgrade of the emoji-pill picker in SetupClient.tsx's "Les
// lieux" step, same VenueType values and multi-select toggle semantics,
// nothing about the underlying data model changes.

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import type { VenueType } from "@/lib/types";

const ACCENT = "#A84B38";
const BORDER = "#E8E2D9";

export interface DiscoveryTile {
  value: VenueType;
  label: string;
  // Photo tile if `image` is set; muted looping video if `video` is set
  // instead. Neither set -> a plain tinted block, used deliberately for
  // venue types with no matching real photo yet rather than showing a
  // mismatched one.
  image?: string;
  video?: string;
}

interface DiscoveryGridProps {
  tiles: DiscoveryTile[];
  selected: VenueType[];
  onToggle: (value: VenueType) => void;
}

export function DiscoveryGrid({ tiles, selected, onToggle }: DiscoveryGridProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {tiles.map((tile) => (
        <DiscoveryTileButton
          key={tile.value}
          tile={tile}
          active={selected.includes(tile.value)}
          onClick={() => onToggle(tile.value)}
        />
      ))}
    </div>
  );
}

function DiscoveryTileButton({
  tile,
  active,
  onClick,
}: {
  tile: DiscoveryTile;
  active: boolean;
  onClick: () => void;
}) {
  const containerRef = useRef<HTMLButtonElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [inView, setInView] = useState(false);

  // Only autoplay a video tile once it's actually on screen — keeps
  // memory/battery use down on Android instead of every tile playing at
  // once (see AGENTS.md's design-system note on the app's memory budget).
  useEffect(() => {
    const el = containerRef.current;
    if (!el || !tile.video || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.3 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [tile.video]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (inView) {
      video.play().catch(() => {}); // autoplay can be blocked by the browser; tile still works without motion
    } else {
      video.pause();
    }
  }, [inView]);

  return (
    <button
      ref={containerRef}
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className="relative aspect-[4/3] overflow-hidden rounded-2xl border text-left transition-transform active:scale-[0.98]"
      style={{ borderColor: active ? ACCENT : BORDER, borderWidth: active ? 2 : 1 }}
    >
      {tile.video ? (
        <video
          ref={videoRef}
          src={tile.video}
          muted
          loop
          playsInline
          preload="none"
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : tile.image ? (
        <Image
          src={tile.image}
          alt={tile.label}
          fill
          loading="lazy"
          sizes="(max-width: 640px) 50vw, 220px"
          className="object-cover"
        />
      ) : (
        <div className="absolute inset-0" style={{ backgroundColor: `${ACCENT}14` }} />
      )}

      <div
        className="absolute inset-0"
        style={{ background: "linear-gradient(to top, rgba(28,25,23,0.55), rgba(28,25,23,0) 55%)" }}
      />

      <span
        className="absolute bottom-2.5 left-3 text-sm font-medium text-white"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {tile.label}
      </span>

      {active && (
        <span
          className="absolute right-2.5 top-2.5 flex h-6 w-6 items-center justify-center rounded-full text-white"
          style={{ backgroundColor: ACCENT }}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-3.5 w-3.5"
          >
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </span>
      )}
    </button>
  );
}
