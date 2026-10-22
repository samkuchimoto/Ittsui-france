"use client";
// /app/triage/BriefView.tsx
// The summary built from someone's emails: the counters, then priorities
// with their dates and next steps, follow-ups in one line each, and the
// noise that was set aside. A meeting someone proposed by email has one
// more button: it hands that email to the rendez-vous request form, the
// same way a link shared into Ittsui from another app arrives there
// (ShareTargetListener.tsx's SHARED_TEXT_KEY) — into "Décrire en une
// phrase", to be read back before anything is sent.

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { INK, MUTED, ACCENT, BORDER } from "@/lib/theme";
import type { Locale } from "@/lib/i18n";
import type { Brief, BriefGroup, TriageEmail } from "@/lib/triage/engine";
import { SHARED_TEXT_KEY } from "@/app/components/ShareTargetListener";
import { useLang } from "@/app/components/site/LangProvider";

const COPY: Record<
  Locale,
  {
    title: string;
    counters: [string, string, string, string];
    minutes: (minutes: number) => string;
    priorities: string;
    noPriorities: string;
    follow: string;
    noFollow: string;
    noise: string;
    noiseNote: string;
    noNoise: string;
    deadline: (date: string) => string;
    action: string;
    propose: string;
    proposeHint: string;
    showAll: (count: number) => string;
    showLess: string;
  }
> = {
  fr: {
    title: "Votre résumé",
    counters: ["E-mails lus", "À traiter", "Pour info", "Bruit écarté"],
    minutes: (m) => `Environ ${m} min de lecture évitées (estimation).`,
    priorities: "🔴 Priorités & dates limites",
    noPriorities: "Aucune priorité ni date limite repérée.",
    follow: "🟡 Suivi & sécurité",
    noFollow: "Rien à suivre.",
    noise: "⚪ Bruit, newsletters & promos écartés",
    noiseNote: "Écartés automatiquement : inutile de les ouvrir.",
    noNoise: "Aucun bruit repéré.",
    deadline: (date) => `Date limite : ${date}`,
    action: "Action :",
    propose: "Proposer ce rendez-vous avec Ittsui →",
    proposeHint: "La demande est pré-remplie avec cet e-mail : vous la relisez avant tout envoi.",
    showAll: (count) => `Afficher les ${count}`,
    showLess: "Réduire",
  },
  en: {
    title: "Your summary",
    counters: ["Emails read", "To act on", "For information", "Noise set aside"],
    minutes: (m) => `About ${m} min of reading saved (estimate).`,
    priorities: "🔴 Priorities & deadlines",
    noPriorities: "No priorities or deadlines found.",
    follow: "🟡 Follow-up & security",
    noFollow: "Nothing to follow up.",
    noise: "⚪ Noise, newsletters & promotions set aside",
    noiseNote: "Set aside automatically: no need to open them.",
    noNoise: "No noise found.",
    deadline: (date) => `Deadline: ${date}`,
    action: "Next step:",
    propose: "Propose this rendez-vous with Ittsui →",
    proposeHint: "The request is prefilled with this email; you review it before anything is sent.",
    showAll: (count) => `Show all ${count}`,
    showLess: "Show less",
  },
  ja: {
    title: "あなたの要約",
    counters: ["読んだメール", "要対応", "お知らせ", "除外したメール"],
    minutes: (m) => `約${m}分の読む時間を節約しました（推定）。`,
    priorities: "🔴 優先事項と期限",
    noPriorities: "優先事項や期限は見つかりませんでした。",
    follow: "🟡 確認・セキュリティ",
    noFollow: "確認するものはありません。",
    noise: "⚪ 除外したメール（ニュースレター・広告など）",
    noiseNote: "自動で除外しました。開く必要はありません。",
    noNoise: "除外するメールはありませんでした。",
    deadline: (date) => `期限：${date}`,
    action: "次にやること：",
    propose: "Ittsuiでこの約束を提案する →",
    proposeHint: "このメールの内容でリクエストを下書きします。送信する前に確認できます。",
    showAll: (count) => `${count}件すべて表示`,
    showLess: "閉じる",
  },
  // Not translated yet: shown in English.
  es: {
    title: "Your summary",
    counters: ["Emails read", "To act on", "For information", "Noise set aside"],
    minutes: (m) => `About ${m} min of reading saved (estimate).`,
    priorities: "🔴 Priorities & deadlines",
    noPriorities: "No priorities or deadlines found.",
    follow: "🟡 Follow-up & security",
    noFollow: "Nothing to follow up.",
    noise: "⚪ Noise, newsletters & promotions set aside",
    noiseNote: "Set aside automatically: no need to open them.",
    noNoise: "No noise found.",
    deadline: (date) => `Deadline: ${date}`,
    action: "Next step:",
    propose: "Propose this rendez-vous with Ittsui →",
    proposeHint: "The request is prefilled with this email; you review it before anything is sent.",
    showAll: (count) => `Show all ${count}`,
    showLess: "Show less",
  },
  he: {
    title: "Your summary",
    counters: ["Emails read", "To act on", "For information", "Noise set aside"],
    minutes: (m) => `About ${m} min of reading saved (estimate).`,
    priorities: "🔴 Priorities & deadlines",
    noPriorities: "No priorities or deadlines found.",
    follow: "🟡 Follow-up & security",
    noFollow: "Nothing to follow up.",
    noise: "⚪ Noise, newsletters & promotions set aside",
    noiseNote: "Set aside automatically: no need to open them.",
    noNoise: "No noise found.",
    deadline: (date) => `Deadline: ${date}`,
    action: "Next step:",
    propose: "Propose this rendez-vous with Ittsui →",
    proposeHint: "The request is prefilled with this email; you review it before anything is sent.",
    showAll: (count) => `Show all ${count}`,
    showLess: "Show less",
  },
};

function Counter({ value, label }: { value: number; label: string }) {
  return (
    <div className="bg-white p-5">
      <p className="text-3xl tabular-nums" style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}>
        {value}
      </p>
      <p className="mt-1 text-sm" style={{ color: MUTED }}>
        {label}
      </p>
    </div>
  );
}

function Priority({ email, t }: { email: TriageEmail; t: (typeof COPY)[Locale] }) {
  const router = useRouter();

  function propose() {
    sessionStorage.setItem(SHARED_TEXT_KEY, email.meetingText);
    router.push("/request/new");
  }

  return (
    <li className="rounded-2xl border bg-white p-4 sm:p-5" style={{ borderColor: email.kind === "meeting" ? ACCENT : BORDER }}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="font-medium">{email.sender}</p>
        {email.received && (
          <p className="text-xs tabular-nums" style={{ color: MUTED }}>
            {email.received}
          </p>
        )}
      </div>
      <p className="mt-1" style={{ color: MUTED }}>
        {email.summary}
      </p>
      {email.deadline && (
        <p className="mt-3 inline-flex rounded-full border px-2.5 py-0.5 text-sm" style={{ borderColor: ACCENT, color: ACCENT }}>
          {t.deadline(email.deadline)}
        </p>
      )}
      {email.action && (
        <p className="mt-3 text-sm" style={{ color: INK }}>
          <span className="font-medium">{t.action}</span> {email.action}
        </p>
      )}
      {email.kind === "meeting" && email.meetingText && (
        <div className="mt-4">
          <button
            type="button"
            onClick={propose}
            className="inline-flex min-h-11 items-center rounded-full px-5 text-sm font-medium text-white transition-transform hover:scale-[1.02]"
            style={{ backgroundColor: ACCENT }}
          >
            {t.propose}
          </button>
          <p className="mt-2 text-xs" style={{ color: MUTED }}>
            {t.proposeHint}
          </p>
        </div>
      )}
    </li>
  );
}

function Groups({ groups, render }: { groups: BriefGroup[]; render: (email: TriageEmail, index: number) => ReactNode }) {
  return (
    <div className="mt-6 space-y-8">
      {groups.map((group) => (
        <div key={group.kind}>
          <p className="text-xs font-medium uppercase tracking-[0.12em]" style={{ color: ACCENT }}>
            {group.label} <span style={{ color: MUTED }}>({group.items.length})</span>
          </p>
          <ul className="mt-3 space-y-3">{group.items.map(render)}</ul>
        </div>
      ))}
    </div>
  );
}

function NoiseGroup({ group, t }: { group: BriefGroup; t: (typeof COPY)[Locale] }) {
  const [open, setOpen] = useState(false);
  const shown = open ? group.items : group.items.slice(0, 5);
  return (
    // min-w-0: a grid cell would otherwise grow to its longest line.
    <div className="min-w-0">
      <p className="text-xs font-medium uppercase tracking-[0.12em]" style={{ color: MUTED }}>
        {group.label} ({group.items.length})
      </p>
      <ul className="mt-3 space-y-1.5 text-sm" style={{ color: MUTED }}>
        {shown.map((email, i) => (
          <li key={`${email.sender}-${i}`} className="flex min-w-0 gap-2">
            <span className="shrink-0 font-medium" style={{ color: INK }}>
              {email.sender}
            </span>
            <span className="min-w-0 truncate">{email.summary}</span>
          </li>
        ))}
      </ul>
      {group.items.length > 5 && (
        <button type="button" onClick={() => setOpen(!open)} className="mt-2 text-sm underline underline-offset-4">
          {open ? t.showLess : t.showAll(group.items.length)}
        </button>
      )}
    </div>
  );
}

export function BriefView({ brief, mode }: { brief: Brief; mode: string }) {
  const { lang } = useLang();
  const t = COPY[lang];
  const { counts } = brief;
  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: "1.75rem" }}>{t.title}</h2>
        <p className="text-sm" style={{ color: MUTED }}>
          {mode}
        </p>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-3xl border md:grid-cols-4" style={{ borderColor: BORDER, backgroundColor: BORDER }}>
        <Counter value={counts.total} label={t.counters[0]} />
        <Counter value={counts.actions} label={t.counters[1]} />
        <Counter value={counts.info} label={t.counters[2]} />
        <Counter value={counts.noise} label={t.counters[3]} />
      </div>
      <p className="mt-3 text-sm" style={{ color: MUTED }}>
        {t.minutes(counts.minutesSaved)}
      </p>

      <section className="mt-12" aria-labelledby="brief-priorities">
        <h3 id="brief-priorities" className="text-xl" style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}>
          {t.priorities} <span style={{ color: MUTED }}>({counts.actions})</span>
        </h3>
        {brief.priorities.length ? (
          <Groups groups={brief.priorities} render={(email, i) => <Priority key={`${email.sender}-${email.subject}-${i}`} email={email} t={t} />} />
        ) : (
          <p className="mt-4" style={{ color: MUTED }}>
            {t.noPriorities}
          </p>
        )}
      </section>

      <section className="mt-12 border-t pt-10" style={{ borderColor: BORDER }} aria-labelledby="brief-follow">
        <h3 id="brief-follow" className="text-xl" style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}>
          {t.follow} <span style={{ color: MUTED }}>({counts.info})</span>
        </h3>
        {brief.follow.length ? (
          <Groups
            groups={brief.follow}
            render={(email, i) => (
              <li key={`${email.sender}-${email.subject}-${i}`} className="text-sm">
                <span className="font-medium">{email.sender}</span>
                {lang === "ja" ? "：" : " : "}
                <span style={{ color: MUTED }}>{email.summary}</span>
              </li>
            )}
          />
        ) : (
          <p className="mt-4" style={{ color: MUTED }}>
            {t.noFollow}
          </p>
        )}
      </section>

      <section className="mt-12 border-t pt-10" style={{ borderColor: BORDER }} aria-labelledby="brief-noise">
        <h3 id="brief-noise" className="text-xl" style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}>
          {t.noise} <span style={{ color: MUTED }}>({counts.noise})</span>
        </h3>
        {brief.noise.length ? (
          <>
            <p className="mt-2 text-sm" style={{ color: MUTED }}>
              {t.noiseNote}
            </p>
            <div className="mt-6 grid gap-8 md:grid-cols-2">
              {brief.noise.map((group) => (
                <NoiseGroup key={group.kind} group={group} t={t} />
              ))}
            </div>
          </>
        ) : (
          <p className="mt-4" style={{ color: MUTED }}>
            {t.noNoise}
          </p>
        )}
      </section>
    </div>
  );
}
