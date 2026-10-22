"use client";

// /app/components/site/LandingBeacon.tsx
// Counts one view of a city landing page (CityLanding.tsx) by city and
// language, with the campaign it came from (utm_source, utm_campaign) and
// the referring site: no cookie, no identifier (app/api/landing-view).

import { useEffect } from "react";

export function LandingBeacon({ city, lang }: { city: string; lang: string }) {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    let referrer = "";
    try {
      referrer = document.referrer ? new URL(document.referrer).hostname : "";
    } catch {
      // An unreadable referrer counts as none.
    }
    const body = JSON.stringify({
      city,
      lang,
      utmSource: params.get("utm_source") ?? "",
      utmCampaign: params.get("utm_campaign") ?? "",
      referrer,
    });
    if (!navigator.sendBeacon?.("/api/landing-view", body)) {
      fetch("/api/landing-view", { method: "POST", body, keepalive: true }).catch(() => {});
    }
  }, [city, lang]);
  return null;
}
