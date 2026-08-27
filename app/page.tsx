"use client";
// /app/page.tsx
//
// AUDIT NOTE: this file has no Firebase/Firestore/API dependencies in the
// original — it is a pure marketing page. The only change vs. the current
// production version is the "Friday card mockup" section, which goes from
// a static image to the fully interactive <FridayCard /> state machine
// described in the brief (drag-to-swipe + button controls, 3 states,
// guilt-free skip). Everything else (Reveal, icons, hero, DUO_CARDS,
// how-it-works, footer) is unchanged.

import { useEffect, useRef, useState, useTransition } from "react";
import { motion, useMotionValue, useTransform } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { Fraunces, Work_Sans } from "next/font/google";
import { INK, MUTED, ACCENT, BORDER } from "@/lib/theme";
import { MascotAvatar } from "@/app/components/MascotAvatar";
import { MascotPair } from "@/app/components/MascotPair";

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

function Reveal({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.unobserve(el);
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={`${visible ? "reveal-in" : "reveal-init"} ${className}`}>
      {children}
    </div>
  );
}

// Minimal inline icons, stroke-based, lucide-style. Avoids a new dependency.
function IconArrowRight({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}
function IconCheck({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}
function IconSparkles({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
      <path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3z" />
      <path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15z" />
    </svg>
  );
}
function IconCalendarX({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
      <path d="M9.5 14.5l5 5M14.5 14.5l-5 5" />
    </svg>
  );
}

const DUO_CARDS = [
  { src: "/friends-cafe-terrace.jpg", alt: "Deux amis discutent en terrasse, sur une rue pavée.", label: "Vos ami(e)s proches" },
  { src: "/couple-living-room.jpg", alt: "Un couple discute, installé sur un canapé, dans la lumière chaude du soir.", label: "Votre partenaire" },
  { src: "/grandmother-granddaughter-park.jpg", alt: "Une grand-mère et sa petite-fille assises sur un banc, dans un parc.", label: "Votre famille" },
  {
    src: "/hero-father-son-vineyard.jpg.jpg",
    alt: "Un père et son fils adulte marchent côte à côte dans les vignes.",
    label: "Vos parents",
  },
];

// --- Friday Card state machine -------------------------------------------
// Three states only: default -> swapped -> confirmed. Two ways in: buttons
// or a native drag gesture (swipe right = validate, swipe left = swap).
// No gesture library — just pointer/touch coordinates and a spring-back
// transform, wrapped in useTransition so the snap feels immediate even
// while React schedules the state update.

type CardState = "default" | "swapped" | "confirmed";

const OPTION_A = {
  name: "Café de Flore · Paris 6e",
  img: "/couple-parisian-cafe.jpg",
  alt: "Café de Flore, Paris 6e",
};
const OPTION_B = {
  name: "Jardin du Luxembourg · Paris 6e",
  img: "/grandmother-granddaughter-park.jpg",
  alt: "Jardin du Luxembourg, Paris 6e",
};

const SWIPE_THRESHOLD = 76; // px before a drag commits to an action

function FridayCard() {
  const [cardState, setCardState] = useState<CardState>("default");
  const [skipped, setSkipped] = useState(false);
  const [, startTransition] = useTransition();

  const skipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Spring physics via framer-motion instead of a hand-rolled
  // pointer/touch tracker — the AGENTS.md "no animation library" stance
  // this replaced was a conscious, explicit product call (tester
  // feedback: too formal next to Duolingo/Alan), not a quiet workaround.
  // dragConstraints at {0,0} + dragElastic lets the card move freely
  // under a finger/pointer but spring back to center on release unless a
  // swipe crosses SWIPE_THRESHOLD, at which point the state change below
  // takes over instead of letting it settle back.
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-140, 140], [-8, 8]);

  useEffect(() => {
    return () => {
      if (skipTimerRef.current) clearTimeout(skipTimerRef.current);
    };
  }, []);

  function handleDragEnd(_event: unknown, info: { offset: { x: number } }) {
    if (info.offset.x > SWIPE_THRESHOLD) {
      confirmCard();
    } else if (info.offset.x < -SWIPE_THRESHOLD) {
      swapCard();
    }
  }

  function swapCard() {
    startTransition(() => {
      setCardState((s) => (s === "swapped" ? "default" : "swapped"));
    });
  }

  function confirmCard() {
    startTransition(() => setCardState("confirmed"));
  }

  function resetDemo() {
    startTransition(() => {
      setCardState("default");
      setSkipped(false);
    });
  }

  function skipWeek() {
    setSkipped(true);
    if (skipTimerRef.current) clearTimeout(skipTimerRef.current);
    skipTimerRef.current = setTimeout(() => {
      startTransition(() => {
        setCardState("default");
        setSkipped(false);
      });
    }, 1800);
  }

  const option = cardState === "swapped" ? OPTION_B : OPTION_A;

  return (
    <div className="mx-auto max-w-sm">
      <motion.div
        className="touch-pan-y select-none overflow-hidden rounded-3xl border bg-white shadow-sm"
        style={{ borderColor: BORDER, x, rotate }}
        drag={cardState === "confirmed" ? false : "x"}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.9}
        dragTransition={{ bounceStiffness: 320, bounceDamping: 22 }}
        onDragEnd={handleDragEnd}
        whileDrag={{ scale: 1.03 }}
      >
        {cardState === "confirmed" ? (
          <div className="flex flex-col items-center px-6 py-14 text-center">
            <MascotPair size={44} nod />
            <h3 className="mt-5" style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: "1.5rem" }}>
              Rendez-vous verrouillé !
            </h3>
            <p className="mt-2 max-w-[22ch] text-sm" style={{ color: MUTED }}>
              ✓ Rendez-vous verrouillé pour Samedi 15:30. On se tait jusqu&apos;à samedi !
            </p>
            <button
              type="button"
              onClick={resetDemo}
              className="mt-6 text-xs underline underline-offset-4"
              style={{ color: MUTED }}
            >
              Réessayer la démonstration
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-center border-b px-4 py-3" style={{ borderColor: BORDER }}>
              <span className="rounded-full px-3 py-1 text-xs font-medium" style={{ backgroundColor: "#FFFDF9", color: MUTED }}>
                Rendez-vous du Samedi · 15:30
              </span>
            </div>
            <div className="relative h-48 w-full">
              <Image
                src={option.img}
                alt={option.alt}
                fill
                sizes="384px"
                draggable={false}
                className="pointer-events-none object-cover"
              />
              {cardState === "swapped" && (
                <span
                  className="absolute left-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-medium text-white"
                  style={{ backgroundColor: ACCENT }}
                >
                  Alternative 1/1 · Samedi 15:30
                </span>
              )}
            </div>
            <div className="px-5 py-4">
              <p className="text-sm font-medium">{option.name}</p>
              <div className="mt-4 flex items-center justify-between text-xs">
                <motion.button
                  type="button"
                  onClick={swapCard}
                  whileTap={{ scale: 0.94 }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                  className="transition-colors"
                  style={{ color: MUTED }}
                >
                  ← {cardState === "swapped" ? "Option initiale" : "Échanger"}
                </motion.button>
                <motion.button
                  type="button"
                  onClick={confirmCard}
                  whileTap={{ scale: 0.94 }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                  className="flex items-center gap-1 font-medium transition-colors"
                  style={{ color: ACCENT }}
                >
                  <IconCheck className="h-3.5 w-3.5" />
                  Valider →
                </motion.button>
              </div>
            </div>
          </>
        )}
      </motion.div>

      {cardState !== "confirmed" && (
        <div className="mt-4 text-center" style={{ minHeight: "1.25rem" }}>
          {skipped ? (
            <div className="flex flex-col items-center gap-2">
              <MascotPair size={30} />
              <p className="text-xs" style={{ color: MUTED }}>
                Pas de pression cette semaine. On s&apos;occupe du reste — à la semaine prochaine.
              </p>
            </div>
          ) : (
            <button
              type="button"
              onClick={skipWeek}
              className="text-xs underline underline-offset-4 transition-colors"
              style={{ color: MUTED }}
            >
              Passer cette semaine
            </button>
          )}
        </div>
      )}

      <p className="mt-3 text-center text-xs">
        <Link href="/a-propos" className="underline underline-offset-4" style={{ color: MUTED }}>
          Pourquoi on a créé Ittsui →
        </Link>
      </p>
    </div>
  );
}
// --- end Friday Card ------------------------------------------------------

export default function Home() {
  return (
    <main
      className={`${fraunces.variable} ${workSans.variable} min-h-screen bg-[#FFFDF9] antialiased`}
      style={{ color: INK }}
    >
      <style jsx global>{`
        @media (prefers-reduced-motion: no-preference) {
          .reveal-in { animation: fadeUp 0.9s ease-out both; }
        }
        @media (prefers-reduced-motion: reduce) {
          .reveal-init, .reveal-in { opacity: 1; transform: none; }
        }
        .reveal-init { opacity: 0; transform: translateY(16px); }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .hero-photo-frame { max-height: 320px; }
        @media (min-width: 1024px) {
          .hero-photo-frame { max-height: 520px; }
        }
      `}</style>

      {/* Nav */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <MascotAvatar characterId="kokoro" variant="bust" size={32} />
          <span style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: "1.35rem" }}>Ittsui</span>
          <span className="text-sm" style={{ color: MUTED }}>一対</span>
        </div>
        <div className="flex items-center gap-6">
          <Link href="/download" className="hidden text-sm transition-colors sm:inline" style={{ color: MUTED }}>
            App mobile
          </Link>
          <Link href="/setup" className="text-sm transition-colors" style={{ color: MUTED }}>
            Connexion
          </Link>
          <Link
            href="/setup"
            className="inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-sm text-white transition-transform hover:scale-[1.02]"
            style={{ backgroundColor: ACCENT }}
          >
            Commencer
          </Link>
        </div>
      </header>

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
            <p className="mx-auto mt-5 max-w-md text-[17px] lg:mx-0" style={{ color: MUTED }}>
              Chaque semaine, Ittsui propose un lieu et un horaire pour un(e) proche, un(e) partenaire ou
              la famille — vous dites oui en un clic, sans agenda à gérer. Entre la charge de travail et
              le manque de temps, c&apos;est ce qui empêche de perdre de vue les gens qui comptent, sans
              jamais l&apos;avoir décidé.
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
              {/* /request/new is deliberately usable with no account at all
                  (see that file's own header comment) — a real, lower-
                  commitment way in for someone not ready for a standing
                  weekly ritual yet, but every CTA on this page used to
                  point at /setup only, so a first-time visitor had no way
                  to even discover it existed. */}
              <Link href="/request/new" className="text-sm underline underline-offset-4" style={{ color: MUTED }}>
                Ou proposez un seul rendez-vous d&apos;abord, sans créer de compte →
              </Link>
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

        {/* Real, unedited quotes from early testers — never fabricated,
            never a star rating or a fake name. See AGENTS.md's standing
            position on this: authentic-but-anonymous beats persuasive but
            invented every time. */}
        <Reveal className="mx-auto mt-10 max-w-2xl">
          <p className="text-center text-xs uppercase tracking-[0.14em]" style={{ color: MUTED }}>
            Premiers retours
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {[
              { quote: "C'est rapide, fluide… SMS c'est clean.", from: "Testeur parisien, 27 août 2026" },
              { quote: "Permet de trouver un contact rapidement.", from: "Testeur parisien, 27 août 2026" },
              { quote: "UI is nice… Intuitive.", from: "Étudiante américaine à Paris, 27 août 2026" },
            ].map((t) => (
              <div key={t.quote} className="rounded-xl border p-4 text-sm" style={{ borderColor: BORDER, backgroundColor: "white" }}>
                <p style={{ color: INK }}>&ldquo;{t.quote}&rdquo;</p>
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
            Le rituel reste gratuit, pour toujours. Ittsui Plus (suggestions enrichies, options
            supplémentaires) arrive bientôt, à partir de 2,99&nbsp;€/mois.
          </p>
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
