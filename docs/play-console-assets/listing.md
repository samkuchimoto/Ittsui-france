# Play Store listing copy (draft — for review, not final)

Written to match what the app actually does today (per `AGENTS.md` and the live product), not
aspirational marketing. Treat as a first draft to paste into Play Console and edit, not
copy-paste-final.

## App name

**Ittsui** (8 characters — Play Store's limit is 30, plenty of room, but the brand name alone
reads cleaner than a padded "Ittsui — rituel de couple" style title, which Play increasingly
treats as keyword-stuffing).

## Short description (max 80 characters)

> Un rituel hebdomadaire pour préserver vos relations proches, sans effort.

(74 characters.)

## Full description (max 4000 characters)

> Ittsui vous aide à préserver ce qui compte : le temps passé avec les personnes qui vous sont
> chères. Chaque semaine, Ittsui vous propose un moment simple à partager — un café, une
> promenade, un dîner — adapté à votre relation et à vos disponibilités.
>
> Comment ça marche :
> • Invitez la personne avec qui vous voulez maintenir ce rituel
> • Chaque semaine, recevez une proposition de moment à partager
> • Confirmez ensemble, et profitez du moment
>
> Envie de retrouver quelqu'un en dehors du rituel hebdomadaire ? Ajoutez-le à vos contacts et
> envoyez-lui une demande de rendez-vous ponctuelle — un lieu, une adresse, une date, une heure.
> Il ou elle reçoit un e-mail, se connecte, et accepte en un geste. Ce n'est pas une messagerie :
> juste de quoi se retrouver, sans le bruit des réseaux sociaux.
>
> Ittsui reste volontairement simple. Pas de flux infini, pas de notifications incessantes, pas
> de mécaniques de dépendance. Un rituel, chaque semaine, pour ne pas laisser le quotidien
> éroder ce qui compte vraiment.
>
> Gratuit pour toujours pour le rituel de base.
>
> Vos données restent liées à votre compte, jamais revendues, jamais utilisées pour de la
> publicité ciblée. Détails complets : https://www.ittsui.fr/confidentialite

(~1000 characters — well under the 4000 limit; expand with real screenshots' context once
available rather than padding with filler. Updated 2026-08-24 to mention the ad-hoc
contacts/meeting-request feature added that day — the previous draft only described the
recurring weekly-Pair ritual, which by itself no longer matched what the app actually does; the
"clearly disclose principal functions" requirement in Google's Software Principles is exactly why
this needed updating, not just a nice-to-have.)

## Category

**Lifestyle** (Play Console's closest fit — not Social, since this isn't a social network/feed
product; not Dating, since it's for any close relationship, not romantic pairing specifically).
Confirm this against Play Console's current category list at submission time, not this document.

## Tags / keywords (for Play's search, not a visible field)

relations, couple, famille, amis, rituel, temps de qualité, rendez-vous

## Terms of Service URL

`https://www.ittsui.fr/conditions-utilisation` — added 2026-08-24. Google's Unwanted Software
Policy explicitly requires an EULA/Terms of Service link (confirmed by reading that policy
directly, not assumed); this app had none anywhere until this page. Play Console's app content
section may ask for this URL alongside the privacy policy one.

## Contact email / support URL

**Corrected 2026-08-24 — this was stale.** A real, working contact address already exists:
`hello@ittsui.fr` (verified in Resend, already live in `app/mentions-legales/page.tsx` and every
transactional email this app sends). Play Console's "Contact details" section can use this
directly; no new address needed.

The actual remaining blocker is narrower than this section used to claim: `mentions-legales`'s
`[À COMPLÉTER]` markers are specifically the **legal entity fields** — publisher name/legal
status, SIRET (if applicable), registered address, and the publication director's name. These are
deliberately left blank rather than fabricated (see that file's own comment) since a made-up
business identity would be worse than an honest gap — only the real account owner can fill these
in with actual registered details (or their own name + address if operating as an individual).
Google Play Console's own developer account registration asks for similar legal/developer
identity information, so this is worth resolving as part of that enrollment step, not a separate
task afterward.
