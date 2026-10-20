"use client";
// /app/components/FridayCard.tsx
// The homepage's live proposal card — the product's entire mechanic,
// playable before signing up.
//
// Two independent bits of state — which venue is showing, and whether
// the demo has been validated. Two ways to change either: the buttons or
// a native drag gesture (swipe right = validate, swipe left = swap). No
// gesture library for the drag maths — pointer coordinates and a
// spring-back transform, wrapped in useTransition so the snap feels
// immediate while React schedules the state update.
//
// Kept on useTransition deliberately (a 2026-08-28 review proposed
// removing it, citing "frame drops alongside Framer Motion values" —
// rejected: framer-motion's useMotionValue/useTransform already update via
// direct DOM mutation, bypassing React's render cycle entirely, so the
// drag itself was never competing with these state transitions in the way
// that claim assumed, and no measurement backed it up).
//
// Two changes driven by real user feedback:
//
//   1. The venue is a button now, not a caption ("Image not clikable",
//      "Adress not / Je rentre"). Tapping it opens VenueSheet with the
//      real address, the nearest metro, and a live map link.
//   2. Confirming no longer ends on a self-congratulatory checkmark. It
//      reveals the actual SMS/WhatsApp the invitee would receive, plus
//      the one fact that dissolves most of the scepticism about adopting
//      a new social app: the other person needs no account and no
//      install. That guarantee used to be a 12px line of grey text in
//      the hero; here it lands at the moment someone is actually
//      wondering "yes, but what does this make my friend do?".
//
// The card is driven by a scenario (lib/sandboxScenarios.ts) rather than
// two hardcoded venues, so the duo-context tiles above it can reconfigure
// it instead of sitting there as dead decoration.

import { useEffect, useRef, useState, useTransition } from "react";
import { motion, useMotionValue, useTransform } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { INK, MUTED, ACCENT, BORDER } from "@/lib/theme";
import { MascotPair } from "@/app/components/MascotPair";
import { IconCheck } from "@/app/components/HomeIcons";
import { VenueSheet } from "@/app/components/VenueSheet";
import { SANDBOX_SCENARIOS, type SandboxScenario, type SandboxVenue } from "@/lib/sandboxScenarios";
import { pagePath, type Locale } from "@/lib/i18n";

// The invitee gets the message in the sender's language (the app writes
// invitations in the language it is used in), so each version of the demo
// shows the message its own reader would actually send — and the same
// two buttons the invitation page shows in that language.
const COPY: Record<
  Locale,
  {
    booked: string;
    bookedLine: (venue: string, when: string) => string;
    receives: (name: string) => string;
    message: (name: string, when: string, venue: string) => string;
    yes: string;
    no: string;
    explain: string;
    retry: string;
    rendezVous: (when: string) => string;
    alternative: (when: string) => string;
    seePlace: string;
    original: string;
    swap: string;
    confirm: string;
    skipped: string;
    skip: string;
    why: string;
  }
> = {
  fr: {
    booked: "C'est bloqué.",
    bookedLine: (venue, when) => `${venue}, ${when}. Plus rien à gérer jusqu'à la semaine prochaine.`,
    receives: (name) => `Ce que ${name} reçoit`,
    message: (name, when, venue) =>
      `« Salut ${name}, Ittsui nous propose de nous retrouver ${when} à ${venue}. Tu es partant(e) ? »`,
    yes: "Je viens",
    no: "Pas dispo",
    explain:
      "Un lien, un geste, et le moment est bloqué dans son agenda. Aucun compte, aucune application à installer pour elle ou lui.",
    retry: "Réessayer la démonstration",
    rendezVous: (when) => `Rendez-vous du ${when}`,
    alternative: (when) => `Alternative 1/1 · ${when}`,
    seePlace: "Voir le lieu",
    original: "Option initiale",
    swap: "Échanger",
    confirm: "Valider →",
    skipped: "Pas de pression cette semaine. On s'occupe du reste — à la semaine prochaine.",
    skip: "Passer cette semaine",
    why: "Pourquoi on a créé Ittsui →",
  },
  en: {
    booked: "It's booked.",
    bookedLine: (venue, when) => `${venue}, ${when}. Nothing else to manage until next week.`,
    receives: (name) => `What ${name} receives`,
    message: (name, when, venue) => `“Hi ${name}, Ittsui suggests we meet ${when} at ${venue}. Are you in?”`,
    yes: "I'm in",
    no: "Can't make it",
    explain: "One link, one tap, and the moment is in their calendar. No account and no app to install on their side.",
    retry: "Try the demo again",
    rendezVous: (when) => `Rendez-vous · ${when}`,
    alternative: (when) => `Alternative 1/1 · ${when}`,
    seePlace: "See the place",
    original: "Original option",
    swap: "Swap",
    confirm: "Confirm →",
    skipped: "No pressure this week. We'll take care of the rest. See you next week.",
    skip: "Skip this week",
    why: "Why we built Ittsui →",
  },
  ja: {
    booked: "決まりました。",
    bookedLine: (venue, when) => `${when}、${venue}。来週まで、もう何もしなくて大丈夫です。`,
    receives: (name) => `${name}に届くメッセージ`,
    message: (name, when, venue) => `「${name}、Ittsuiから提案が届いたよ。${when}に${venue}で会わない？」`,
    yes: "行きます",
    no: "都合が合わない",
    explain:
      "リンクを開いてタップするだけで、予定が相手のカレンダーに入ります。相手はアカウント登録もアプリのインストールも不要です。",
    retry: "もう一度試す",
    rendezVous: (when) => `${when}の約束`,
    alternative: (when) => `代案 1/1 · ${when}`,
    seePlace: "場所を見る",
    original: "元の案",
    swap: "入れ替える",
    confirm: "確定 →",
    skipped: "今週は無理しなくて大丈夫。続きはまた来週。",
    skip: "今週はスキップ",
    why: "Ittsuiが生まれた理由 →",
  },
};

// "swapped" (which of the two venues is showing) and "confirmed"
// (whether the demo has been validated) are independent facts, and they
// used to be squashed into one enum. That enum lost the swap the moment
// you confirmed: the card fell back to computing the venue from
// state === "swapped", which is false once state is "confirmed", so
// validating the alternative locked in the ORIGINAL venue. Invisible
// before, because the confirmed state showed only a checkmark; the
// moment it started naming the place and quoting the invitee's message,
// it started naming the wrong one.

const SWIPE_THRESHOLD = 76; // px before a drag commits to an action

export function FridayCard({ scenario = SANDBOX_SCENARIOS[0], lang = "fr" }: { scenario?: SandboxScenario; lang?: Locale }) {
  const t = COPY[lang];
  const [swapped, setSwapped] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [skipped, setSkipped] = useState(false);
  const [sheetVenue, setSheetVenue] = useState<SandboxVenue | null>(null);
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

  // Switching duo context mid-demo has to reset the card: leaving it on
  // "confirmed" would show a rendez-vous locked at the previous
  // scenario's venue under the new context's heading.
  useEffect(() => {
    setSwapped(false);
    setConfirmed(false);
    setSkipped(false);
    setSheetVenue(null);
  }, [scenario.id]);

  function handleDragEnd(_event: unknown, info: { offset: { x: number } }) {
    if (info.offset.x > SWIPE_THRESHOLD) {
      confirmCard();
    } else if (info.offset.x < -SWIPE_THRESHOLD) {
      swapCard();
    }
  }

  function swapCard() {
    startTransition(() => {
      setSwapped((s) => !s);
    });
  }

  function confirmCard() {
    startTransition(() => setConfirmed(true));
  }

  function resetDemo() {
    startTransition(() => {
      setSwapped(false);
      setConfirmed(false);
      setSkipped(false);
    });
  }

  function skipWeek() {
    setSkipped(true);
    if (skipTimerRef.current) clearTimeout(skipTimerRef.current);
    skipTimerRef.current = setTimeout(() => {
      startTransition(() => {
        setSwapped(false);
        setSkipped(false);
      });
    }, 1800);
  }

  const venue = swapped ? scenario.alternative : scenario.primary;
  const { sampleRecipient, when, whenSentence } = scenario;

  return (
    <div className="mx-auto max-w-sm">
      <motion.div
        className="touch-pan-y select-none overflow-hidden rounded-3xl border bg-white shadow-sm"
        style={{ borderColor: BORDER, x, rotate }}
        drag={confirmed ? false : "x"}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.9}
        dragTransition={{ bounceStiffness: 320, bounceDamping: 22 }}
        onDragEnd={handleDragEnd}
        whileDrag={{ scale: 1.03 }}
      >
        {confirmed ? (
          <div className="px-6 py-8 text-center">
            <MascotPair size={40} nod />
            <h3 className="mt-4" style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: "1.35rem" }}>
              {t.booked}
            </h3>
            <p className="mx-auto mt-1.5 max-w-[26ch] text-sm" style={{ color: MUTED }}>
              {t.bookedLine(venue.name, whenSentence)}
            </p>

            {/* The message the invitee actually receives. Showing it
                verbatim is the point: no mystery about what lands in
                someone else's phone, and no account on the other end. */}
            <div className="mt-5 rounded-2xl border p-4 text-left" style={{ borderColor: BORDER, backgroundColor: "#FFFDF9" }}>
              <p className="text-[11px] uppercase tracking-[0.12em]" style={{ color: MUTED }}>
                {t.receives(sampleRecipient)}
              </p>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: INK }}>
                {t.message(sampleRecipient, whenSentence, venue.name)}
              </p>
              <div className="mt-3 flex gap-2">
                <span
                  className="flex-1 rounded-full py-2 text-center text-xs font-medium text-white"
                  style={{ backgroundColor: ACCENT }}
                >
                  {t.yes}
                </span>
                <span className="flex-1 rounded-full border py-2 text-center text-xs font-medium" style={{ borderColor: BORDER }}>
                  {t.no}
                </span>
              </div>
              <p className="mt-3 text-xs leading-relaxed" style={{ color: MUTED }}>
                {t.explain}
              </p>
            </div>

            <button
              type="button"
              onClick={resetDemo}
              className="mt-5 text-xs underline underline-offset-4"
              style={{ color: MUTED }}
            >
              {t.retry}
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-center border-b px-4 py-3" style={{ borderColor: BORDER }}>
              <span className="rounded-full px-3 py-1 text-xs font-medium" style={{ backgroundColor: "#FFFDF9", color: MUTED }}>
                {t.rendezVous(when)}
              </span>
            </div>
            <div className="relative h-48 w-full">
              <Image
                src={venue.photo}
                alt={venue.photoAlt}
                fill
                sizes="384px"
                draggable={false}
                className="pointer-events-none object-cover"
              />
              {swapped && (
                <span
                  className="absolute left-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-medium text-white"
                  style={{ backgroundColor: ACCENT }}
                >
                  {t.alternative(when)}
                </span>
              )}
            </div>
            <div className="px-5 py-4">
              {/* Was a static <p>. Real feedback: "Image not clikable",
                  "Adress not". The venue is the one thing on this card a
                  visitor actually wants to interrogate. */}
              <button
                type="button"
                onClick={() => setSheetVenue(venue)}
                className="flex w-full items-start justify-between gap-3 text-left"
              >
                <span>
                  <span className="block text-sm font-medium underline decoration-dotted underline-offset-4">
                    {venue.shortLabel}
                  </span>
                  <span className="mt-0.5 block text-xs" style={{ color: MUTED }}>
                    {venue.ambience.slice(0, 2).join(" · ")}
                  </span>
                </span>
                <span
                  className="mt-0.5 shrink-0 rounded-full px-2 py-1 text-[10px] font-medium"
                  style={{ backgroundColor: `${ACCENT}14`, color: ACCENT }}
                >
                  {t.seePlace}
                </span>
              </button>
              <div className="mt-4 flex items-center justify-between text-xs">
                <motion.button
                  type="button"
                  onClick={swapCard}
                  whileTap={{ scale: 0.94 }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                  className="transition-colors"
                  style={{ color: MUTED }}
                >
                  ← {swapped ? t.original : t.swap}
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
                  {t.confirm}
                </motion.button>
              </div>
            </div>
          </>
        )}
      </motion.div>

      {!confirmed && (
        <div className="mt-4 text-center" style={{ minHeight: "1.25rem" }}>
          {skipped ? (
            <div className="flex flex-col items-center gap-2">
              <MascotPair size={30} />
              <p className="text-xs" style={{ color: "rgba(255,253,249,0.82)" }}>
                {t.skipped}
              </p>
            </div>
          ) : (
            <button
              type="button"
              onClick={skipWeek}
              className="text-xs underline underline-offset-4 transition-colors"
              style={{ color: "rgba(255,253,249,0.78)" }}
            >
              {t.skip}
            </button>
          )}
        </div>
      )}

      <p className="mt-3 text-center text-xs">
        <Link href={pagePath("about", lang)} className="underline underline-offset-4" style={{ color: "rgba(255,253,249,0.78)" }}>
          {t.why}
        </Link>
      </p>

      <VenueSheet venue={sheetVenue} onClose={() => setSheetVenue(null)} lang={lang} />
    </div>
  );
}
