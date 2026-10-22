// /app/api/venue-partners/[id]/pilot/route.ts
// The venue's own side of the partner pilot (lib/partnerPilot.ts), behind
// its bearer link's token like availability/route.ts:
//   GET  ?token=  its perk, slow hours, and the rendez-vous Ittsui brought
//                 (this month's count, then the list, newest first);
//   PUT           saves the perk and the slow hours;
//   POST          validates a code shown at the counter: that visit
//                 becomes "visited", the proof behind each invoiced visit.

import { NextResponse } from "next/server";
import { z } from "zod";
import { DAYS, PERK_MAX, SLOW_HOURS_MAX } from "@/lib/partnerHours";
import { verifyPartnerToken, type Visit } from "@/lib/partnerPilot";

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const found = await verifyPartnerToken(params.id, new URL(request.url).searchParams.get("token"));
  if (!found) return NextResponse.json({ error: "non autorisé" }, { status: 401 });

  const snap = await found.ref.collection("visits").orderBy("date", "desc").limit(200).get();
  const visits = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Visit);
  const month = new Date().toISOString().slice(0, 7);
  const thisMonth = visits.filter((v) => v.date.startsWith(month));
  return NextResponse.json({
    venueName: found.data.venueName,
    perk: found.data.perk ?? "",
    slowHours: found.data.slowHours ?? [],
    month: { confirmed: thisMonth.length, visited: thisMonth.filter((v) => v.status === "visited").length },
    // Never the codes: they're what the guests show, not the venue.
    visits: visits.slice(0, 50).map(({ id, source, date, time, status, checkedInAt }) => ({ id, source, date, time, status, checkedInAt: checkedInAt ?? null })),
  });
}

const settingsSchema = z.object({
  token: z.string().min(1),
  perk: z.string().trim().max(PERK_MAX),
  slowHours: z
    .array(z.object({ day: z.enum(DAYS), start: z.string().regex(HHMM), end: z.string().regex(HHMM) }).refine((s) => s.start < s.end))
    .max(SLOW_HOURS_MAX),
});

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const parsed = settingsSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "heures ou avantage invalides" }, { status: 400 });
  const found = await verifyPartnerToken(params.id, parsed.data.token);
  if (!found) return NextResponse.json({ error: "non autorisé" }, { status: 401 });
  await found.ref.update({ perk: parsed.data.perk, slowHours: parsed.data.slowHours });
  return NextResponse.json({ perk: parsed.data.perk, slowHours: parsed.data.slowHours });
}

const codeSchema = z.object({ token: z.string().min(1), code: z.string().trim().min(4).max(8) });

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const parsed = codeSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "code invalide" }, { status: 400 });
  const found = await verifyPartnerToken(params.id, parsed.data.token);
  if (!found) return NextResponse.json({ error: "non autorisé" }, { status: 401 });

  const code = parsed.data.code.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const snap = await found.ref.collection("visits").where("code", "==", code).limit(5).get();
  const visit = snap.docs.find((d) => d.data().status === "confirmed") ?? null;
  if (!visit) {
    const already = snap.docs.some((d) => d.data().status === "visited");
    return NextResponse.json({ error: already ? "ce code a déjà été validé" : "code inconnu" }, { status: 404 });
  }
  const checkedInAt = new Date().toISOString();
  await visit.ref.update({ status: "visited", checkedInAt });
  const data = visit.data() as Visit;
  return NextResponse.json({ visit: { id: visit.id, date: data.date, time: data.time, perk: data.perk, checkedInAt } });
}
