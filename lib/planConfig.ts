// /lib/planConfig.ts
// The plan's numbers and its shape, shared by the server (lib/plan.ts) and
// the app (lib/planClient.ts, app/components/PlanCard.tsx). No server
// imports here: this file ships to the browser.

import { CITIES, type CityId } from "@/lib/cities";
import { DATE_LOCALE, type Locale } from "@/lib/i18n";

export const TRIAL_DAYS = 14;
export const FREE_PER_MONTH = 1;
/** A referral's month of Plus, for both people (lib/referral.ts). */
export const REFERRAL_DAYS = 30;
/** The Stripe promotion code for the first 100 members: -50 % for 3 months. */
export const FOUNDING_CODE = "FONDATEUR";

export type PlanCurrency = "EUR" | "USD" | "GBP" | "JPY" | "ILS" | "MXN";

/**
 * Ittsui Plus per month, in Stripe's minor units (yen has none): the Stripe
 * Price (STRIPE_PLUS_PRICE_ID) in euros, with these as its currency_options.
 * Checkout refuses a currency whose Stripe amount differs: the price shown
 * is the price charged.
 */
export const PLUS_PRICE: Record<PlanCurrency, number> = { EUR: 499, USD: 499, GBP: 399, JPY: 800, ILS: 1990, MXN: 9900 };
export const PLAN_CURRENCIES = Object.keys(PLUS_PRICE) as PlanCurrency[];

/** Without a known city, the language's own currency; English means euros. */
const LANG_CURRENCY: Record<Locale, PlanCurrency> = { fr: "EUR", en: "EUR", ja: "JPY", es: "MXN", he: "ILS" };

/** The currency and its label for someone: their meeting city's (lib/cities.ts) when known, else their language's. */
export function plusOffer(lang: Locale, cityId?: CityId | null): { currency: PlanCurrency; label: string } {
  const city = cityId ? CITIES[cityId] : null;
  const currency = city ? city.currency : LANG_CURRENCY[lang];
  const locale = city && city.langs.includes(lang) ? city.locale : DATE_LOCALE[lang];
  return { currency, label: plusPriceLabel(currency, locale) };
}

export function plusPriceLabel(currency: PlanCurrency, locale: string): string {
  const minor = PLUS_PRICE[currency];
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: currency === "JPY" ? 0 : 2,
  }).format(currency === "JPY" ? minor : minor / 100);
}

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
