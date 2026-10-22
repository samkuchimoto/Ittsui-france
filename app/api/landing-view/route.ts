// /app/api/landing-view/route.ts
// One view of a city landing page (app/components/site/LandingBeacon.tsx),
// logged as a landing_view event by city and language, with its campaign
// and referring site. Nothing that identifies the visitor is kept.

import { NextResponse } from "next/server";
import { z } from "zod";
import { CITY_IDS } from "@/lib/cities";
import { logEvent } from "@/lib/analytics";

/** A campaign or site name, reduced to letters, digits, dots and dashes. */
const tag = (max: number) =>
  z
    .string()
    .max(300)
    .transform((value) => value.replace(/[^\w.-]/g, "").slice(0, max));

const schema = z.object({
  city: z.enum(CITY_IDS),
  lang: z.enum(["fr", "en", "ja", "es", "he"]),
  utmSource: tag(40).optional(),
  utmCampaign: tag(40).optional(),
  referrer: tag(80).optional(),
});

export async function POST(request: Request) {
  // sendBeacon posts text/plain: read the body as JSON whatever its type.
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return new NextResponse(null, { status: 400 });
  const { city, lang, utmSource, utmCampaign, referrer } = parsed.data;
  // Awaited: the write is this route's whole job, and a serverless function can stop once it has answered.
  await logEvent("landing_view", {
    city,
    lang,
    utmSource: utmSource || null,
    utmCampaign: utmCampaign || null,
    referrer: referrer || null,
  });
  return new NextResponse(null, { status: 204 });
}
