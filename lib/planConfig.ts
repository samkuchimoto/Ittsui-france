// /lib/planConfig.ts
// The plan's numbers and its shape, shared by the server (lib/plan.ts) and
// the app (lib/planClient.ts, app/components/PlanCard.tsx). No server
// imports here: this file ships to the browser.

export const TRIAL_DAYS = 14;
export const FREE_PER_MONTH = 1;
/** As written in the app and on the site; the amount itself is the Stripe Price (STRIPE_PLUS_PRICE_ID). */
export const PLUS_PRICE_LABEL = { fr: "4,99 €", en: "€4.99", ja: "4.99ユーロ" } as const;
/** What the Stripe Price must be, checked at checkout: 4,99 € a month. */
export const PLUS_PRICE_CENTS = 499;
/** A referral's month of Plus, for both people (lib/referral.ts). */
export const REFERRAL_DAYS = 30;
/** The Stripe promotion code for the first 100 members: -50 % for 3 months. */
export const FOUNDING_CODE = "FONDATEUR";

export interface Plan {
  tier: "plus" | "trial" | "free";
  trialEndsAt: string;
  month: string;
  used: number;
  /** null with Plus or during the trial. */
  limit: number | null;
  canCreate: boolean;
  /** Has a Stripe customer, so the billing portal can open. */
  manageable: boolean;
  /** Their invite code (lib/referral.ts), and how many people joined with it. */
  referralCode: string | null;
  referrals: number;
}
