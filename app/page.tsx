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
import Image from "next/image";
import Link from "next/link";
import { Fraunces, Work_Sans } from "next/font/google";

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

const INK = "#1C1917";
const MUTED = "#78716C";
const ACCENT = "#A84B38";
const BORDER = "#E8E2D9";

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
function IconHeart({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
      <path d="M12 21s-7-4.35-9.5-8.6C.8 8.9 2.4 5 6 5c2 0 3.3 1.1 4 2.2C10.7 6.1 12 5 14 5c3.6 0 5.2 3.9 3.5 7.4C19 16.65 12 21 12 21z" />
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
  const [dragX, setDragX] = useState(0);
  const [skipped, setSkipped] = useState(false);
  const [, startTransition] = useTransition();

  const draggingRef = useRef(false);
  const startXRef = useRef(0);
  const skipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (skipTimerRef.current) clearTimeout(skipTimerRef.current);
    };
  }, []);

  function beginDrag(clientX: number) {
    if (cardState === "confirmed") return;
    draggingRef.current = true;
    startXRef.current = clientX;
  }

  function moveDrag(clientX: number) {
    if (!draggingRef.current) return;
    const delta = clientX - startXRef.current;
    setDragX(Math.max(-140, Math.min(140, delta)));
  }

  function endDrag() {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    if (dragX > SWIPE_THRESHOLD) {
      confirmCard();
    } else if (dragX < -SWIPE_THRESHOLD) {
      swapCard();
    }
    setDragX(0);
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
  const rotation = dragX / 26;

  return (
    <div className="mx-auto max-w-sm">
      <div
        className="touch-pan-y select-none overflow-hidden rounded-3xl border bg-white shadow-sm"
        style={{
          borderColor: BORDER,
          transform: `translateX(${dragX}px) rotate(${rotation}deg)`,
          transition: draggingRef.current ? "none" : "transform 0.35s cubic-bezier(0.22,1,0.36,1)",
        }}
        onTouchStart={(e) => beginDrag(e.touches[0].clientX)}
        onTouchMove={(e) => moveDrag(e.touches[0].clientX)}
        onTouchEnd={endDrag}
        onPointerDown={(e) => beginDrag(e.clientX)}
        onPointerMove={(e) => moveDrag(e.clientX)}
        onPointerUp={endDrag}
        onPointerLeave={() => draggingRef.current && endDrag()}
      >
        {cardState === "confirmed" ? (
          <div className="flex flex-col items-center px-6 py-14 text-center">
            <span
              className="flex h-12 w-12 items-center justify-center rounded-full"
              style={{ backgroundColor: `${ACCENT}1A` }}
            >
              <IconCheck className="h-6 w-6" style={{ color: ACCENT }} />
            </span>
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
              <span className="rounded-full px-3 py-1 text-xs font-medium" style={{ backgroundColor: "#FBF9F5", color: MUTED }}>
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
                <button type="button" onClick={swapCard} className="transition-colors" style={{ color: MUTED }}>
                  ← {cardState === "swapped" ? "Option initiale" : "Échanger"}
                </button>
                <button
                  type="button"
                  onClick={confirmCard}
                  className="flex items-center gap-1 font-medium transition-colors"
                  style={{ color: ACCENT }}
                >
                  <IconCheck className="h-3.5 w-3.5" />
                  Valider →
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {cardState !== "confirmed" && (
        <div className="mt-4 text-center" style={{ minHeight: "1.25rem" }}>
          {skipped ? (
            <p className="text-xs" style={{ color: MUTED }}>D&apos;accord. On se retrouve la semaine prochaine.</p>
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
    </div>
  );
}
// --- end Friday Card ------------------------------------------------------

export default function Home() {
  return (
    <main
      className={`${fraunces.variable} ${workSans.variable} min-h-screen bg-[#FBF9F5] antialiased`}
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
      `}</style>

      {/* Nav */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-baseline gap-2">
          <span style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: "1.35rem" }}>Ittsui</span>
          <span className="text-sm" style={{ color: MUTED }}>一対</span>
        </div>
        <div className="flex items-center gap-6">
          <Link href="/setup" className="text-sm transition-colors" style={{ color: MUTED }}>
            Connexion
          </Link>
          <Link
            href="/setup"
            className="inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-sm text-white transition-transform hover:scale-[1.02]"
            style={{ backgroundColor: ACCENT }}
          >
            Lancer mon duo
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="px-6 pb-8 pt-4 sm:pb-12">
        <Reveal className="mx-auto max-w-3xl text-center">
          <h1
            className="leading-[1.08]"
            style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: "clamp(2.5rem, 5.5vw, 4rem)" }}
          >
            Le temps de vos proches,
            <br />
            protégé.
          </h1>
          <p className="mx-auto mt-5 max-w-md text-[17px]" style={{ color: MUTED }}>
            Un seul moment par semaine. Une proposition concrète. Zéro calendrier à gérer.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3">
            <Link
              href="/setup"
              className="inline-flex items-center gap-2 rounded-full px-8 py-4 text-base text-white transition-transform hover:scale-[1.02]"
              style={{ backgroundColor: ACCENT }}
            >
              Essayer avec un proche
              <IconArrowRight className="h-4 w-4" />
            </Link>
            <p className="flex items-center gap-1.5 text-sm" style={{ color: MUTED }}>
              <IconSparkles className="h-3.5 w-3.5" />
              Sans calendrier à synchroniser · Configuration en 1 minute
            </p>
          </div>
        </Reveal>

        <Reveal className="mx-auto mt-12 max-w-3xl">
          <div
            className="relative h-[50vh] w-full overflow-hidden rounded-3xl border sm:h-[60vh]"
            style={{ borderColor: BORDER }}
          >
            <Image
              src="/mother-daughter-cafe.jpg"
              alt="Mère et fille au café"
              fill
              priority
              sizes="(max-width: 768px) 100vw, 768px"
              className="object-cover"
            />
          </div>
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
        </Reveal>

        <Reveal className="mx-auto mt-14 grid max-w-5xl grid-cols-1 gap-5 sm:grid-cols-3">
          {DUO_CARDS.map((card, i) => (
            <div
              key={card.src}
              className={`overflow-hidden rounded-2xl border bg-white shadow-sm ${i === 1 ? "sm:mt-8" : ""}`}
              style={{ borderColor: BORDER }}
            >
              <div className="relative h-56 w-full">
                <Image src={card.src} alt={card.alt} fill sizes="(max-width: 640px) 100vw, 33vw" className="object-cover" />
              </div>
              <p className="px-5 py-4 text-center text-sm font-medium">{card.label}</p>
            </div>
          ))}
        </Reveal>
      </section>

      {/* Friday card mockup — now interactive */}
      <section className="border-t px-6 py-20 sm:py-28" style={{ borderColor: BORDER }}>
        <Reveal className="mx-auto max-w-md text-center">
          <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: "clamp(1.75rem, 3.5vw, 2.25rem)" }}>
            Ce que vous voyez le vendredi.
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
        <Reveal className="mx-auto max-w-2xl">
          <ol className="space-y-10">
            <li className="flex gap-6">
              <span className="shrink-0" style={{ fontFamily: "var(--font-display)", fontSize: "clamp(1.5rem, 3vw, 2rem)", color: ACCENT }}>
                01
              </span>
              <div>
                <h3 className="text-xl" style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}>
                  Définissez vos habitudes
                  <span className="ml-2 text-sm font-normal" style={{ color: MUTED }}>
                    (une seule fois)
                  </span>
                </h3>
                <p className="mt-1 text-[17px]" style={{ color: MUTED }}>
                  Préférences de lieux : café, parc, restaurant, chez l&apos;un des deux.
                </p>
              </div>
            </li>
            <li className="flex gap-6">
              <span className="shrink-0" style={{ fontFamily: "var(--font-display)", fontSize: "clamp(1.5rem, 3vw, 2rem)", color: ACCENT }}>
                02
              </span>
              <div>
                <h3 className="text-xl" style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}>
                  La proposition du vendredi
                </h3>
                <p className="mt-1 text-[17px]" style={{ color: MUTED }}>
                  Chaque vendredi à 18h, recevez une proposition unique, prête à être validée en un clic.
                </p>
              </div>
            </li>
            <li className="flex gap-6">
              <span className="shrink-0" style={{ fontFamily: "var(--font-display)", fontSize: "clamp(1.5rem, 3vw, 2rem)", color: ACCENT }}>
                03
              </span>
              <div>
                <h3 className="flex items-center gap-2 text-xl" style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}>
                  Silence le reste de la semaine
                  <span style={{ color: MUTED }}>
                    <IconCalendarX className="h-4 w-4" />
                  </span>
                </h3>
                <p className="mt-1 text-[17px]" style={{ color: MUTED }}>
                  Une fois le rendez-vous bloqué, l&apos;application se tait. Zéro notification parasite.
                </p>
                <p className="mt-1 text-sm" style={{ color: MUTED }}>
                  Le droit à la déconnexion, appliqué à vos relations.
                </p>
              </div>
            </li>
          </ol>
        </Reveal>
      </section>

      {/* Footer CTA */}
      <section className="border-t px-6 py-24 text-center sm:py-32" style={{ borderColor: BORDER }}>
        <Reveal className="mx-auto max-w-md">
          <IconHeart className="mx-auto h-6 w-6" style={{ color: ACCENT }} />
          <p
            className="mt-5"
            style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: "clamp(1.75rem, 3.5vw, 2.25rem)" }}
          >
            Offrez du temps réel à la personne qui compte.
          </p>
          <Link
            href="/setup"
            className="mt-8 inline-flex items-center gap-2 rounded-full px-8 py-4 text-base text-white transition-transform hover:scale-[1.02]"
            style={{ backgroundColor: ACCENT }}
          >
            Commencer mon rituel hebdomadaire
            <IconArrowRight className="h-4 w-4" />
          </Link>
        </Reveal>
      </section>

      <footer className="flex flex-col items-center gap-2 px-6 pb-10 text-center text-sm" style={{ color: `${MUTED}99` }}>
        <span>© 2026 Ittsui France. Conçu avec retenue.</span>
        <span className="flex items-center gap-3">
          <Link href="/confidentialite" className="underline underline-offset-4">
            Confidentialité
          </Link>
          <Link href="/mentions-legales" className="underline underline-offset-4">
            Mentions légales
          </Link>
        </span>
      </footer>
    </main>
  );
}
