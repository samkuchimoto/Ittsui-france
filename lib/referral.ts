// /lib/referral.ts
// "Invite someone: you both get a month of Plus" (2026-10-22).
//   - Everyone has a code (billing/{uid}.referralCode, mapped back in
//     referralCodes/{code}); their link is the home page with ?ref=CODE,
//     which middleware.ts keeps in the ittsui_ref cookie for 30 days.
//   - A new account created with a valid code (lib/plan.ts's getBilling)
//     starts with REFERRAL_DAYS more of Plus, and its referrer gets a month:
//     REFERRAL_DAYS added to their trial if they don't pay, or a 4,99 €
//     credit on their next Stripe invoice if they do.
//   - Not oneself, once per new account (a billing doc is created once),
//     and at most MAX_REFERRAL_REWARDS months per referrer.
// Both collections are server-only (no client rules in firestore.rules).

import { randomInt } from "crypto";
import { adminDb } from "@/lib/firebaseAdmin";
import { stripe } from "@/lib/stripe";
import { PLUS_PRICE, REFERRAL_DAYS, type PlanCurrency } from "@/lib/planConfig";

export const MAX_REFERRAL_REWARDS = 12;
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O, 1/I
const DAY = 24 * 60 * 60 * 1000;

export function isReferralCode(value: unknown): value is string {
  return typeof value === "string" && /^[A-HJ-NP-Z2-9]{6}$/.test(value);
}

/** The person's code, made the first time it's needed. */
export async function ensureReferralCode(uid: string, existing?: string): Promise<string> {
  if (existing) return existing;
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = Array.from({ length: 6 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
    const created = await adminDb
      .collection("referralCodes")
      .doc(code)
      .create({ uid, createdAt: new Date().toISOString() })
      .then(() => true)
      .catch(() => false); // taken: try another
    if (created) {
      await adminDb.collection("billing").doc(uid).set({ referralCode: code }, { merge: true });
      return code;
    }
  }
  throw new Error("referral: no free code after 5 attempts");
}

/** Who a code belongs to, if it's valid and not the new account's own. */
export async function referrerFor(code: unknown, newUid: string): Promise<string | null> {
  if (!isReferralCode(code)) return null;
  const uid: string | undefined = (await adminDb.collection("referralCodes").doc(code).get()).data()?.uid;
  return uid && uid !== newUid ? uid : null;
}

/** The referrer's month: more Plus time, or a credit if they already pay. */
export async function rewardReferrer(uid: string): Promise<void> {
  const ref = adminDb.collection("billing").doc(uid);
  const credit = await adminDb.runTransaction(async (tx) => {
    const data = (await tx.get(ref)).data() ?? {};
    const referrals: number = data.referrals ?? 0;
    if (referrals >= MAX_REFERRAL_REWARDS) {
      tx.set(ref, { referrals: referrals + 1 }, { merge: true });
      return null;
    }
    if (data.subscriptionStatus === "active" && data.stripeCustomerId) {
      tx.set(ref, { referrals: referrals + 1 }, { merge: true });
      return { customer: data.stripeCustomerId as string, currency: ((data.currency as string) ?? "EUR") as PlanCurrency };
    }
    const from = Math.max(Date.now(), data.trialEndsAt ? new Date(data.trialEndsAt).getTime() : 0);
    tx.set(ref, { referrals: referrals + 1, trialEndsAt: new Date(from + REFERRAL_DAYS * DAY).toISOString() }, { merge: true });
    return null;
  });
  if (credit) {
    // A month of Plus in the currency they pay in.
    await stripe.customers.createBalanceTransaction(credit.customer, {
      amount: -(PLUS_PRICE[credit.currency] ?? PLUS_PRICE.EUR),
      currency: (PLUS_PRICE[credit.currency] ? credit.currency : "EUR").toLowerCase(),
      description: "Ittsui Plus : un mois offert (parrainage)",
    });
  }
}
