// /app/api/stripe/webhook/route.ts
// The only place Pair.subscriptionStatus is ever actually written to
// "active" — the checkout route only starts a session, this is what
// confirms Stripe really collected payment. Raw-body signature
// verification, not a parsed JSON body: Next.js App Router route handlers
// never auto-parse the body (unlike the old Pages API, which needed
// `bodyParser: false`), so request.text() already returns the exact bytes
// Stripe signed — no extra config needed here.

import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { stripe } from "@/lib/stripe";
import type Stripe from "stripe";
import type { Pair } from "@/lib/types";

function mapStripeStatus(status: Stripe.Subscription.Status): Pair["subscriptionStatus"] {
  switch (status) {
    case "active":
      return "active";
    case "trialing":
      return "trialing";
    case "past_due":
    case "unpaid":
    case "incomplete":
      return "past_due";
    default:
      // "canceled", "incomplete_expired", "paused" — no finer-grained
      // status exists on Pair for these, and "canceled" is the honest
      // read-side default: this pair does not currently have working Plus
      // access, same as if it had never subscribed.
      return "canceled";
  }
}

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  // .trim() for the same reason lib/stripe.ts trims the secret key — a
  // dashboard-pasted env var can carry an invisible trailing newline.
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "webhook non configuré" }, { status: 501 });
  }

  const rawBody = await request.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error("stripe webhook: signature verification failed", err);
    return NextResponse.json({ error: "signature invalide" }, { status: 400 });
  }

  try {
    switch (event.type) {
      // Fires once Stripe has actually collected the first payment — the
      // real moment this pair becomes Plus, not when the checkout session
      // was merely created (someone can open Checkout and abandon it).
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const pairId = session.client_reference_id;
        if (pairId && session.subscription && session.customer) {
          await adminDb
            .collection("pairs")
            .doc(pairId)
            .update({
              subscriptionStatus: "active",
              stripeCustomerId: String(session.customer),
              stripeSubscriptionId: String(session.subscription),
            });
        } else {
          console.error(`stripe webhook: checkout.session.completed missing pairId/subscription/customer (session ${session.id})`);
        }
        break;
      }
      // Covers every later status change on an existing subscription —
      // a card failing (past_due), a plan change, or a real cancellation
      // (Stripe fires "updated" with status "canceled" for an
      // end-of-period cancel, and a separate "deleted" event for an
      // immediate one — both handled identically here since Pair only
      // ever needs the resulting status, not which of the two happened).
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const snap = await adminDb
          .collection("pairs")
          .where("stripeSubscriptionId", "==", subscription.id)
          .limit(1)
          .get();
        if (!snap.empty) {
          await snap.docs[0].ref.update({ subscriptionStatus: mapStripeStatus(subscription.status) });
        } else {
          console.error(`stripe webhook: no pair found for subscription ${subscription.id}`);
        }
        break;
      }
      default:
        break;
    }
  } catch (err) {
    console.error(`stripe webhook: failed to process ${event.type}`, err);
    return NextResponse.json({ error: "traitement échoué" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
