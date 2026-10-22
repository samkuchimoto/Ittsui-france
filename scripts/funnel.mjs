// scripts/funnel.mjs — `npm run funnel -- 30`
// Ittsui's funnel by city and language for the last N days (30 by default):
// landing views, accounts, requests sent and accepted, rituals, the free
// month used up, checkouts and payments, venue commitments and verified
// visits, from the events collection (lib/analytics.ts), billing docs and
// venue applications.
// Counts only: prints no person, email or id. Needs the Firebase service
// account in firebase-key.json (gitignored, never committed).

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const ROOT = resolve(dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1")), "..");
const db = getFirestore(initializeApp({ credential: cert(JSON.parse(readFileSync(resolve(ROOT, "firebase-key.json"), "utf8"))) }));
const days = Number(process.argv[2] || 30);
const since = new Date(Date.now() - days * 864e5).toISOString();

const count = (items, keyOf) => items.reduce((acc, item) => ((acc[keyOf(item)] = (acc[keyOf(item)] || 0) + 1), acc), {});
function show(title, counts) {
  const rows = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  console.log(`\n${title}: ${rows.reduce((n, [, v]) => n + v, 0)}`);
  for (const [key, value] of rows) console.log(`  ${key.padEnd(44)} ${value}`);
}
// One equality filter, the period in code: name + ts would need a composite index.
const events = async (name) =>
  (await db.collection("events").where("name", "==", name).get()).docs.map((d) => d.data()).filter((e) => e.ts >= since);
const where = (e) => `${e.city ?? e.cityId ?? "(before cities)"} / ${e.lang ?? "?"}`;

console.log(`Ittsui, last ${days} days (since ${since.slice(0, 10)})`);
const views = await events("landing_view");
show("City page views (city / language)", count(views, where));
show("City page views by campaign (utm_source / utm_campaign)", count(views, (e) => `${e.utmSource ?? "-"} / ${e.utmCampaign ?? "-"}`));
show(
  "Accounts created (first city page / language)",
  count(await events("account_created"), (e) => `${e.city || "(no city page)"} / ${e.lang ?? "?"}${e.utmSource ? ` · ${e.utmSource}` : ""}${e.referred ? " · invited" : ""}`),
);
show("Rendez-vous requests sent (city / language)", count(await events("custom_rendezvous_created"), where));
show("Requests accepted (city / language)", count((await events("custom_rendezvous_responded")).filter((e) => e.response === "accepted"), where));
show("Weekly rituals started (city / language)", count(await events("invite_activated"), where));
show("Weekly proposals sent (city)", count(await events("proposal_shown"), (e) => e.cityId ?? "(before cities)"));
show("Weeks confirmed", count(await events("week_confirmed"), () => "all cities"));

// Willingness to pay: the free month used up, then a checkout, then a payment.
show("Free month used up (request refused / ritual week skipped)", count(await events("plan_limit_reached"), (e) => `${e.source} · ${e.cityId ?? "?"} / ${e.lang ?? "-"}`));
show("Plus checkouts opened (currency / language · plan)", count(await events("checkout_started"), (e) => `${e.currency} / ${e.lang} · ${e.tier}`));
show("Plus subscriptions paid (currency)", count(await events("subscription_started"), (e) => e.currency ?? "?"));
show("Plus subscriptions ended (currency)", count(await events("subscription_ended"), (e) => e.currency ?? "?"));

// Venue pilot (lib/venuePilot.ts): an application is not a partnership, a
// confirmed visit is not a verified one, a verified one is not cash.
const venues = (await db.collection("venuePartnerApplications").get()).docs;
show(
  "Venue applications, all time (city / status / terms)",
  count(venues.map((d) => d.data()), (a) => `${a.cityId ?? "(no city)"} / ${a.status} / ${a.pilotTermsAcceptedAt ? "terms accepted" : "no yes to terms"}`),
);
const visits = [];
for (const d of venues) for (const v of (await d.ref.collection("visits").get()).docs) visits.push({ ...v.data(), cityId: d.data().cityId });
show("Partner visits in the period (city / confirmed or verified)", count(visits.filter((v) => (v.createdAt ?? "") >= since), (v) => `${v.cityId ?? "(no city)"} / ${v.status === "visited" ? "verified" : v.status}`));

const billing = (await db.collection("billing").get()).docs.map((d) => d.data());
const now = new Date();
show("Accounts, all time, by plan", count(billing, (b) => (b.subscriptionStatus === "active" ? `Plus (${b.currency ?? "EUR"})` : new Date(b.trialEndsAt) > now ? "trial" : "free")));
show("New accounts in the period", count(billing.filter((b) => (b.createdAt ?? "") >= since), (b) => (b.referredBy ? "invited" : "direct")));
process.exit(0);
