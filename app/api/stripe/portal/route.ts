// /app/api/stripe/portal/route.ts
// Opens Stripe's billing portal for the signed-in Plus member: card,
// invoices, cancellation. Only someone with a Stripe customer on file
// (billing/{uid}.stripeCustomerId, set by the webhook) gets one.

import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyRequestUser } from "@/lib/firebaseAdmin";
import { getBilling } from "@/lib/plan";
import { stripe } from "@/lib/stripe";

const bodySchema = z.object({ lang: z.enum(["fr", "en", "ja"]).optional() });

export async function POST(request: Request) {
  const uid = await verifyRequestUser(request);
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
  const lang = parsed.success ? (parsed.data.lang ?? "fr") : "fr";

  const billing = await getBilling(uid);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!billing.stripeCustomerId || !appUrl) return NextResponse.json({ error: "aucun abonnement" }, { status: 404 });

  const session = await stripe.billingPortal.sessions.create({
    customer: billing.stripeCustomerId,
    locale: lang,
    return_url: `${appUrl}/dashboard`,
  });
  return NextResponse.json({ url: session.url });
}
