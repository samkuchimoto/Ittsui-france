// /app/api/stripe/checkout/route.ts
// Creates a real Stripe Checkout session for a pair to become "Ittsui
// Plus" — the actual payment button on the dashboard calls this, then
// redirects the browser to the returned session URL. subscriptionStatus
// itself is only ever updated by the webhook (app/api/stripe/webhook/
// route.ts) once Stripe confirms the payment actually went through, never
// here — this route only ever starts a checkout, it doesn't grant access.

import { NextResponse } from "next/server";
import { z } from "zod";
import { adminDb, verifyRequestUser } from "@/lib/firebaseAdmin";
import { stripe } from "@/lib/stripe";
import type { Pair } from "@/lib/types";

const bodySchema = z.object({
  pairId: z.string().min(1),
});

export async function POST(request: Request) {
  const uid = await verifyRequestUser(request);
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "champs invalides" }, { status: 400 });
  }
  const { pairId } = parsed.data;

  const pairRef = adminDb.collection("pairs").doc(pairId);
  const pairSnap = await pairRef.get();
  if (!pairSnap.exists) {
    return NextResponse.json({ error: "relation introuvable" }, { status: 404 });
  }
  const pair = { id: pairSnap.id, ...pairSnap.data() } as Pair;

  // The requester must actually be one of the two people in this pair —
  // a plain client-supplied pairId is not enough authorization for
  // something that starts a real charge, unlike most other routes in
  // this app that trust a body-supplied userId (see firebaseAdmin.ts's
  // own comment on verifyRequestUser: reserved for destructive or
  // credential-like actions, and this is a financial one).
  if (!pair.userIds.includes(uid)) {
    return NextResponse.json({ error: "vous ne faites pas partie de cette relation" }, { status: 403 });
  }

  if (pair.subscriptionStatus === "active") {
    return NextResponse.json({ error: "déjà membre fondateur" }, { status: 409 });
  }

  // .trim() for the same reason lib/stripe.ts trims the secret key — a
  // dashboard-pasted env var can carry an invisible trailing newline.
  const priceId = process.env.STRIPE_PLUS_PRICE_ID?.trim();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!priceId || !appUrl) {
    // Honest fallback, same posture as every other optional integration in
    // this app (Stuart, GIPHY, Fal.ai) — missing configuration never
    // fabricates a session, it just tells the caller billing isn't live yet.
    return NextResponse.json({ error: "paiement non configuré" }, { status: 501 });
  }

  const userSnap = await adminDb.collection("users").doc(uid).get();
  const userEmail: string | undefined = userSnap.data()?.email;

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    client_reference_id: pairId,
    // Reuse the existing Stripe customer once this pair has one (a past
    // cancel-then-resubscribe) instead of creating a duplicate — the two
    // options are mutually exclusive as far as Stripe's API is concerned.
    ...(pair.stripeCustomerId ? { customer: pair.stripeCustomerId } : userEmail ? { customer_email: userEmail } : {}),
    success_url: `${appUrl}/dashboard?plus=success`,
    cancel_url: `${appUrl}/dashboard?plus=cancelled`,
  });

  if (!session.url) {
    console.error(`stripe checkout: session ${session.id} created with no url`);
    return NextResponse.json({ error: "session sans URL" }, { status: 502 });
  }

  return NextResponse.json({ url: session.url });
}
