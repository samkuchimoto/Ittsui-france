// /app/api/meeting-requests/checkin/route.ts
// "I'm here": a check-in at the venue for an accepted rendez-vous (2026-10-23
// pivot). It counts within 100 m of the venue (plus the phone's own GPS
// margin, up to 50 m), from 30 minutes before to 90 minutes after the meeting
// time in the meeting city's clock. The sender is known by their sign-in;
// the guest by the invitation link, and by their sign-in when the invitation
// went to their email. Both checked in = a completed meeting, the proof the
// rendez-vous happened (what a voucher or a stake can rely on).

import { NextResponse } from "next/server";
import { z } from "zod";
import { adminDb, verifyRequestUser } from "@/lib/firebaseAdmin";
import { cityOf } from "@/lib/cities";
import { wallClockToUTCISOString } from "@/lib/timezone";
import { logEvent } from "@/lib/analytics";

const schema = z.object({
  requestId: z.string().min(1).max(64),
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  accuracy: z.number().min(0).max(100000),
});
const RADIUS_M = 100;
const OPENS_BEFORE_MS = 30 * 60 * 1000;
const CLOSES_AFTER_MS = 90 * 60 * 1000;

function distanceM(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const rad = Math.PI / 180;
  const h =
    Math.sin(((b.lat - a.lat) * rad) / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(((b.lon - a.lon) * rad) / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(h));
}

/** The venue on the map (OpenStreetMap via Photon, as for the place suggestions), near the city centre. */
async function geocode(query: string, near: { lat: number; lon: number }): Promise<{ lat: number; lon: number } | null> {
  const res = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=1&lat=${near.lat}&lon=${near.lon}`, {
    signal: AbortSignal.timeout(4000),
    headers: { "User-Agent": "Ittsui/1.0 (+https://www.ittsui.fr; contact@kuchimoto.com)" },
  });
  if (!res.ok) return null;
  const [lon, lat] = (await res.json()).features?.[0]?.geometry?.coordinates ?? [];
  return typeof lat === "number" && typeof lon === "number" ? { lat, lon } : null;
}

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "position invalide" }, { status: 400 });
  const { requestId, lat, lon, accuracy } = parsed.data;
  const ref = adminDb.collection("meetingRequests").doc(requestId);
  const data = (await ref.get()).data();
  if (!data) return NextResponse.json({ error: "demande introuvable" }, { status: 404 });
  if (data.status !== "accepted") return NextResponse.json({ error: "rendez-vous non confirmé" }, { status: 409 });

  const uid = await verifyRequestUser(request);
  let role: "sender" | "guest" = "guest";
  if (uid && uid === data.senderId) role = "sender";
  else if (data.recipientEmail) {
    const email = uid ? String((await adminDb.collection("users").doc(uid).get()).data()?.email ?? "").toLowerCase() : "";
    if (email !== data.recipientEmail) return NextResponse.json({ error: "connexion requise" }, { status: 401 });
  }

  const city = cityOf(data.cityId);
  const meetingAt = new Date(wallClockToUTCISOString(data.time, data.date, city.timezone)).getTime();
  const now = Date.now();
  if (now < meetingAt - OPENS_BEFORE_MS) return NextResponse.json({ error: "trop tôt" }, { status: 425 });
  if (now > meetingAt + CLOSES_AFTER_MS) return NextResponse.json({ error: "trop tard" }, { status: 410 });

  const venue = data.venueGeo ?? (await geocode(`${data.venueName}, ${data.venueAddress}`, city.center).catch(() => null));
  if (!venue) return NextResponse.json({ error: "lieu introuvable sur la carte" }, { status: 422 });
  if (!data.venueGeo) await ref.update({ venueGeo: venue });

  const distance = Math.round(distanceM({ lat, lon }, venue));
  if (distance > RADIUS_M + Math.min(accuracy, 50)) return NextResponse.json({ error: "trop loin", distanceM: distance }, { status: 422 });

  const at = new Date(now).toISOString();
  const checkIns = { ...(data.checkIns ?? {}), [role]: { at, distanceM: distance } };
  const both = Boolean(checkIns.sender && checkIns.guest);
  await ref.update({ checkIns, ...(both && !data.completedAt ? { completedAt: at } : {}) });
  await logEvent("checked_in", { role, cityId: city.id });
  if (both && !data.completedAt) await logEvent("meeting_completed", { cityId: city.id, lang: data.lang ?? "fr" });
  return NextResponse.json({ ok: true, role, distanceM: distance, both });
}
