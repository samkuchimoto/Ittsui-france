# SEO, Ittsui Partenaires, Early Access & "Envoyer un geste" — operating guide

Walkthrough for the three fronts built this session (SEO fixes, the Ittsui Partenaires
marketplace, early-access signups) plus the new gift-gesture feature, and what a fuller
version of the gift feature would actually require. Every external claim below was checked
against the provider's own current documentation on 2026-08-27, not written from memory —
this doc exists specifically because an earlier plan (courier APIs + Amazon) turned out to
rest on capabilities those providers don't actually expose to a project at Ittsui's stage;
see the "Gifting" section for the corrected picture.

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

## 4. "Envoyer un geste" (the gift feature) — what shipped and what a fuller version needs

**What's live today:** a deliberately honest v1. Someone fills in a recipient + picks a
category (repas / objet / fleurs / autre) at `/cadeau/nouveau`, Ittsui records it, notifies
the recipient by email or a shareable link (`/cadeau/[giftId]`), and then hands the *sender*
a real link to Uber Eats, Amazon's search, or Interflora to actually finish the gesture
themselves. Ittsui never claims to have purchased, shipped, or tracked anything — `status` on
a `GiftGesture` is only ever `"sent"`, because that's the only thing actually true.

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
  point A to point B — it doesn't help pick or pay for the gift itself, and per-trip courier
  cost (roughly €7–15 in Paris) can exceed the value of a small gesture.
  [help.stuart.com/en/articles/7007518-getting-started-with-the-stuart-api](https://help.stuart.com/en/articles/7007518-getting-started-with-the-stuart-api)

**The one option that actually matches the ambition** is **Goody**'s Commerce/Automation API
— it's purpose-built for exactly this ("someone sends a gift without needing the recipient's
address; the recipient supplies shipping when they open the link"), which is architecturally
very close to how `/cadeau/[giftId]` already works today, just without Ittsui itself handling
catalog or fulfillment.
[developer.ongoody.com/introduction/overview](https://developer.ongoody.com/introduction/overview)
This is the one worth prototyping first if/when the deep-link v1 shows real usage — it needs
a Goody business account (their own signup, not something I can request on your behalf), but
no courier/merchant partnership beyond that.

**Recommended sequencing**, in order of what's real and available now:
1. Ship v1 as-is (done) and see whether people actually use "envoyer un geste" at all — it
   costs nothing extra to find out.
2. If it gets used, integrate Goody's API for the "objet" category specifically — real
   catalog, real fulfillment, no logistics for Ittsui to own.
3. Delivery-of-an-object-you-already-have (Stuart) is a distinct, smaller feature from
   gifting-a-purchased-object — worth its own validation later, not bundled into v1.
4. Skip Amazon/Deliveroo/Uber Direct as direct integrations; none of them offer the
   order-on-someone's-behalf primitive this feature actually needs.
