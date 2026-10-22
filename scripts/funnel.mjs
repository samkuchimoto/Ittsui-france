// scripts/funnel.mjs — `npm run funnel -- 30`
// Ittsui's funnel by city and language for the last N days (30 by default):
// landing views, accounts, requests sent and accepted, rituals, paying
// people, from the events collection (lib/analytics.ts) and billing docs.
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

const billing = (await db.collection("billing").get()).docs.map((d) => d.data());
const now = new Date();
show("Accounts, all time, by plan", count(billing, (b) => (b.subscriptionStatus === "active" ? `Plus (${b.currency ?? "EUR"})` : new Date(b.trialEndsAt) > now ? "trial" : "free")));
show("New accounts in the period", count(billing.filter((b) => (b.createdAt ?? "") >= since), (b) => (b.referredBy ? "invited" : "direct")));
process.exit(0);
