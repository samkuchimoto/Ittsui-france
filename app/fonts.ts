// /app/fonts.ts
// Fraunces (display) and Work Sans (body), self-hosted from app/fonts/:
// the Latin variable files Google Fonts serves (Fraunces 300-600 upright and
// italic, Work Sans 400-600). They used to be loaded from Google in each of
// the 22 screens that use them, and a build fetched them every time: on
// 2026-10-22 Vercel's build servers couldn't reach fonts.gstatic.com and
// every production build failed. Japanese text keeps the system fonts, as
// before (neither family has Japanese glyphs).

import localFont from "next/font/local";

export const fraunces = localFont({
  src: [
    { path: "./fonts/fraunces-latin.woff2", weight: "300 600", style: "normal" },
    { path: "./fonts/fraunces-latin-italic.woff2", weight: "300 600", style: "italic" },
  ],
  variable: "--font-display",
  display: "swap",
});

export const workSans = localFont({
  src: [{ path: "./fonts/work-sans-latin.woff2", weight: "400 600", style: "normal" }],
  variable: "--font-body",
  display: "swap",
});
