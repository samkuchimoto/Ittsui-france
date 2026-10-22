// /app/api/stripe/checkout/route.ts
// Starts a Stripe Checkout session for the signed-in person to subscribe
// to Ittsui Plus (lib/plan.ts: one subscription per person, every
// relationship included). It only starts a checkout: billing/{uid} is
// written by the webhook (app/api/stripe/webhook/route.ts) once Stripe
// confirms the payment, never here.

import { NextResponse } from "next/server";
import { z } from "zod";
import { adminDb, verifyRequestUser } from "@/lib/firebaseAdmin";
import { getBilling, getPlan } from "@/lib/plan";
import { PLUS_PRICE_CENTS } from "@/lib/planConfig";
import { stripe } from "@/lib/stripe";

const bodySchema = z.object({ lang: z.enum(["fr", "en", "ja"]).optional() });

export async function POST(request: Request) {
  const uid = await verifyRequestUser(request);
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
  const lang = parsed.success ? (parsed.data.lang ?? "fr") : "fr";

  const plan = await getPlan(uid);
  if (plan.tier === "plus") return NextResponse.json({ error: "déjà Plus" }, { status: 409 });

  // .trim(): a dashboard-pasted env var can carry an invisible trailing newline.
  const priceId = process.env.STRIPE_PLUS_PRICE_ID?.trim();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!priceId || !appUrl) {
    // Missing configuration never fabricates a session: billing just isn't live yet.
    return NextResponse.json({ error: "paiement non configuré" }, { status: 501 });
  }

  // The price shown in the app is the price charged: a leftover Price (the
  // old 1 € one) is refused rather than silently used.
  const price = await stripe.prices.retrieve(priceId);
  if (price.unit_amount !== PLUS_PRICE_CENTS || price.currency !== "eur" || price.recurring?.interval !== "month") {
    console.error(`stripe checkout: STRIPE_PLUS_PRICE_ID ${priceId} is not ${PLUS_PRICE_CENTS / 100} EUR a month`);
    return NextResponse.json({ error: "paiement non configuré" }, { status: 501 });
  }

  const [billing, userSnap] = await Promise.all([getBilling(uid), adminDb.collection("users").doc(uid).get()]);
  const userEmail: string | undefined = userSnap.data()?.email ?? undefined;

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    client_reference_id: uid,
    // app/uid on the session and the subscription: this Stripe account also
    // takes kuchimoto.com's payments, and each webhook keeps to its own.
    metadata: { app: "ittsui", uid },
    subscription_data: { metadata: { app: "ittsui", uid } },
    // Reuse the Stripe customer after a cancel-then-resubscribe instead of
    // creating a duplicate (the two options are mutually exclusive).
    ...(billing.stripeCustomerId ? { customer: billing.stripeCustomerId } : userEmail ? { customer_email: userEmail } : {}),
    allow_promotion_codes: true,
    locale: lang,
    success_url: `${appUrl}/dashboard?plus=success`,
    cancel_url: `${appUrl}/dashboard?plus=cancelled`,
  });

  if (!session.url) {
    console.error(`stripe checkout: session ${session.id} created with no url`);
    return NextResponse.json({ error: "session sans URL" }, { status: 502 });
  }
  return NextResponse.json({ url: session.url });
}
