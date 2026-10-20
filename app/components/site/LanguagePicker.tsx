"use client";
// /app/components/site/LanguagePicker.tsx
// The one question the app asks the first time it opens: which language.
// Written in all three at once, since by definition we don't know yet
// which one the reader understands. Each choice is labelled in its own
// language (English, not "Anglais"), the way every language menu should be.

import { INK, MUTED, ACCENT, BORDER, CREAM } from "@/lib/theme";
import type { Locale } from "@/lib/i18n";

const CHOICES: { lang: Locale; label: string; hint: string }[] = [
  { lang: "fr", label: "Français", hint: "Continuer en français" },
  { lang: "en", label: "English", hint: "Continue in English" },
  { lang: "ja", label: "日本語", hint: "日本語で続ける" },
];

export function LanguagePicker({ onPick }: { onPick: (lang: Locale) => void }) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center px-6"
      style={{ backgroundColor: "rgba(28,25,23,0.55)" }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="language-picker-title"
    >
      <div className="w-full max-w-sm rounded-3xl border p-6 text-center" style={{ backgroundColor: CREAM, borderColor: BORDER, color: INK }}>
        <p className="text-2xl" style={{ fontFamily: "var(--font-display), serif", fontWeight: 600 }}>
          Ittsui <span style={{ color: MUTED }}>一対</span>
        </p>
        <h2 id="language-picker-title" className="mt-3 text-sm leading-relaxed" style={{ color: MUTED }}>
          <span lang="fr">Choisissez votre langue</span>
          <br />
          <span lang="en">Choose your language</span>
          <br />
          <span lang="ja">言語を選んでください</span>
        </h2>
        <div className="mt-6 flex flex-col gap-3">
          {CHOICES.map((choice) => (
            <button
              key={choice.lang}
              type="button"
              lang={choice.lang}
              onClick={() => onPick(choice.lang)}
              className="flex min-h-[56px] items-center justify-between rounded-2xl border bg-white px-5 text-left transition-transform hover:scale-[1.01]"
              style={{ borderColor: BORDER }}
            >
              <span className="text-lg font-medium">{choice.label}</span>
              <span className="text-xs" style={{ color: ACCENT }}>
                {choice.hint} →
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
