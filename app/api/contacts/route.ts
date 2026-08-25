// /app/api/contacts/route.ts
// A signed-in user's own address-book-style contact list, used to pick a
// recipient when sending a meeting request — see
// /api/meeting-requests/create. Not a chat, no messaging between contacts,
// just enough to avoid retyping the same name/email/phone every time.

import { NextResponse } from "next/server";
import { z } from "zod";
import { adminDb, verifyRequestUser } from "@/lib/firebaseAdmin";
import { normalizePhoneForShare } from "@/lib/phoneShareLinks";

// Email optional now, phone added — at least one required (refine below).
// Same reasoning as MeetingRequest's identical shape: real people
// overwhelmingly know a friend's phone number, not their email (2026-08-25
// real-user test).
const addContactSchema = z
  .object({
    name: z.string().trim().min(1).max(200),
    email: z.string().trim().email().max(320).optional(),
    phone: z
      .string()
      .trim()
      .min(6)
      .max(30)
      .regex(/^[0-9+()\-.\s]+$/, "numéro invalide")
      .optional(),
  })
  .refine((data) => data.email || data.phone, { message: "e-mail ou téléphone requis" });

export async function GET(request: Request) {
  const uid = await verifyRequestUser(request);
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const snap = await adminDb.collection("users").doc(uid).collection("contacts").orderBy("createdAt", "desc").get();
  const contacts = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  return NextResponse.json({ contacts });
}

export async function POST(request: Request) {
  const uid = await verifyRequestUser(request);
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = addContactSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "champs invalides" }, { status: 400 });
  }

  const { name } = parsed.data;
  const email = parsed.data.email?.toLowerCase();
  // Stored as typed (not normalized) so the contact list shows back
  // exactly what someone entered — dedup below normalizes just for the
  // comparison, the same way it lowercases email just for comparison.
  const phone = parsed.data.phone;
  const normalizedPhone = phone ? normalizePhoneForShare(phone) : null;
  const contactsRef = adminDb.collection("users").doc(uid).collection("contacts");

  // Server-side dedup, not just RequestFormClient.tsx's client-side check
  // against its own already-loaded list — that one can go stale (two
  // tabs, a second "add to contacts" a while later) and would otherwise
  // silently create a second entry for the same person. Existing name is
  // refreshed rather than left stale, since a re-add usually means the
  // sender typed a more current name for the same person. Email takes
  // priority when both are given (the more reliably canonical
  // identifier); phone dedup only runs when there's no email to check
  // instead, so it never masks a real second contact who happens to
  // share a phone with an existing email-only contact's number.
  let existingDoc: FirebaseFirestore.QueryDocumentSnapshot | null = null;
  if (email) {
    const existing = await contactsRef.where("email", "==", email).limit(1).get();
    if (!existing.empty) existingDoc = existing.docs[0];
  } else if (normalizedPhone) {
    // Phone-only contacts have no `email` field on the document at all
    // (never written when absent), not `email: null` — Firestore's
    // equality operator can't match "field doesn't exist" the way it can
    // match a real null value, so this can't be a where() query the way
    // the email path above is. This collection is per-user (a handful of
    // contacts, never thousands), so fetching everything and normalizing
    // in memory to compare is negligible — same "small per-user set,
    // filter client/server-side instead of a composite index" pattern
    // already used for the pairs queries elsewhere in this app.
    const snap = await contactsRef.get();
    existingDoc = snap.docs.find((d) => d.data().phone && normalizePhoneForShare(d.data().phone) === normalizedPhone) ?? null;
  }

  if (existingDoc) {
    // Refreshes name AND the matched identifier's exact formatting, not
    // just name — a re-add with the same number typed differently
    // ("0612345678" vs "+33 6 12 34 56 78") should update what's shown,
    // the same reasoning that already applied to name alone.
    await existingDoc.ref.update({ name, ...(email ? { email } : {}), ...(phone ? { phone } : {}) });
    return NextResponse.json({ id: existingDoc.id, name, ...(email ? { email } : {}), ...(phone ? { phone } : {}), createdAt: existingDoc.data().createdAt });
  }

  const createdAt = new Date().toISOString();
  const ref = await contactsRef.add({ name, ...(email ? { email } : {}), ...(phone ? { phone } : {}), createdAt });

  return NextResponse.json({ id: ref.id, name, ...(email ? { email } : {}), ...(phone ? { phone } : {}), createdAt });
}

export async function DELETE(request: Request) {
  const uid = await verifyRequestUser(request);
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const contactId = new URL(request.url).searchParams.get("id");
  if (!contactId) return NextResponse.json({ error: "id manquant" }, { status: 400 });

  await adminDb.collection("users").doc(uid).collection("contacts").doc(contactId).delete();
  return NextResponse.json({ ok: true });
}
