// /app/page.tsx
//
// Server Component as of 2026-08-28 — this file has no Firebase/Firestore/
// API dependencies and no hooks of its own; every piece of client-side
// interactivity (scroll-tracked header, IntersectionObserver reveals, the
// early-access form, the sandbox) lives in its own "use client" component
// under app/components/, so this file only ever composes static,
// server-rendered prose plus those imported islands.
//
// ---------------------------------------------------------------------
// Rewritten against real tester feedback, quoted verbatim below.
//
//   "C'est quoi"                     "Le nom ne lui parle pas"
//   "Site de rencontre, il sait      "L'explication n'est pas dans
//    ce que c'est"                    le nom, en dessous de ça il faut"
//   "Image not clikable"             "Mascot misleading as products"
//   "Adress not / Je rentre"         "Curiosité, il veut savoir"
//   "Deux types: ceux qui vont vers le site, un autre qui juste browsing"
//   "L'appli qui doit lui dire c'est quoi sans chercher"
//   "En moins de trois secondes il sait de quoi il s'agit"
//   "En naviguant au lieu de naviguer c'est la confirmation, càd satisfaire"
//
// Four structural changes came out of that:
//
// 1. Positive framing. The hero badge used to read "Pas une appli de
//    rencontre — un outil de maintien relationnel". Negation makes the
//    reader picture the rejected category first, which is precisely how
//    "site de rencontre" kept sticking. The badge now says who this is
//    for, and the H1 says what happens, in one sentence of plain French.
//
// 2. The sandbox is the hero visual. A decorative stock photo sat here
//    and answered nothing when tapped. Someone who is "juste browsing"
//    now meets a working proposal card in the first screen, with no
//    scrolling and no signup — the fastest honest answer to "c'est quoi".
//
// 3. One concrete question for the high-intent visitor: "Avec qui
//    voulez-vous bloquer un moment ?" replaces the abstract "Protéger
//    mes relations" button, and the answer is carried into setup.
//
// 4. Every surface that looks tappable now is. Duo tiles reconfigure the
//    card, the venue opens its real address and a map link, the gesture
//    tiles expand to the real catalogue.
//
// The mascot's removal from the header is a Zone 0 decision only — see
// HeaderNav.tsx's comment. The cast stays everywhere in-product.
// ---------------------------------------------------------------------

import Link from "next/link";
import { Fraunces, Work_Sans } from "next/font/google";
import { INK, MUTED, ACCENT, BORDER, CREAM } from "@/lib/theme";
import { HeaderNav } from "@/app/components/HeaderNav";
import { Reveal } from "@/app/components/Reveal";
import { EarlyAccessForm } from "@/app/components/EarlyAccessForm";
import { DuoSandbox } from "@/app/components/DuoSandbox";
import { AmbientHeroVideo } from "@/app/components/AmbientHeroVideo";
import { GestureTiles } from "@/app/components/GestureTiles";
import { StartRitualField } from "@/app/components/StartRitualField";
import { IconArrowRight, IconCheck, IconSparkles, IconCalendarX } from "@/app/components/HomeIcons";
import { MascotAvatar } from "@/app/components/MascotAvatar";

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["300", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
});

const workSans = Work_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-body",
  display: "swap",
});

// The real competitor is not another app — it's the default habit of
// negotiating a date across a messaging thread. Naming that comparison
// explicitly is the only way a visitor can judge whether Ittsui is
// worth the switch; "plus simple" on its own means nothing next to a
// tool they already have and trust.
const VERSUS = [
  {
    dimension: "Trouver une date",
    whatsapp: "« On se voit quand ? » · « T'es libre quel jour ? » · relance trois jours plus tard",
    ittsui: "Un jour et une heure déjà choisis, une fois pour toutes, à la configuration.",
  },
  {
    dimension: "Trouver un lieu",
    whatsapp: "Chercher un café, vérifier les horaires, envoyer trois liens, attendre un avis",
    ittsui: "Une adresse réelle proposée pour vous, avec une alternative si elle ne va pas.",
  },
  {
    dimension: "Ce que ça demande à l'autre",
    whatsapp: "Participer à toute la négociation",
    ittsui: "Ouvrir un lien et toucher « Je viens ». Aucun compte, aucune application.",
  },
  {
    dimension: "Après",
    whatsapp: "Le fil continue, les notifications aussi",
    ittsui: "Silence total jusqu'au jour J.",
  },
];

export default function Home() {
  return (
    <main
      className={`${fraunces.variable} ${workSans.variable} min-h-screen bg-[#FFFDF9] antialiased`}
      style={{ color: INK }}
    >
      <HeaderNav />

      {/* Hero — the copy on the left, a working demonstration on the
          right, both on the first screen at lg: and stacked in that order
          on mobile.

          The ambient footage is a background layer on this section, not a
          card inside it: the sandbox has to stay the only thing that looks
          tappable. See AmbientHeroVideo.tsx. `relative` here is what the
          absolutely-positioned layer anchors to; `isolate` keeps the
          stacking context local so the sticky header is unaffected. */}
      <section className="relative isolate -mt-[68px] flex min-h-[86vh] items-center overflow-hidden px-6 pb-16 pt-[104px] sm:pb-24 lg:min-h-[92vh]">
        <AmbientHeroVideo />
        <div className="relative mx-auto max-w-6xl lg:grid lg:grid-cols-2 lg:items-center lg:gap-12">
          <Reveal className="mx-auto max-w-xl text-center lg:mx-0 lg:max-w-none lg:text-left">
            <span
              className="inline-flex items-center rounded-full px-3.5 py-1.5 text-xs font-medium"
              style={{
                backgroundColor: "rgba(255,253,249,0.10)",
                color: CREAM,
                border: "1px solid rgba(255,253,249,0.22)",
                backdropFilter: "blur(6px)",
              }}
            >
              Pour vos proches, votre partenaire et vos ami(e)s qui comptent déjà
            </span>
            {/* Sized down at the small end of the clamp on purpose: at
                2.25rem this headline ran four lines on a 390px screen and
                pushed the interactive card entirely off the first screen,
                which is the one thing this rewrite exists to prevent. */}
            <h1
              className="mt-3.5 leading-[1.08]"
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 500,
                fontSize: "clamp(2rem, 4.8vw, 3.75rem)",
                color: CREAM,
                textShadow: "0 1px 30px rgba(12,10,9,0.55)",
              }}
            >
              Un rendez-vous par semaine avec les personnes qui comptent.
            </h1>
            <p
              className="mx-auto mt-4 max-w-md text-[15px] sm:text-[17px] lg:mx-0"
              style={{ color: "rgba(255,253,249,0.82)", textShadow: "0 1px 18px rgba(12,10,9,0.5)" }}
            >
              Ittsui choisit le lieu et l&apos;horaire. Vous validez en 1 clic. Votre invité(e) n&apos;a besoin
              d&apos;aucune application, ni même d&apos;un compte.
            </p>

            <div className="mx-auto mt-5 max-w-md sm:mt-7 lg:mx-0">
              <StartRitualField onDark />
            </div>

            {/* Two lower-commitment entry points, kept as one quiet row.
                Real feedback drove adding both: a way in for someone not
                ready for a standing weekly ritual, and "envoyer un geste"
                existing but being undiscoverable outside the dashboard. */}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-sm lg:justify-start">
              <Link href="/request/new" className="underline underline-offset-4" style={{ color: "rgba(255,253,249,0.78)" }}>
                Proposer un rendez-vous ponctuel
              </Link>
              {/* Hidden where the row wraps — a lone middot stranded at
                  the end of a line reads as a typo. */}
              <span aria-hidden="true" className="hidden sm:inline" style={{ color: "rgba(255,253,249,0.35)" }}>
                ·
              </span>
              <Link href="/geste/nouveau" className="underline underline-offset-4" style={{ color: "rgba(255,253,249,0.78)" }}>
                Envoyer un geste
              </Link>
            </div>

            {/* The kanji stays, explained. Leaving 一対 as an unglossed
                graphic next to an opaque name was half of "le nom ne lui
                parle pas" — a footnote costs one line and turns it from
                a barrier into the thing that makes the name memorable. */}
            <p className="mt-4 text-xs sm:mt-6" style={{ color: "rgba(255,253,249,0.62)" }}>
              <span style={{ fontFamily: "var(--font-display)" }}>Ittsui (一対)</span> : l&apos;art d&apos;entretenir
              le lien à deux.
            </p>
          </Reveal>

          <Reveal className="mx-auto mt-8 w-full max-w-xl sm:mt-12 lg:mx-0 lg:mt-0 lg:max-w-none">
            <DuoSandbox />
          </Reveal>
        </div>
      </section>

      {/* Why not just send a text — the comparison that decides whether
          someone switches. */}
      <section className="border-t px-6 py-20 sm:py-28" style={{ borderColor: BORDER }}>
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: "clamp(1.75rem, 3.5vw, 2.5rem)" }}>
            Pourquoi pas juste un message ?
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm" style={{ color: MUTED }}>
            Caler un café avec un(e) ami(e) prend rarement un message. Il en prend douze, sur quatre jours, et
            souvent ça ne se fait pas.
          </p>
        </Reveal>

        <Reveal className="mx-auto mt-12 max-w-3xl">
          <div className="overflow-hidden rounded-3xl border bg-white" style={{ borderColor: BORDER }}>
            <div
              className="grid grid-cols-[1fr_1fr] border-b text-xs uppercase tracking-[0.12em] sm:grid-cols-[10rem_1fr_1fr]"
              style={{ borderColor: BORDER, color: MUTED }}
            >
              <div className="hidden px-5 py-3 sm:block" />
              <div className="px-5 py-3">Messagerie</div>
              <div className="px-5 py-3" style={{ color: ACCENT }}>
                Ittsui
              </div>
            </div>
            {VERSUS.map((row) => (
              <div
                key={row.dimension}
                className="grid grid-cols-[1fr_1fr] border-b text-sm last:border-b-0 sm:grid-cols-[10rem_1fr_1fr]"
                style={{ borderColor: BORDER }}
              >
                <div
                  className="col-span-2 px-5 pb-1 pt-4 text-xs font-medium sm:col-span-1 sm:py-5 sm:text-sm"
                  style={{ color: INK }}
                >
                  {row.dimension}
                </div>
                <div className="px-5 py-4 text-xs leading-relaxed sm:py-5 sm:text-sm" style={{ color: MUTED }}>
                  {row.whatsapp}
                </div>
                <div className="px-5 py-4 text-xs leading-relaxed sm:py-5 sm:text-sm" style={{ color: INK }}>
                  {row.ittsui}
                </div>
              </div>
            ))}
          </div>
        </Reveal>

        <Reveal className="mx-auto mt-8 max-w-xl">
          <div className="flex items-start gap-4 rounded-2xl border p-5" style={{ borderColor: BORDER, backgroundColor: "white" }}>
            <MascotAvatar characterId="kokoro" variant="bust" size={40} className="shrink-0" />
            <div>
              <p className="text-sm font-medium">Ce n&apos;est pas un manque d&apos;envie.</p>
              <p className="mt-1 text-sm" style={{ color: MUTED }}>
                C&apos;est la charge de travail et le manque de temps qui font perdre de vue les gens qui comptent,
                sans jamais l&apos;avoir décidé. Ittsui prend la décision à votre place chaque semaine ; vous, vous
                dites juste oui.
              </p>
            </div>
          </div>
        </Reveal>
      </section>

      {/* How it works */}
      <section className="border-t px-6 py-20 sm:py-28" style={{ borderColor: BORDER }}>
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: "clamp(1.75rem, 3.5vw, 2.5rem)" }}>
            Comment ça marche.
          </h2>
        </Reveal>

        <Reveal className="mx-auto mt-14 max-w-2xl">
          <ol className="space-y-10">
            <li className="flex gap-6">
              <span className="shrink-0" style={{ fontFamily: "var(--font-display)", fontSize: "clamp(1.5rem, 3vw, 2rem)", color: ACCENT }}>
                01
              </span>
              <div>
                <h3 className="flex items-center gap-2 text-xl" style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}>
                  1 proposition par semaine
                  <span style={{ color: MUTED }}>
                    <IconSparkles className="h-4 w-4" />
                  </span>
                </h3>
                <p className="mt-1 text-[17px]" style={{ color: MUTED }}>
                  Chaque semaine, recevez une proposition unique — un lieu réel, un horaire — prête à être validée en
                  un clic.
                </p>
                <p className="mt-2 text-sm">
                  <Link href="/request/new" className="underline underline-offset-4" style={{ color: "rgba(255,253,249,0.78)" }}>
                    Vous savez déjà quoi faire ? Proposez votre propre rendez-vous →
                  </Link>
                </p>
              </div>
            </li>
            <li className="flex gap-6">
              <span className="shrink-0" style={{ fontFamily: "var(--font-display)", fontSize: "clamp(1.5rem, 3vw, 2rem)", color: ACCENT }}>
                02
              </span>
              <div>
                <h3 className="flex items-center gap-2 text-xl" style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}>
                  Votre invité(e) répond en un geste
                  <span style={{ color: MUTED }}>
                    <IconCheck className="h-4 w-4" />
                  </span>
                </h3>
                <p className="mt-1 text-[17px]" style={{ color: MUTED }}>
                  Elle ou il reçoit un lien par SMS ou WhatsApp, voit le lieu et l&apos;heure, touche « Je viens ». Pas
                  de compte à créer, pas d&apos;application à installer, rien à négocier.
                </p>
              </div>
            </li>
            <li className="flex gap-6">
              <span className="shrink-0" style={{ fontFamily: "var(--font-display)", fontSize: "clamp(1.5rem, 3vw, 2rem)", color: ACCENT }}>
                03
              </span>
              <div>
                <h3 className="flex items-center gap-2 text-xl" style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}>
                  Puis plus rien
                  <span style={{ color: MUTED }}>
                    <IconCalendarX className="h-4 w-4" />
                  </span>
                </h3>
                <p className="mt-1 text-[17px]" style={{ color: MUTED }}>
                  Une fois le rendez-vous bloqué, silence total jusqu&apos;à la semaine suivante. Le lien se maintient
                  sans effort de mémoire.
                </p>
                <p className="mt-1 text-sm" style={{ color: MUTED }}>
                  Le droit à la déconnexion, appliqué à vos relations.
                </p>
              </div>
            </li>
          </ol>
        </Reveal>
      </section>

      {/* Early access email capture — real feature request: visible on
          the first page, not buried in a footer or a separate page. Sits
          below the mechanic rather than next to the hero, so there is
          only ever one field asking for something at a time. */}
      <section className="border-t px-6 py-16" style={{ borderColor: BORDER }}>
        <Reveal className="mx-auto max-w-md">
          <EarlyAccessForm />
        </Reveal>
      </section>

      {/* "Envoyer un geste" — a distinct relationship action alongside the
          weekly rendez-vous, given its own scroll section rather than
          staying a small link buried in the dashboard (2026-08-27: real
          feedback that the feature existed but was undiscoverable). No
          photography here on purpose — real, well-known third-party stock
          photos surfaced during art-direction research come from small
          commercial sites (a florist's own catalog shop, a gift-wrap
          tutorial blog) with no license granted to Ittsui, and this app's
          CSP/next.config.js only allowlists images.unsplash.com as a
          remote image host regardless. */}
      <section className="border-t px-6 py-20 sm:py-28" style={{ borderColor: BORDER }}>
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: "clamp(1.75rem, 3.5vw, 2.5rem)" }}>
            🎁 Envoyer une attention
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm" style={{ color: MUTED }}>
            Parce qu&apos;une relation se nourrit aussi de petites choses, pas seulement de rendez-vous.
          </p>
        </Reveal>

        <Reveal className="mt-10">
          <GestureTiles />
        </Reveal>

        <Reveal className="mt-8 text-center">
          <Link
            href="/geste/nouveau"
            className="inline-flex items-center gap-2 rounded-full border px-6 py-3 text-sm font-medium transition-transform hover:scale-[1.02]"
            style={{ borderColor: ACCENT, color: ACCENT }}
          >
            Envoyer un geste
            <IconArrowRight className="h-4 w-4" />
          </Link>
        </Reveal>
      </section>

      {/* The "why" — real origin story, not new marketing copy. Both
          quotes below are verbatim from /a-propos, not written for this
          section; the only thing new here is surfacing them on the
          homepage instead of leaving them one click away. */}
      <section className="border-t px-6 py-20 sm:py-28" style={{ borderColor: BORDER }}>
        <Reveal className="mx-auto max-w-xl text-center">
          <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: "clamp(1.75rem, 3.5vw, 2.5rem)" }}>
            Le problème n&apos;est pas l&apos;envie.
            <br />
            C&apos;est le temps.
          </h2>
          <p
            className="mx-auto mt-6 max-w-md text-[17px] italic"
            style={{ fontFamily: "var(--font-display)", color: INK }}
          >
            « Le problème, ce n&apos;est pas qu&apos;on n&apos;a pas envie de voir les gens. C&apos;est
            qu&apos;on n&apos;a pas le temps. »
          </p>
          <p className="mx-auto mt-4 max-w-sm text-sm" style={{ color: MUTED }}>
            Une phrase entendue par hasard, un soir de voyage, qui a donné à Ittsui sa forme actuelle :
            une seule proposition, une seule décision, puis plus rien à gérer jusqu&apos;à la prochaine
            fois.
          </p>
          <Link
            href="/a-propos"
            className="mt-5 inline-flex items-center gap-1.5 text-sm underline underline-offset-4"
            style={{ color: INK }}
          >
            Lire l&apos;histoire complète →
          </Link>
        </Reveal>
      </section>

      {/* Real, unedited quotes from early testers — never fabricated,
          never a star rating or a fake name. See AGENTS.md's standing
          position on this: authentic-but-anonymous beats persuasive but
          invented every time. */}
      <section className="border-t px-6 py-16 sm:py-20" style={{ borderColor: BORDER, backgroundColor: `${ACCENT}08` }}>
        <Reveal className="mx-auto max-w-2xl">
          <p className="text-center text-xs uppercase tracking-[0.14em]" style={{ color: MUTED }}>
            Premiers retours
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {[
              { quote: "C'est rapide, fluide… SMS c'est clean.", from: "Testeur parisien, 27 août 2026" },
              { quote: "Permet de trouver un contact rapidement.", from: "Testeur parisien, 27 août 2026" },
              { quote: "UI is nice… Intuitive.", from: "Étudiante américaine à Paris, 27 août 2026" },
            ].map((t) => (
              <div key={t.quote} className="rounded-xl border bg-white p-4 text-sm" style={{ borderColor: BORDER }}>
                <p aria-hidden="true" className="leading-none" style={{ fontFamily: "var(--font-display)", fontSize: "1.75rem", color: `${ACCENT}66` }}>
                  &ldquo;
                </p>
                <p className="-mt-2" style={{ color: INK }}>
                  {t.quote}
                </p>
                <p className="mt-2 text-xs" style={{ color: MUTED }}>— {t.from}</p>
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      {/* Footer CTA */}
      <section id="plus" className="border-t px-6 py-24 text-center sm:py-32" style={{ borderColor: BORDER }}>
        <Reveal className="mx-auto max-w-md">
          <span
            className="inline-flex items-center rounded-full px-3.5 py-1.5 text-xs font-medium"
            style={{ backgroundColor: `${ACCENT}1A`, color: ACCENT }}
          >
            Le lien, sans effort
          </span>
          <p
            className="mt-5"
            style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: "clamp(1.75rem, 3.5vw, 2.25rem)" }}
          >
            Offrez du temps réel aux personnes qui comptent.
          </p>
          <Link
            href="/setup"
            className="mt-8 inline-flex items-center gap-2 rounded-full px-8 py-4 text-base text-white transition-transform hover:scale-[1.02]"
            style={{ backgroundColor: ACCENT }}
          >
            Bloquer un premier moment
            <IconArrowRight className="h-4 w-4" />
          </Link>
          <p className="mt-4 text-xs" style={{ color: MUTED }}>
            Le rituel reste gratuit, pour toujours.
          </p>

          {/* Ittsui Plus — given its own real moment rather than a small
              footnote caption, per direct product/pricing feedback: lead
              with what a subscription actually protects (a specific
              relationship — family, ami, partenaire), not a vague feature
              list. €1/mois is a deliberate price point, not a placeholder.
              No fabricated feature list: "à venir" stays honest about what
              Plus doesn't concretely include yet. Links to /dashboard
              rather than starting checkout directly from this public,
              unauthenticated page: purchase is pair-scoped (see
              lib/types.ts's Pair.subscriptionStatus) and /dashboard
              already redirects to /setup on its own when nobody is signed
              in. */}
          <div className="mt-8 rounded-2xl border p-6 text-left" style={{ borderColor: BORDER, backgroundColor: "white" }}>
            <div className="flex items-baseline justify-between">
              <p className="text-sm font-semibold" style={{ color: ACCENT }}>
                Ittsui Plus
              </p>
              <p className="text-sm" style={{ color: MUTED }}>
                <span style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: "1.5rem", color: INK }}>
                  1&nbsp;€
                </span>{" "}
                / mois
              </p>
            </div>
            <p className="mt-2 text-sm" style={{ color: INK }}>
              Le prix d&apos;un café, pour ne pas perdre le lien avec votre famille, vos ami(e)s ou votre
              partenaire.
            </p>
            <p className="mt-2 text-xs" style={{ color: MUTED }}>
              Suggestions enrichies et options supplémentaires à venir — le rituel de base, lui, reste
              gratuit pour toujours, Plus ou pas.
            </p>
            <Link
              href="/dashboard"
              className="mt-4 inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-medium text-white transition-transform hover:scale-[1.02]"
              style={{ backgroundColor: ACCENT }}
            >
              Devenir membre fondateur
              <IconArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <Link
            href="/download"
            className="mt-6 inline-flex items-center gap-1.5 text-sm underline underline-offset-4"
            style={{ color: INK }}
          >
            Ittsui sur mobile →
          </Link>
        </Reveal>
      </section>

      <footer className="flex flex-col items-center gap-2 px-6 pb-10 text-center text-sm" style={{ color: `${MUTED}99` }}>
        <span>© 2026 Ittsui France. Conçu avec retenue.</span>
        <span className="flex items-center gap-3">
          <Link href="/a-propos" className="underline underline-offset-4">
            À propos
          </Link>
          <Link href="/partenaires" className="underline underline-offset-4">
            Partenaires
          </Link>
          <Link href="/confidentialite" className="underline underline-offset-4">
            Confidentialité
          </Link>
          <Link href="/conditions-utilisation" className="underline underline-offset-4">
            Conditions d&apos;utilisation
          </Link>
          <Link href="/mentions-legales" className="underline underline-offset-4">
            Mentions légales
          </Link>
        </span>
      </footer>
    </main>
  );
}
