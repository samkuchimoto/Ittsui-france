// /lib/plan.ts
// Who can set up how many rendez-vous, per person (not per relationship):
//   - every account starts with TRIAL_DAYS of Plus, no card, from its first
//     sign-in (lib/firebase.ts's finishSignIn calls /api/plan);
//   - then the free plan: FREE_PER_MONTH rendez-vous per calendar month
//     (Paris time), counting the requests someone sends and the ritual
//     proposals Ittsui makes for a relationship they started;
//   - Ittsui Plus, a Stripe subscription (lib/planConfig.ts): no limit;
//   - an invite link (lib/referral.ts) adds a month of Plus to both people.
//     A pair paid under the old per-relationship "membre fondateur" plan
//     (Pair.subscriptionStatus "active") still counts as Plus.
// Stored in billing/{uid}, which firestore.rules gives no client access to:
// written only here and by app/api/stripe/webhook, read by the app through
// /api/plan. Server-only (admin SDK).

import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebaseAdmin";
import { logEvent } from "@/lib/analytics";
import { isCityId } from "@/lib/cities";
import { isLocale } from "@/lib/i18n";
import { FREE_PER_MONTH, REFERRAL_DAYS, TRIAL_DAYS, type Plan } from "@/lib/planConfig";
import { ensureReferralCode, referrerFor, rewardReferrer } from "@/lib/referral";

export { FREE_PER_MONTH, TRIAL_DAYS, type Plan };

export type SubscriptionStatus = "active" | "trialing" | "past_due" | "canceled";

export interface Billing {
  trialEndsAt: string; // ISO
  subscriptionStatus?: SubscriptionStatus;
  // The currency they pay in (Stripe), for the invite credit (lib/referral.ts).
  currency?: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  usage?: { month: string; count: number };
  referralCode?: string;
  referredBy?: string;
  referrals?: number;
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

/**
 * Where a new account came from (`source`, the ittsui_src cookie set by
 * middleware.ts): the city page, language and campaign. Only counted, in an
 * account_created event with no identifier, never stored with the account.
 */
async function countNewAccount(source: string | undefined, referred: boolean): Promise<void> {
  const params = new URLSearchParams(source ?? "");
  const city = params.get("city");
  const lang = params.get("lang");
  const tag = (value: string | null) => (value ? value.replace(/[^\w.-]/g, "").slice(0, 40) || null : null);
  await logEvent("account_created", {
    city: isCityId(city) ? city : null,
    lang: isLocale(lang) ? lang : null,
    utmSource: tag(params.get("utm_source")),
    utmCampaign: tag(params.get("utm_campaign")),
    referred,
  });
}

/**
 * The person's billing doc, created with a fresh trial the first time. A
 * valid invite code at that moment (`invite`, from the ittsui_ref cookie)
 * adds REFERRAL_DAYS and rewards the person who shared it.
 */
export async function getBilling(uid: string, invite?: string, source?: string): Promise<Billing> {
  const ref = billingRef(uid);
  const snap = await ref.get();
  if (snap.exists) return snap.data() as Billing;
  const referrer = invite ? await referrerFor(invite, uid) : null;
  const days = TRIAL_DAYS + (referrer ? REFERRAL_DAYS : 0);
  const trialEndsAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
  // create() fails if a concurrent first call got there first: read theirs.
  const created = await ref
    .create({ trialEndsAt, createdAt: new Date().toISOString(), ...(referrer ? { referredBy: referrer } : {}) })
    .then(() => true)
    .catch(() => false);
  if (created && referrer) await rewardReferrer(referrer).catch((err) => console.error("referral: reward failed", err));
  if (created) await countNewAccount(source, Boolean(referrer));
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
  const common = {
    trialEndsAt: billing.trialEndsAt,
    month,
    used,
    manageable: Boolean(billing.stripeCustomerId),
    referralCode: billing.referralCode ?? null,
    referrals: billing.referrals ?? 0,
  };
  if (legacyPlus || (billing.subscriptionStatus && PLUS_STATUSES.includes(billing.subscriptionStatus))) {
    return { tier: "plus", ...common, limit: null, canCreate: true };
  }
  if (now < new Date(billing.trialEndsAt)) return { tier: "trial", ...common, limit: null, canCreate: true };
  return { tier: "free", ...common, limit: FREE_PER_MONTH, canCreate: used < FREE_PER_MONTH };
}

/** `invite` and `source` only matter the first time (see getBilling). */
export async function getPlan(uid: string, invite?: string, source?: string): Promise<Plan> {
  const [billing, legacy] = await Promise.all([getBilling(uid, invite, source), hasLegacyPlus(uid)]);
  const referralCode = await ensureReferralCode(uid, billing.referralCode);
  return planOf({ ...billing, referralCode }, legacy);
}

/** The invite code to put on someone's rendez-vous (the guest's "your turn"). */
export async function referralCodeOf(uid: string): Promise<string> {
  const billing = await getBilling(uid);
  return ensureReferralCode(uid, billing.referralCode);
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
export async function setSubscription(uid: string, fields: Partial<Pick<Billing, "subscriptionStatus" | "stripeCustomerId" | "stripeSubscriptionId" | "currency">>): Promise<void> {
  await billingRef(uid).set(fields, { merge: true });
}

/** The uid whose billing doc holds this Stripe subscription, if any. */
export async function uidForSubscription(subscriptionId: string): Promise<string | null> {
  const snap = await adminDb.collection("billing").where("stripeSubscriptionId", "==", subscriptionId).limit(1).get();
  return snap.empty ? null : snap.docs[0].id;
}
