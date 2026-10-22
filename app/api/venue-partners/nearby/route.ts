// /app/api/venue-partners/nearby/route.ts
// The partner venues of a postal code, for the request form's first
// suggestions (lib/partnerPilot.ts): public fields only, with the slow
// hours so the form can say which ones fit the chosen day and time
// (lib/partnerHours.ts's inSlowHours). Never the contact details or token.

import { NextResponse } from "next/server";
import { activePartners, partnerOption } from "@/lib/partnerPilot";

export async function GET(request: Request) {
  const postalCode = new URL(request.url).searchParams.get("postalCode")?.trim() ?? "";
  if (!/^\d{5}$/.test(postalCode)) return NextResponse.json({ results: [] });
  const partners = await activePartners(postalCode);
  return NextResponse.json(
    {
      results: partners.map((p) => {
        const option = partnerOption(p);
        return {
          id: p.id,
          name: option.venueName,
          address: option.venueAddress,
          venueType: option.venueType,
          perk: p.perk ?? "",
          slowHours: p.slowHours ?? [],
        };
      }),
    },
    { headers: { "Cache-Control": "public, max-age=60, s-maxage=60" } }
  );
}
