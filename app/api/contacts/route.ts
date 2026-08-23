// /app/api/contacts/route.ts
// A signed-in user's own address-book-style contact list (name + email),
// used to pick a recipient when sending a meeting request — see
// /api/meeting-requests/create. Not a chat, no messaging between contacts,
// just enough to avoid retyping the same name/email every time.

import { NextResponse } from "next/server";
import { z } from "zod";
import { adminDb, verifyRequestUser } from "@/lib/firebaseAdmin";

const addContactSchema = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.string().trim().email().max(320),
});

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
    return NextResponse.json({ error: "nom et e-mail requis" }, { status: 400 });
  }

  const { name } = parsed.data;
  const email = parsed.data.email.toLowerCase();
  const createdAt = new Date().toISOString();

  const ref = await adminDb.collection("users").doc(uid).collection("contacts").add({ name, email, createdAt });

  return NextResponse.json({ id: ref.id, name, email, createdAt });
}

export async function DELETE(request: Request) {
  const uid = await verifyRequestUser(request);
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const contactId = new URL(request.url).searchParams.get("id");
  if (!contactId) return NextResponse.json({ error: "id manquant" }, { status: 400 });

  await adminDb.collection("users").doc(uid).collection("contacts").doc(contactId).delete();
  return NextResponse.json({ ok: true });
}
