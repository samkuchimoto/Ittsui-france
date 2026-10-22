// /app/api/admin/stripe-currencies/route.ts
// TEMPORARY, one-time route (2026-10-23): gives the Ittsui Plus Stripe Price
// (STRIPE_PLUS_PRICE_ID) one amount per currency, from lib/planConfig.ts's
// PLUS_PRICE, as its Stripe currency_options, so checkout can charge each
// city's currency. Runs inside the deployment because the Stripe key is a
// Vercel "Sensitive" env var nothing else can read (same reason as
// ../migrate). Guarded by STRIPE_SYNC_TOKEN, set for this one call; the
// route and the token are removed right after.

import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { PLAN_CURRENCIES, PLUS_PRICE } from "@/lib/planConfig";

const amounts = (price: Stripe.Price) =>
  Object.fromEntries(Object.entries(price.currency_options ?? {}).map(([currency, option]) => [currency, option.unit_amount]));

export async function POST(request: Request) {
  const token = process.env.STRIPE_SYNC_TOKEN?.trim();
  if (!token || request.headers.get("authorization") !== `Bearer ${token}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const priceId = process.env.STRIPE_PLUS_PRICE_ID?.trim();
  if (!priceId) return NextResponse.json({ error: "STRIPE_PLUS_PRICE_ID missing" }, { status: 501 });

  const before = await stripe.prices.retrieve(priceId, { expand: ["currency_options"] });
  // The Price's own currency keeps its amount; every other one gets PLUS_PRICE's.
  const options = Object.fromEntries(
    PLAN_CURRENCIES.filter((currency) => currency.toLowerCase() !== before.currency).map((currency) => [
      currency.toLowerCase(),
      { unit_amount: PLUS_PRICE[currency] },
    ]),
  );
  const after = await stripe.prices.update(priceId, { currency_options: options, expand: ["currency_options"] });
  return NextResponse.json({
    currency: after.currency,
    unitAmount: after.unit_amount,
    before: amounts(before),
    after: amounts(after),
  });
}
