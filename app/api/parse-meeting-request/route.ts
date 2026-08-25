// /app/api/parse-meeting-request/route.ts
// Server-side only, so MISTRAL_API_KEY never reaches the client — takes a
// free-text description and returns a best-effort structured guess for
// /request/new's form fields. See lib/parseMeetingRequest.ts for the full
// reasoning; this route is deliberately thin.

import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyRequestUser } from "@/lib/firebaseAdmin";
import { parseMeetingRequestText } from "@/lib/parseMeetingRequest";

const bodySchema = z.object({ text: z.string().trim().min(3).max(400) });

const EMPTY_RESULT = {
  recipientName: null,
  venueName: null,
  venueAddress: null,
  venueType: null,
  date: null,
  time: null,
};

export async function POST(request: Request) {
  const uid = await verifyRequestUser(request);
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "texte requis" }, { status: 400 });
  }

  const result = await parseMeetingRequestText(parsed.data.text);

  // Always 200, even on a failed/low-confidence parse — the manual form is
  // the fallback, not an error state the client needs to branch on.
  return NextResponse.json({ result: result ?? EMPTY_RESULT });
}
