"use client";
// /app/components/AmbientHeroVideo.tsx
// The hero's ambient background: three ten-second clips cross-fading in
// sequence behind the copy and the sandbox.
//
// ---------------------------------------------------------------------
// Why this sits BEHIND the hero rather than inside it.
//
// The hero's right-hand column is DuoSandbox — a working proposal card
// someone can tap, swap and validate. That component exists because real
// testers said "Image not clikable" about the decorative photo that used
// to occupy exactly that slot. Putting the video in a floating card beside
// it would rebuild the same trap in a more expensive medium: two rounded
// rectangles side by side, one of which responds to touch and one of which
// doesn't, with nothing telling you which is which.
//
// Full-bleed behind everything keeps the sandbox as the only thing that
// looks interactive, because it is the only thing that is.
// ---------------------------------------------------------------------
//
// Weight, and how it is kept down. The three files are 3.4-3.9 MB each,
// 11 MB in total, against a homepage that currently paints in ~420ms. So
// only the first clip is fetched on load; the other two get their `src`
// after the first cross-fade is due, by which point the page has long
// since painted and the visitor has what they came for. A visitor who
// bounces in three seconds — the ones this page is written for — pays for
// the poster and nothing else.
//
// The poster is a 47 KB JPEG of clip one's own first frame, so the
// hand-off from image to video is invisible rather than a jump cut.
//
// prefers-reduced-motion is honoured by rendering the poster alone and
// never creating a <video> at all. That is a real bandwidth saving for
// the people who ask for it, not just a paused animation.

import { useEffect, useRef, useState } from "react";
import { CREAM } from "@/lib/theme";

const CLIPS = [
  { src: "/videos/video1.mp4", alt: "Une mère et sa fille adulte discutent à la table d'un café." },
  { src: "/videos/video2.mp4", alt: "Un père et son fils adulte marchent côte à côte sur un chemin de vignes." },
  { src: "/videos/video3.mp4", alt: "Deux femmes rient autour d'une tasse de thé, à une table en bois." },
];

const POSTER = "/videos/poster.jpg";
const HOLD_MS = 11000; // time on screen per clip
const FADE_MS = 1600; // cross-fade duration, also set in the CSS transition

export function AmbientHeroVideo() {
  const [active, setActive] = useState(0);
  // Clips 2 and 3 stay src-less until the first change is imminent — see
  // the weight note above. Clip 1 is always armed.
  const [armed, setArmed] = useState<boolean[]>([true, false, false]);
  const [reducedMotion, setReducedMotion] = useState(false);
  // No <video> exists until after mount, and that is load-bearing rather
  // than tidiness. Rendering one on the server means the browser starts
  // pulling the file from the HTML itself, before React has hydrated and
  // had any chance to read prefers-reduced-motion — so someone who asked
  // the OS for less motion still paid for 3.4 MB before the element was
  // removed from under them. Measured: 1 video request on a
  // reduced-motion load. Gating on mount costs one frame of poster, which
  // is showing underneath anyway.
  const [mounted, setMounted] = useState(false);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);

  useEffect(() => {
    setMounted(true);
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(query.matches);
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  // Arm clips 2 and 3 shortly before the first cross-fade is due.
  //
  // This was requestIdleCallback(arm, { timeout: HOLD_MS }) at first,
  // which does not defer anything: rIC's timeout is a DEADLINE by which
  // the callback must have run, not a delay before it may. The browser is
  // idle almost immediately after paint, so all three files were fetched
  // at once and a measurement showed the full 10.92 MB arriving inside
  // 2.5 seconds — the exact thing the laziness existed to prevent.
  //
  // A plain timer is what was actually meant. Someone who leaves inside
  // ten seconds never pays for clips 2 and 3 at all.
  useEffect(() => {
    if (reducedMotion) return;
    const handle = window.setTimeout(() => setArmed([true, true, true]), HOLD_MS - FADE_MS);
    return () => window.clearTimeout(handle);
  }, [reducedMotion]);

  useEffect(() => {
    if (reducedMotion) return;
    const timer = window.setInterval(() => setActive((i) => (i + 1) % CLIPS.length), HOLD_MS);
    return () => window.clearInterval(timer);
  }, [reducedMotion]);

  // Autoplay can be refused (a data-saver setting, an older iOS, a policy
  // that wants a gesture). Nothing breaks when it is: the poster stays put
  // underneath, which is a perfectly good hero. This just stops a clip
  // that failed to start from sitting there as a frozen first frame.
  useEffect(() => {
    if (reducedMotion) return;
    const el = videoRefs.current[active];
    if (!el) return;
    el.currentTime = 0;
    void el.play().catch(() => {});
  }, [active, armed, reducedMotion]);

  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        pointerEvents: "none",
        backgroundColor: "#0C0A09",
        backgroundImage: `url(${POSTER})`,
        backgroundSize: "cover",
        backgroundPosition: "center 38%",
      }}
    >
      {mounted && !reducedMotion &&
        CLIPS.map((clip, i) => (
          <video
            key={clip.src}
            ref={(el) => {
              videoRefs.current[i] = el;
            }}
            // Only clip 1 has a src on first render; the rest are armed on idle.
            src={armed[i] ? clip.src : undefined}
            poster={POSTER}
            muted
            loop
            playsInline
            autoPlay
            preload={i === 0 ? "metadata" : "none"}
            tabIndex={-1}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              // Pushed up and scaled a little: cover already crops the
              // frame, and this takes the rest of the lower-right corner
              // with it, where the generator leaves its watermark.
              objectPosition: "center 38%",
              transform: "scale(1.08)",
              transformOrigin: "center top",
              opacity: active === i ? 1 : 0,
              transition: `opacity ${FADE_MS}ms ease-in-out`,
              pointerEvents: "none",
            }}
          />
        ))}

      {/* The scrim, cinematic rather than protective.
 
          The first pass at this laid CREAM over the footage at ~95% so the
          existing ink-on-cream copy stayed legible — which worked, and
          reduced three pieces of real cinematography to a faint warm
          texture nobody would notice. a16z looks the way it does because
          the footage is the brightest thing on the screen and the type
          adapts to it, not the other way round.
 
          So: a dark wash, heaviest bottom-left where the headline and the
          field sit, opening up towards the top-right so the faces and the
          light in each clip stay visible. The hero's type is CREAM over
          this; everything below the hero is unchanged ink-on-cream. */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(to top, rgba(12,10,9,0.92) 0%, rgba(12,10,9,0.72) 30%, rgba(12,10,9,0.42) 62%, rgba(12,10,9,0.30) 100%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(105deg, rgba(12,10,9,0.72) 0%, rgba(12,10,9,0.34) 48%, rgba(12,10,9,0.06) 100%)",
        }}
      />
      {/* A short fade into the page background at the bottom edge, so the
          hero dissolves into the section under it instead of stopping at a
          hard horizontal line. */}
      <div
        style={{
          position: "absolute",
          insetInline: 0,
          bottom: 0,
          height: "18%",
          background: `linear-gradient(to bottom, ${CREAM}00, ${CREAM})`,
        }}
      />
    </div>
  );
}
