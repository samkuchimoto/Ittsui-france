"use client";
// /app/components/DiscoveryGrid.tsx
// Responsive 2-column visual tile grid for picking venue-type preferences
// — a visual upgrade of the emoji-pill picker in SetupClient.tsx's "Les
// lieux" step, same VenueType values and multi-select toggle semantics,
// nothing about the underlying data model changes.

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import type { VenueType } from "@/lib/types";
import { ACCENT, BORDER } from "@/lib/theme";

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

// 2-second hard budget, client-side — belt and suspenders with the
// server route's own timeout. On timeout, missing credentials, or any
// error, this resolves to null and the tile falls back to its existing
// plain tinted block, exactly as before this feature existed — never to
// a fabricated image standing in silently for a failed generation.
const AI_MOOD_TIMEOUT_MS = 2000;

function useAIVenueMood(category: VenueType, enabled: boolean): string | null {
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), AI_MOOD_TIMEOUT_MS);
    fetch("/api/ai-venue-mood", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category }),
      signal: controller.signal,
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.imageUrl) setImageUrl(data.imageUrl);
      })
      .catch(() => {})
      .finally(() => clearTimeout(timeout));
    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [category, enabled]);

  return imageUrl;
}

// Exported (not just used internally by DiscoveryGrid's grid layout) so a
// single-item display — e.g. one venue thumbnail in a list row, which a
// hardcoded grid-cols-2 grid can't do cleanly — can reuse the exact same
// AI-mood-illustration-with-badge behavior instead of duplicating it.
export function DiscoveryTileButton({
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
  // Only attempted for tiles with no real photo/video to show instead —
  // never competing with or replacing an actual licensed photo.
  const aiMoodUrl = useAIVenueMood(tile.value, !tile.image && !tile.video);

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
    <motion.button
      ref={containerRef}
      type="button"
      onClick={onClick}
      aria-pressed={active}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: "spring", stiffness: 380, damping: 22 }}
      className="relative aspect-[4/3] overflow-hidden rounded-2xl border text-left"
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
      ) : aiMoodUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- external,
        // ungenerated-at-build-time URL from the image-gen API; next/image
        // would need this remote host allowlisted for a source that only
        // exists per-request.
        <img src={aiMoodUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <div className="absolute inset-0" style={{ backgroundColor: `${ACCENT}14` }} />
      )}

      {/* Mascot-motion-framework "steam effect over coffee icons" —
          purely decorative, CSS-only, no character art needed, so it
          renders today rather than waiting on real mascot files. Placed
          in DOM order (not forced via z-index) between the base photo and
          the gradient/label/checkmark layers, and in the top-left corner
          — the only corner never shared with the top-right active
          checkmark or the bottom-left label — so it can never render on
          top of either. */}
      {tile.value === "cafe" && (
        <>
          <style jsx>{`
            @media (prefers-reduced-motion: no-preference) {
              .steam-wisp {
                animation: steamRise 3.6s ease-in-out infinite;
              }
              .steam-wisp:nth-child(2) {
                animation-delay: 1.1s;
              }
            }
            @keyframes steamRise {
              0% { transform: translateY(0) scaleX(1); opacity: 0; }
              20% { opacity: 0.55; }
              100% { transform: translateY(-16px) scaleX(1.4); opacity: 0; }
            }
          `}</style>
          <div className="absolute left-3 top-3 h-6 w-8">
            <span className="steam-wisp absolute bottom-0 left-1 h-4 w-1.5 rounded-full bg-white/70 blur-[1px]" />
            <span className="steam-wisp absolute bottom-0 left-4 h-4 w-1.5 rounded-full bg-white/70 blur-[1px]" />
          </div>
        </>
      )}

      {/* Mandatory, high-contrast, on every AI-generated tile without
          exception — this is not a small-print watermark, it's the entire
          reason this feature is honest instead of a fabricated photo
          claiming to depict something real. */}
      {aiMoodUrl && !tile.image && !tile.video && (
        <span
          className="absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-semibold text-white"
          style={{ backgroundColor: "rgba(0,0,0,0.72)" }}
        >
          Illustration générée par IA — Ambiance indicative
        </span>
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
    </motion.button>
  );
}
