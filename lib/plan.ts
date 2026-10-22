// /lib/plan.ts
// Who can set up how many rendez-vous, per person (not per relationship):
//   - every account starts with TRIAL_DAYS of Plus, no card, from its first
//     sign-in (lib/firebase.ts's finishSignIn calls /api/plan);
//   - then the free plan: FREE_PER_MONTH rendez-vous per calendar month
//     (Paris time), counting the requests someone sends and the ritual
//     proposals Ittsui makes for a relationship they started;
//   - Ittsui Plus, a Stripe subscription (lib/planConfig.ts): no limit.
//     A pair paid under the old per-relationship "membre fondateur" plan
//     (Pair.subscriptionStatus "active") still counts as Plus.
// Stored in billing/{uid}, which firestore.rules gives no client access to:
// written only here and by app/api/stripe/webhook, read by the app through
// /api/plan. Server-only (admin SDK).

import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebaseAdmin";
import { FREE_PER_MONTH, TRIAL_DAYS, type Plan } from "@/lib/planConfig";

export { FREE_PER_MONTH, TRIAL_DAYS, type Plan };

export type SubscriptionStatus = "active" | "trialing" | "past_due" | "canceled";

export interface Billing {
  trialEndsAt: string; // ISO
  subscriptionStatus?: SubscriptionStatus;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  usage?: { month: string; count: number };
}

/** "2026-10" in Paris time, the month the free rendez-vous belongs to. */
export function parisMonth(date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit" }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}`;
}

const PLUS_STATUSES: SubscriptionStatus[] = ["active", "trialing", "past_due"];

function billingRef(uid: string) {
  return adminDb.collection("billing").doc(uid);
}

/** The person's billing doc, created with a fresh trial the first time. */
export async function getBilling(uid: string): Promise<Billing> {
  const ref = billingRef(uid);
  const snap = await ref.get();
  if (snap.exists) return snap.data() as Billing;
  const trialEndsAt = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000).toISOString();
  // create() fails if a concurrent first call got there first: read theirs.
  await ref.create({ trialEndsAt, createdAt: new Date().toISOString() }).catch(() => undefined);
  return ((await ref.get()).data() as Billing) ?? { trialEndsAt };
}

/**
 * A relationship paid for under the old per-pair plan. Filtered here, not in
 * the query: array-contains plus a second field needs a composite index this
 * project doesn't have, and one person only has a handful of pairs.
 */
async function hasLegacyPlus(uid: string): Promise<boolean> {
  const snap = await adminDb.collection("pairs").where("userIds", "array-contains", uid).get();
  return snap.docs.some((d) => d.data().subscriptionStatus === "active");
}

export function planOf(billing: Billing, legacyPlus = false, now = new Date()): Plan {
  const month = parisMonth(now);
  const used = billing.usage?.month === month ? billing.usage.count : 0;
  const manageable = Boolean(billing.stripeCustomerId);
  if (legacyPlus || (billing.subscriptionStatus && PLUS_STATUSES.includes(billing.subscriptionStatus))) {
    return { tier: "plus", trialEndsAt: billing.trialEndsAt, month, used, limit: null, canCreate: true, manageable };
  }
  if (now < new Date(billing.trialEndsAt)) {
    return { tier: "trial", trialEndsAt: billing.trialEndsAt, month, used, limit: null, canCreate: true, manageable };
  }
  return { tier: "free", trialEndsAt: billing.trialEndsAt, month, used, limit: FREE_PER_MONTH, canCreate: used < FREE_PER_MONTH, manageable };
}

export async function getPlan(uid: string): Promise<Plan> {
  const [billing, legacy] = await Promise.all([getBilling(uid), hasLegacyPlus(uid)]);
  return planOf(billing, legacy);
}

/** Counts one rendez-vous for this month, once it has actually been created or proposed. */
export async function recordRendezVous(uid: string): Promise<void> {
  const ref = billingRef(uid);
  const month = parisMonth();
  await adminDb.runTransaction(async (tx) => {
    const data = (await tx.get(ref)).data() as Billing | undefined;
    if (data?.usage?.month === month) tx.update(ref, { "usage.count": FieldValue.increment(1) });
    else tx.set(ref, { usage: { month, count: 1 } }, { merge: true });
  });
}

/** Written by the Stripe webhook only. */
export async function setSubscription(uid: string, fields: Partial<Pick<Billing, "subscriptionStatus" | "stripeCustomerId" | "stripeSubscriptionId">>): Promise<void> {
  await billingRef(uid).set(fields, { merge: true });
}

/** The uid whose billing doc holds this Stripe subscription, if any. */
export async function uidForSubscription(subscriptionId: string): Promise<string | null> {
  const snap = await adminDb.collection("billing").where("stripeSubscriptionId", "==", subscriptionId).limit(1).get();
  return snap.empty ? null : snap.docs[0].id;
}
