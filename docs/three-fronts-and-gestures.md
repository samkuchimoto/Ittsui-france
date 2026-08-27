# SEO, Ittsui Partenaires, Early Access & "Envoyer un geste" — operating guide

Walkthrough for the three fronts built this session (SEO fixes, the Ittsui Partenaires
marketplace, early-access signups) plus the new relationship-action ("geste") feature, and
what a fuller version of it would actually require. Every external claim below was checked
against the provider's own current documentation on 2026-08-27, not written from memory —
this doc exists specifically because an earlier plan (courier APIs + Amazon) turned out to
rest on capabilities those providers don't actually expose to a project at Ittsui's stage;
see the "Envoyer un geste" section for the corrected picture.

## 1. Ittsui Partenaires — reviewing and approving venue applications

There is no admin UI yet — the review/approval pipeline is two `CRON_SECRET`-protected API
routes, called directly. `CRON_SECRET` is the same env var already used by
`/api/admin/migrate`.

**See pending applications:**
```
curl -H "Authorization: Bearer $CRON_SECRET" https://www.ittsui.fr/api/admin/venue-partners
```
Returns every `venuePartnerApplications` doc, newest first, including `status`
(`pending_review` / `active` / `rejected`).

**Approve one** (generates its manage-link token and emails the venue contact):
```
curl -X POST -H "Authorization: Bearer $CRON_SECRET" \
  https://www.ittsui.fr/api/admin/venue-partners/<id>/approve
```
The response includes `manageUrl` — the same link the venue receives by email, in case you
want to hand it to them directly instead. Calling this twice on an already-active venue is
safe (it just returns the existing link again, doesn't regenerate the token).

There's no reject endpoint yet — leaving an application at `pending_review` is the current
way to not approve it. Worth building a real `rejected`-status endpoint once you've actually
turned someone down and want to record why; not built speculatively.

**See early-access signups**, same auth pattern:
```
curl -H "Authorization: Bearer $CRON_SECRET" https://www.ittsui.fr/api/admin/early-access
```

## 2. SEO — Google Search Console

`robots.txt` and `sitemap.xml` now exist and are correct (verified live, not just in code) —
what's still outstanding is telling Google about them, which is a step only you can do since
it requires proving ownership of the domain.

1. Go to [search.google.com/search-console](https://search.google.com/search-console) and
   add a property for `https://www.ittsui.fr` (use the "Domain" property type if you can add
   a DNS TXT record via your registrar — it covers `www` and non-`www` and all subpaths in
   one verification, rather than the "URL prefix" type which only covers the exact host you
   type).
2. Once verified, go to **Sitemaps** in the left nav and submit `sitemap.xml` (just that
   filename — Search Console appends it to the property's root).
3. Use **URL Inspection** on `https://www.ittsui.fr/` and click **Request Indexing** — this
   is what actually gets a young, lightly-crawled domain looked at sooner than waiting for
   Google's own crawl schedule, which is the likely reason a phone search turned up nothing
   yet (a domain this new having zero index coverage is normal, not a sign of a broken site —
   confirmed via direct `curl` that the site itself serves correctly).

Nothing above needs a code change on my end — it's a one-time manual verification step tied
to your Google account/domain ownership.

## 3. Early access — already live

`/api/early-access` (public POST) and the form on the homepage are done and deployed. Signups
land in Firestore's `earlyAccessSignups` collection, keyed by email for natural dedup. See
section 1 above for how to read the list.

## 4. "Envoyer un geste" — what shipped and what a fuller version needs

Named `Gesture`/`GestureMode` in code, not "Gift" — a direct 2026-08-27 naming correction: this
sits alongside a café or a walk as one of several ways to act on a relationship, not a gift
shop, and "geste" is already the exact word every bit of French UI copy for it uses.

**What's live today** follows the framing the multi-AI review converged on hardest: this
is "send something," one relationship action alongside a café or a walk — not a shop. At
`/geste/nouveau` (surfaced as an equal-weight tab next to `/request/new`, on the homepage
hero, and as a real button on the dashboard — not a link buried in small text, per direct
2026-08-27 feedback that it existed but nobody could find it) the sender picks one of five
modes, not a product category:

- **🎁 Quelque chose que vous avez** — something the sender already owns (a book, an object
  with history). Zero API, zero delivery arrangement: Ittsui only notifies the recipient;
  getting the object to them is the sender's own problem, exactly as it would be without this
  feature. This is the mode every reviewer flagged as the most emotionally distinct from
  "I bought you something" — deliberately kept that way rather than routed through a courier
  API it doesn't need yet (see the Stuart note below for when that might change).
- **🛍️ Quelque chose à choisir** — a small, curated list of gesture *types* (fleurs, livre,
  chocolat, plante, bougie, papeterie, repas — `lib/gestureLinks.ts`), plus a free-text **Autre**
  option (`customItem`) so a real gesture never has to be forced into one of the seven fixed
  buckets. Each fixed type links to one real merchant homepage to finish it — capped at 7 on
  purpose, not an attempt at a catalog; "Autre" has no external link since there's no honest
  single merchant for an arbitrary category.
- **✨ Laissez Ittsui vous proposer** — Ittsui picks one of the seven for the sender
  (reshuffleable, never "Autre" — there's nothing to suggest when the whole point of that
  option is "you tell me"). This is genuinely just decision-load removal, the same honesty
  principle as `weekly-propose`'s venue ranking: a plain deterministic pick, never a claim that
  Ittsui knows something personal about the recipient it has no actual data for.
- **💌 Un mot doux** — no object at all, added after both a physical gesture and a pure note
  showed up as their *own* distinct relationship actions across the review, not as variants of
  each other. The zero-friction floor of the whole feature.
- **🎨 Une peinture Ittsui** — a REAL AI-generated illustration, added 2026-08-27 after direct
  feedback that the category pickers alone are "a mockup" with "no real value" behind them.
  Calls the exact same `fal-ai/fast-sdxl` endpoint already proven in
  `app/api/ai-venue-mood/route.ts`, synchronously, using the sender's optional note as the
  creative brief. Same honest-501 posture as that route: if `FAL_API_KEY` isn't configured, the
  gesture still sends (recipient still gets notified) with `paintingStatus: "failed"` and an
  honest message, never a fabricated image. The mandatory AI-disclosure badge
  ("Illustration générée par IA", same treatment as `DiscoveryGrid`'s mood tiles) is shown on
  both the recipient page and the sender's own confirmation screen.

The recipient's page (`/geste/[gestureId]`) lets them reply with how they'd actually like to
receive a physical gesture — an address, or in person next time — via a `PATCH` that's relayed
back to the sender by email if they left one. That's the one piece of real interactivity this
feature needed to not be a dead end: the sender finding out *something* happened after they
hit send, without Ittsui ever claiming it arranged delivery itself.

Ittsui never claims to have purchased, shipped, or tracked anything — `status` on a
`Gesture` is only ever `"sent"`, because that's the only thing actually true.

**Amazon is deliberately not in the curated list at all** — not just deprioritized. Every one
of the four AI reviews flagged the same risk independently: centering Amazon risks Ittsui
reading as "Amazon with friends," which fights the app's own premium/relational positioning
head-on. The curated list uses Interflora (fleurs), Uber Eats (repas), Fnac (livre), and
Nature & Découvertes (chocolat/plante/bougie/papeterie) instead — real, well-known French
merchants that fit "petites attentions" conceptually, not just technically.

This was scoped narrowly on purpose, and it's worth being explicit about why the more
ambitious version (Ittsui as a real broker to Amazon/Deliveroo/Uber, picking and paying for
the object automatically) isn't what's built, after checking what each of those platforms
actually exposes:

- **Amazon**: no live consumer-facing API lets a third-party app place an order on someone's
  behalf. The Product Advertising API is a product-lookup/affiliate-link API, not an
  order-placement one — and it's being retired in favor of Amazon's Creators API, which is
  narrower still (content/affiliate tooling, not purchasing).
  [webservices.amazon.fr/paapi5/documentation](https://webservices.amazon.fr/paapi5/documentation/)
- **Uber Direct** and **Deliveroo**'s developer platforms are real, working delivery APIs —
  but they're built for a merchant or platform that already has a catalog and a business
  agreement in place, not a generic "fetch and deliver whatever the user typed." Uber Direct's
  own docs frame it as delivery infrastructure *for businesses that already sell something*.
  [developer.uber.com/docs/deliveries/overview](https://developer.uber.com/docs/deliveries/overview)
  · [developers.deliveroo.com](https://developers.deliveroo.com/)
- **Stuart** is the closest thing to a same-city courier API usable without a huge merchant
  relationship (France-focused, has a real sandbox), but it moves a physical object from
  point A to point B — it doesn't help pick or pay for the gesture itself, and per-trip
  courier cost (roughly €7–15 in Paris) can exceed the value of a small gesture.
  [help.stuart.com/en/articles/7007518-getting-started-with-the-stuart-api](https://help.stuart.com/en/articles/7007518-getting-started-with-the-stuart-api)

**The one option that actually matches the ambition** is **Goody**'s Commerce/Automation API
— it's purpose-built for exactly this ("someone sends a gift without needing the recipient's
address; the recipient supplies shipping when they open the link"), which is architecturally
very close to how `/geste/[gestureId]` already works today, just without Ittsui itself
handling catalog or fulfillment.
[developer.ongoody.com/introduction/overview](https://developer.ongoody.com/introduction/overview)
This is the one worth prototyping first if/when the deep-link v1 shows real usage — it needs
a Goody business account (their own signup, not something I can request on your behalf), but
no courier/merchant partnership beyond that.

## 5. Real fulfillment — Tremendous and Stuart (wired 2026-08-27)

Of the providers named in the 2026-08-27 courier-integration proposal (Stuart, Sessile,
C'est Cela, Cocolis, Tremendous), two have real, verified, self-serve developer APIs — checked
against their own current docs and open-source client libraries that day, not against the
proposal's paraphrase of them. Both are now actually wired into the code, gated behind env
vars (unset = the gesture behaves exactly as the v1 above, same honest-fallback posture as
`FAL_API_KEY`):

- **Tremendous** (`lib/tremendous.ts`) — a "curated"/"suggested" gesture with a real item
  (never "autre") and a recipient email now triggers a REAL `POST /orders` call that issues an
  actual redeemable digital gift card to the recipient's inbox, verified against
  `developers.tremendous.com/reference/create-order`. This is real money once configured —
  `TREMENDOUS_GESTURE_AMOUNT_CENTS` has no built-in default specifically so the amount is
  always something a human explicitly set.
- **Stuart** (`lib/stuartCourier.ts`) — for "own"-mode gestures, the sender's pickup address
  is now collected at creation. Once the recipient replies with their own address via
  `/geste/[gestureId]`'s form, `PATCH /api/gestures/[gestureId]` calls Stuart's real
  `POST /v2/jobs` to dispatch an actual courier between the two addresses, verified against
  Stuart's own open-source `stuart-client-js`/`stuart-client-php` (their marketing/help pages
  describe the feature but don't republish the technical contract, so the source of truth here
  is the literal requests their official clients send).

**Env vars to add on Vercel** (see `.env.example` for the full comments) — nothing fires until
these exist:

| Var | Where to get it |
|---|---|
| `TREMENDOUS_API_KEY` | [tremendous.com](https://www.tremendous.com/) → Developers → API keys (sandbox first) |
| `TREMENDOUS_CAMPAIGN_ID` | `GET /campaigns` on your Tremendous account |
| `TREMENDOUS_FUNDING_SOURCE_ID` | `GET /funding_sources`, or literally `BALANCE` |
| `TREMENDOUS_GESTURE_AMOUNT_CENTS` | your call — e.g. `1000` for €10 per gesture |
| `TREMENDOUS_ENV` | `sandbox` (fake money) or `production` (real money) |
| `STUART_CLIENT_ID` / `STUART_CLIENT_SECRET` | [stuart.com/developers](https://stuart.com/developers/) sandbox signup → credentials at `admin.sandbox.stuart.com/client/api` |
| `STUART_ENV` | `sandbox` or `production` — sandbox needs a Stripe TEST card on file per Stuart's own getting-started guide |

**Sessile, C'est Cela, and Cocolis were checked and explicitly not built against**, not
skipped by oversight: Sessile and C'est Cela have no public developer API at all (checked
2026-08-27 — consumer-facing sites only, no docs, no signup flow), the same "needs an actual
business conversation first" category as Uber Direct/Deliveroo above. Cocolis does have a real
API (`doc.cocolis.fr`) but is a crowd-logistics marketplace (matching a delivery to a stranger
already driving that route) — a meaningfully different trust model from Stuart's own courier
fleet, and it doesn't map onto an existing gesture mode the way Stuart maps onto "own." Worth a
distinct future evaluation, not force-fit into this pass. Amazon/Deliveroo/Uber Direct remain
out for the technical reasons in section 4 above.
