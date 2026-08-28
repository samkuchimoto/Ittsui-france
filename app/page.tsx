// /app/page.tsx
//
// Server Component as of 2026-08-28 — this file has no Firebase/Firestore/
// API dependencies and no hooks of its own; every piece of client-side
// interactivity (scroll-tracked header, IntersectionObserver reveals, the
// early-access form, the draggable Friday card) was extracted into its own
// "use client" component under app/components/, so this file now only ever
// composes static, server-rendered marketing prose plus those imported
// islands. Splitting it this way means the static sections below (DUO_CARDS,
// "Comment ça marche," the origin-story section, footer, etc.) never ship
// their own render logic to the client bundle — only the interactive pieces
// do. See app/components/HeaderNav.tsx, Reveal.tsx, EarlyAccessForm.tsx,
// FridayCard.tsx, HomeIcons.tsx for what moved and why.

import Image from "next/image";
import Link from "next/link";
import { Fraunces, Work_Sans } from "next/font/google";
import { INK, MUTED, ACCENT, BORDER } from "@/lib/theme";
import { HeaderNav } from "@/app/components/HeaderNav";
import { Reveal } from "@/app/components/Reveal";
import { EarlyAccessForm } from "@/app/components/EarlyAccessForm";
import { FridayCard } from "@/app/components/FridayCard";
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

const DUO_CARDS = [
  { src: "/friends-cafe-terrace.jpg", alt: "Deux amis discutent en terrasse, sur une rue pavée.", label: "Vos ami(e)s proches" },
  { src: "/couple-living-room.jpg", alt: "Un couple discute, installé sur un canapé, dans la lumière chaude du soir.", label: "Votre partenaire" },
  { src: "/grandmother-granddaughter-park.jpg", alt: "Une grand-mère et sa petite-fille assises sur un banc, dans un parc.", label: "Votre famille" },
  {
    // Filename genuinely has a double .jpg.jpg extension on disk — not a
    // typo to "fix" (verified 2026-08-28 against the real file in public/;
    // dropping the second extension would 404 this image).
    src: "/hero-father-son-vineyard.jpg.jpg",
    alt: "Un père et son fils adulte marchent côte à côte dans les vignes.",
    label: "Vos parents",
  },
];

export default function Home() {
  return (
    <main
      className={`${fraunces.variable} ${workSans.variable} min-h-screen bg-[#FFFDF9] antialiased`}
      style={{ color: INK }}
    >
      <HeaderNav />

      {/* Hero — stacked and centered on mobile, side-by-side above the
          fold on desktop (lg:) so the headline and the interactive visual
          share the same first screen instead of the image requiring a
          scroll to reach. */}
      <section className="px-6 pb-8 pt-4 sm:pb-12">
        <div className="mx-auto max-w-6xl lg:grid lg:grid-cols-2 lg:items-center lg:gap-12">
          <Reveal className="mx-auto max-w-3xl text-center lg:mx-0 lg:max-w-none lg:text-left">
            <span
              className="inline-flex items-center rounded-full px-3.5 py-1.5 text-xs font-medium"
              style={{ backgroundColor: `${ACCENT}1A`, color: ACCENT }}
            >
              Pas une appli de rencontre — un outil de maintien relationnel
            </span>
            <h1
              className="mt-4 leading-[1.08]"
              style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: "clamp(2.5rem, 5.5vw, 4rem)" }}
            >
              Protégez vos relations précieuses contre l&apos;érosion du quotidien.
            </h1>
            {/* Reordered 2026-08-28 (real audit finding, per the strategic
                doc's §10 critique): this used to open with the mechanism
                ("Chaque semaine, Ittsui propose...") and only mention the
                actual problem — workload, lack of time, never a lack of
                desire — as an afterthought at the end. Same two facts, same
                length, problem now stated first. */}
            <p className="mx-auto mt-5 max-w-md text-[17px] lg:mx-0" style={{ color: MUTED }}>
              Ce n&apos;est pas un manque d&apos;envie de les voir — c&apos;est la charge de travail et
              le manque de temps qui font perdre de vue les gens qui comptent, sans jamais l&apos;avoir
              décidé. Chaque semaine, Ittsui propose un lieu et un horaire pour un(e) proche, un(e)
              partenaire ou la famille : vous dites oui en un clic, sans agenda à gérer.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 lg:items-start">
              <Link
                href="/setup"
                className="inline-flex items-center gap-2 rounded-full px-8 py-4 text-base text-white transition-transform hover:scale-[1.02]"
                style={{ backgroundColor: ACCENT }}
              >
                Protéger mes relations
                <IconArrowRight className="h-4 w-4" />
              </Link>
              <p className="flex items-center gap-1.5 text-sm" style={{ color: MUTED }}>
                <IconSparkles className="h-3.5 w-3.5" />
                Gratuit · Sans calendrier à synchroniser · Configuration en 1 minute
              </p>
              {/* Two lower-commitment entry points, consolidated into one
                  quiet row instead of two full-sentence lines stacked under
                  the primary CTA. Real feedback drove adding both: a
                  lower-commitment way in for someone not ready for a
                  standing weekly ritual, and "envoyer un geste" existing but
                  being undiscoverable outside the dashboard.
                  Caption fixed 2026-08-28 (real audit finding): "Sans créer
                  de compte" used to sit under both links but was only true
                  for one — sending a custom rendez-vous requires a real
                  Google sign-in at the final step (see RequestFormClient's
                  handleConnect), only the *recipient* never needs an
                  account, for either flow. Rephrased to the claim that's
                  actually true for both rather than dropping the one that
                  is. */}
              <div className="mt-1 flex items-center gap-4 text-sm">
                <Link href="/request/new" className="underline underline-offset-4" style={{ color: MUTED }}>
                  Proposer un rendez-vous
                </Link>
                <span aria-hidden="true" style={{ color: BORDER }}>
                  ·
                </span>
                <Link href="/geste/nouveau" className="underline underline-offset-4" style={{ color: MUTED }}>
                  Envoyer un geste
                </Link>
              </div>
              <p className="text-xs" style={{ color: `${MUTED}99` }}>
                La personne qui reçoit n&apos;a jamais besoin de créer de compte
              </p>
            </div>
          </Reveal>

          <Reveal className="mx-auto mt-12 max-w-3xl lg:mx-0 lg:mt-0 lg:max-w-none">
            <div
              className="hero-photo-frame relative w-full overflow-hidden rounded-3xl border"
              style={{ borderColor: BORDER, aspectRatio: "3 / 2" }}
            >
              <Image
                src="/hero.jpg"
                alt="Mère et fille au café"
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
              />
            </div>
          </Reveal>
        </div>
      </section>

      {/* Early access email capture — real feature request: visible on
          the first page, not buried in a footer or a separate page. */}
      <section className="px-6 pb-16">
        <Reveal className="mx-auto max-w-md">
          <EarlyAccessForm />
        </Reveal>
      </section>

      {/* Any duo */}
      <section className="border-t px-6 py-20 sm:py-28" style={{ borderColor: BORDER }}>
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: "clamp(1.75rem, 3.5vw, 2.5rem)" }}>
            Pas de réseau social.
            <br />
            Pas d&apos;application de rencontre.
          </h2>
          <p className="mx-auto mt-3 max-w-sm text-sm" style={{ color: MUTED }}>
            Un outil simple pour les gens qui comptent déjà dans votre vie.
          </p>
        </Reveal>

        <Reveal className="mx-auto mt-14 grid max-w-5xl grid-cols-2 gap-5 sm:grid-cols-4">
          {DUO_CARDS.map((card, i) => (
            <div
              key={card.src}
              className={`overflow-hidden rounded-2xl border bg-white shadow-sm ${i % 2 === 1 ? "sm:mt-8" : ""}`}
              style={{ borderColor: BORDER }}
            >
              <div className="relative h-40 w-full sm:h-56">
                <Image src={card.src} alt={card.alt} fill sizes="(max-width: 640px) 50vw, 25vw" className="object-cover" />
              </div>
              <p className="px-3 py-3 text-center text-xs font-medium sm:px-5 sm:py-4 sm:text-sm">{card.label}</p>
            </div>
          ))}
        </Reveal>
      </section>

      {/* Friday card mockup — now interactive */}
      <section className="border-t px-6 py-20 sm:py-28" style={{ borderColor: BORDER }}>
        <Reveal className="mx-auto max-w-md text-center">
          <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: "clamp(1.75rem, 3.5vw, 2.25rem)" }}>
            Ce que vous recevez chaque semaine.
            <br />
            Et rien d&apos;autre.
          </h2>
          <p className="mx-auto mt-3 max-w-xs text-sm" style={{ color: MUTED }}>
            Glissez la carte, ou utilisez les boutons. Essayez.
          </p>
        </Reveal>

        <Reveal className="mt-12">
          <FridayCard />
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
          remote image host regardless. Simple icon tiles instead, same
          restrained treatment as the "Comment ça marche" steps below. */}
      <section className="border-t px-6 py-20 sm:py-28" style={{ borderColor: BORDER }}>
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: "clamp(1.75rem, 3.5vw, 2.5rem)" }}>
            🎁 Envoyer une attention
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm" style={{ color: MUTED }}>
            Parce qu&apos;une relation se nourrit aussi de petites choses, pas seulement de rendez-vous.
          </p>
        </Reveal>

        <Reveal className="mx-auto mt-10 grid max-w-3xl gap-4 sm:grid-cols-3">
          {[
            { emoji: "🎁", title: "Un objet qui vient de vous", body: "Envoyez quelque chose que vous avez déjà et qui vous fait penser à cette personne." },
            { emoji: "🛍️", title: "Une petite attention", body: "Choisissez un type de geste — fleurs, livre, chocolat — et faites-le livrer." },
            { emoji: "✨", title: "Laissez Ittsui trouver l'idée", body: "Une suggestion toute faite, pour ne pas avoir à réfléchir." },
          ].map((tile) => (
            <div
              key={tile.title}
              className="rounded-2xl border bg-white p-5 text-left transition-shadow hover:shadow-sm"
              style={{ borderColor: BORDER }}
            >
              <span
                className="flex h-11 w-11 items-center justify-center rounded-full text-xl"
                style={{ backgroundColor: `${ACCENT}14` }}
              >
                {tile.emoji}
              </span>
              <p className="mt-4 text-sm font-medium">{tile.title}</p>
              <p className="mt-1 text-xs leading-relaxed" style={{ color: MUTED }}>
                {tile.body}
              </p>
            </div>
          ))}
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
                  Chaque semaine, recevez une proposition unique, prête à être validée en un clic.
                </p>
                {/* The weekly proposal is the default, not a ceiling — this
                    clarifies the override right where someone would first
                    wonder "what if I already have a plan," rather than as
                    its own marketing section (real 2026-08-28 gap: the
                    /request/new link already existed in the hero, but
                    nothing told a reader what it actually meant). */}
                <p className="mt-2 text-sm">
                  <Link href="/request/new" className="underline underline-offset-4" style={{ color: MUTED }}>
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
                  Validation en 1 clic
                  <span style={{ color: MUTED }}>
                    <IconCheck className="h-4 w-4" />
                  </span>
                </h3>
                <p className="mt-1 text-[17px]" style={{ color: MUTED }}>
                  Un lieu, un horaire. Vous dites oui, ou vous changez d&apos;avis en un geste — sans négociation,
                  sans fil de discussion à relancer vous-même comme avec un texto classique.
                </p>
              </div>
            </li>
            <li className="flex gap-6">
              <span className="shrink-0" style={{ fontFamily: "var(--font-display)", fontSize: "clamp(1.5rem, 3vw, 2rem)", color: ACCENT }}>
                03
              </span>
              <div>
                <h3 className="flex items-center gap-2 text-xl" style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}>
                  Anti-érosion relationnelle
                  <span style={{ color: MUTED }}>
                    <IconCalendarX className="h-4 w-4" />
                  </span>
                </h3>
                <p className="mt-1 text-[17px]" style={{ color: MUTED }}>
                  Une fois le rendez-vous bloqué, silence total jusqu&apos;à la semaine suivante. Le lien se
                  maintient sans effort de mémoire.
                </p>
                <p className="mt-1 text-sm" style={{ color: MUTED }}>
                  Le droit à la déconnexion, appliqué à vos relations.
                </p>
              </div>
            </li>
          </ol>
        </Reveal>

        <Reveal className="mx-auto mt-12 max-w-xl">
          <div className="flex items-start gap-4 rounded-2xl border p-5" style={{ borderColor: BORDER, backgroundColor: "white" }}>
            <MascotAvatar characterId="kokoro" variant="bust" size={40} className="shrink-0" />
            <div>
              <p className="text-sm font-medium">Pourquoi pas juste un texto ?</p>
              <p className="mt-1 text-sm" style={{ color: MUTED }}>
                Un SMS demande à quelqu&apos;un de proposer, relancer, caler l&apos;horaire — la charge
                mentale reste entière. Ittsui prend cette décision à votre place chaque semaine ; vous,
                vous dites juste oui.
              </p>
            </div>
          </div>
        </Reveal>

      </section>

      {/* The "why" — real origin story, not new marketing copy. Both
          quotes below are verbatim from /a-propos, not written for this
          section; the only thing new here is surfacing them on the
          homepage instead of leaving them one click away. Deliberately
          NOT the fuller 3-card "why planning fails" / "why Ittsui" content
          blocks a 2026-08-28 draft proposed — those substantially
          duplicate what "Pas de réseau social" above and "Comment ça
          marche" already say; adding them again as generic pain-point
          copy would be redundant, not high-impact, and drifts toward the
          declarative trust-copy this app has deliberately avoided
          elsewhere (real product clarity over persuasive marketing
          sections). This section stays a single real story, not a
          feature-benefit list. */}
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
          invented every time. Own section with a faint tint so social
          proof reads as its own moment, not an addendum tacked onto the
          numbered steps above. */}
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
            Protéger mes relations
            <IconArrowRight className="h-4 w-4" />
          </Link>
          <p className="mt-4 text-xs" style={{ color: MUTED }}>
            Le rituel reste gratuit, pour toujours.
          </p>

          {/* Ittsui Plus — given its own real moment rather than a small
              footnote caption, per direct product/pricing feedback: lead
              with what a subscription actually protects (a specific
              relationship — family, ami, partenaire), not a vague feature
              list. €1/mois is a deliberate price point, not a placeholder
              — cheaper than pushing back on a coffee, framed as exactly
              that below. No fabricated feature list: "à venir" stays
              honest about what Plus doesn't concretely include yet. */}
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
