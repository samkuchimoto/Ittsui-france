// POST /api/find-user
// Looks up a user by email in the users collection (written on sign-in).
// Used by /setup to resolve a partner's email into their uid before
// creating a pairs/{pairId} doc. Server-side only, uses Admin SDK so it
// can query users without exposing the collection to client-side reads.

import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

export async function POST(req: NextRequest) {
  let body: { email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide." }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ error: "E-mail requis." }, { status: 400 });
  }

  const snap = await adminDb
    .collection("users")
    .where("email", "==", email)
    .limit(1)
    .get();

  if (snap.empty) {
    return NextResponse.json(
      { error: "Aucun compte trouvé pour cet e-mail. Cette personne doit d'abord se connecter une fois." },
      { status: 404 }
    );
  }

  const userId = snap.docs[0].id;
  return NextResponse.json({ userId });
}