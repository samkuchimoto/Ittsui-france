// /lib/analytics.ts
// The only instrumentation in this app — a flat server-side event log,
// added because a 2026-08-28 audit found zero analytics of any kind
// anywhere in the codebase, making "does Ittsui cause people to spend
// more meaningful time together?" unanswerable from real data. Deliberately
// NOT a third-party analytics SDK (Firebase Analytics/GA4, PostHog, etc.):
// the events worth tracking here are relationship-specific actions that
// already happen server-side inside app/api/** (a proposal generated, a
// week confirmed, an invite activated), not generic page views, so a
// plain Firestore collection written from the same admin SDK already in
// use is less machinery than wiring up a client-side SDK for something
// server-side code already knows.
//
// Fire-and-forget by design, matching the notificationLog best-effort
// pattern already used in weekly-propose/rsvp: losing an analytics write
// must never fail or slow down the real action it's describing.

import { adminDb } from "@/lib/firebaseAdmin";

export type AnalyticsEvent =
  | "proposal_shown"
  | "rsvp_response"
  | "week_confirmed"
  | "custom_rendezvous_created"
  | "custom_rendezvous_responded"
  | "invite_activated"
  | "gesture_sent"
  // A city landing page seen (app/api/landing-view), and a new account with
  // the city page or campaign it first came through: no identifier in either.
  | "landing_view"
  | "account_created"
  // Willingness to pay: the free month's rendez-vous used up (a request
  // refused, or a ritual week skipped), a Plus checkout opened, a
  // subscription paid for, a subscription gone.
  | "plan_limit_reached"
  | "checkout_started"
  | "subscription_started"
  | "subscription_ended";

/** Returns the write, for the rare caller whose whole job it is (it never rejects). */
export function logEvent(name: AnalyticsEvent, properties: Record<string, string | number | boolean | null> = {}): Promise<void> {
  return adminDb
    .collection("events")
    .add({ name, ts: new Date().toISOString(), ...properties })
    .then(() => undefined)
    .catch((err) => console.error(`analytics: failed to log "${name}"`, err));
}
