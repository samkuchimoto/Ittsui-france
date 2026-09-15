"use client";
// /app/components/StartRitualField.tsx
// The hero's primary action for the high-intent visitor — the other half
// of the "deux types d'utilisateurs" split (the browsing half gets
// DuoSandbox).
//
// It used to be a button reading "Protéger mes relations", which asks
// someone to commit to an abstraction before they know what happens next.
// A field asking one concrete question instead — who? — does three things
// a button can't: it names the product's unit of work, it costs one word
// to answer, and the answer is carried straight into setup's first step
// so the question is never asked twice.
//
// Not a form post: the name is passed as ?avec= and SetupClient prefills
// "La Personne" from it (see its prefill effect). Nothing is stored and
// nothing is sent anywhere from this page — someone typing a friend's
// first name on a marketing page has not agreed to hand it over.

import { useRouter } from "next/navigation";
import { useState } from "react";
import { INK, MUTED, ACCENT, BORDER, CREAM } from "@/lib/theme";
import { IconArrowRight } from "@/app/components/HomeIcons";

// onDark: the hero sits over cinematic footage now, so the label and the
// helper line have to read as light-on-dark there. Everywhere else the
// component is unchanged ink-on-cream — this is a prop rather than a
// rewrite because /setup may well reuse it on the pale background later.
export function StartRitualField({ onDark = false }: { onDark?: boolean } = {}) {
  const router = useRouter();
  const [name, setName] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    router.push(trimmed ? `/setup?avec=${encodeURIComponent(trimmed)}` : "/setup");
  }

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <label
        htmlFor="avec-qui"
        className="block text-sm font-medium"
        style={onDark ? { color: CREAM, textShadow: "0 1px 14px rgba(12,10,9,0.5)" } : { color: INK }}
      >
        Avec qui voulez-vous bloquer un moment ?
      </label>
      <div className="mt-2.5 flex flex-col gap-2 sm:flex-row">
        <input
          id="avec-qui"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Thomas, Maman, Camille…"
          autoComplete="off"
          className="w-full rounded-full border bg-white px-5 py-3.5 text-base outline-none transition-colors focus:border-current"
          style={{ borderColor: onDark ? "rgba(255,253,249,0.55)" : BORDER }}
        />
        <button
          type="submit"
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full px-7 py-3.5 text-base text-white transition-transform hover:scale-[1.02]"
          style={{ backgroundColor: ACCENT }}
        >
          Commencer
          <IconArrowRight className="h-4 w-4" />
        </button>
      </div>
      <p
        className="mt-2.5 text-sm"
        style={onDark ? { color: "rgba(255,253,249,0.72)" } : { color: MUTED }}
      >
        Gratuit · Configuration en 1 minute · Aucun agenda à synchroniser
      </p>
    </form>
  );
}
