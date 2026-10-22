// /lib/planClient.ts
// The app's side of the plan (lib/plan.ts): read it, start a Plus
// checkout, open the billing portal. Every call carries the Firebase ID
// token; the server decides, this only asks.

import type { User } from "firebase/auth";
import type { Locale } from "@/lib/i18n";
import type { Plan, PlanCurrency } from "@/lib/planConfig";

export type { Plan };

async function post(user: User, path: string, body: object = {}): Promise<Response> {
  const idToken = await user.getIdToken();
  return fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
    body: JSON.stringify(body),
  });
}

export async function fetchPlan(user: User): Promise<Plan | null> {
  try {
    const res = await post(user, "/api/plan");
    return res.ok ? ((await res.json()) as Plan) : null;
  } catch {
    return null;
  }
}

/** Sends the browser to Stripe Checkout; on failure, says why. */
export async function startPlusCheckout(user: User, lang: Locale, currency: PlanCurrency = "EUR"): Promise<"not_configured" | "error" | null> {
  try {
    const res = await post(user, "/api/stripe/checkout", { lang, currency });
    if (res.status === 501) return "not_configured";
    const data = await res.json();
    if (!res.ok || !data.url) return "error";
    window.location.href = data.url;
    return null;
  } catch {
    return "error";
  }
}

export async function openBillingPortal(user: User, lang: Locale): Promise<"error" | null> {
  try {
    const res = await post(user, "/api/stripe/portal", { lang });
    const data = await res.json();
    if (!res.ok || !data.url) return "error";
    window.location.href = data.url;
    return null;
  } catch {
    return "error";
  }
}
