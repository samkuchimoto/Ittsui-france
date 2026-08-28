"use client";
// /app/investors/page.tsx
// Internal scenario-modeling tool for fundraising conversations — not a
// public product page. Deliberately unlinked from any nav and excluded
// via robots.ts (see that file's disallow list): the point is a private
// URL to hand to specific investors, not something ittsui.fr surfaces
// on its own, matching the same "unguessable/unlisted, not a real
// account-gated secret" posture as this app's other quiet pages.
//
// Every number on this page is a live function of the six sliders —
// there is no real, reported financial data here. Two honesty choices
// worth being explicit about:
//   1. € and $ are treated at parity for modeling simplicity (B2C ARPU
//      and B2B take-rate are entered in €; the milestone targets from
//      the brief are stated in $) — a real model would carry an FX
//      assumption, this one just says so rather than silently mixing
//      currencies.
//   2. The Country Expansion multiplier is a single labeled assumption
//      (not hidden inside the arithmetic) standing in for the real
//      effect of entering higher-ARPU/higher-TAM markets — an investor
//      should be able to see exactly what it is and challenge it.

import { useMemo, useState } from "react";
import {
  Users,
  Percent,
  Coins,
  Store,
  TrendingUp,
  Globe2,
  Gem,
  Target,
  ArrowRight,
  CheckCircle2,
  Circle,
} from "lucide-react";
import { Fraunces, Work_Sans } from "next/font/google";
import { INK, MUTED, ACCENT, BORDER, CREAM } from "@/lib/theme";

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

const GOOD = "#1E7A4C";

type CountryPhase = "fr" | "fr_us" | "fr_us_jp";

const COUNTRY_PHASES: { id: CountryPhase; label: string; detail: string; multiplier: number }[] = [
  { id: "fr", label: "France seule", detail: "Validation densité & esthétique", multiplier: 1.0 },
  { id: "fr_us", label: "FR + US", detail: "Moteur de monétisation ARPU élevé", multiplier: 1.35 },
  { id: "fr_us_jp", label: "FR + US + JP", detail: "Omiyage / Omotenashi — B2B renforcé", multiplier: 1.6 },
];

interface Milestone {
  phase: string;
  name: string;
  pairs: number;
  arrLow: number | null;
  arrHigh: number | null;
  valLow: number;
  valHigh: number | null;
}

const MILESTONES: Milestone[] = [
  { phase: "Phase 1", name: "Pre-Seed", pairs: 2_000, arrLow: null, arrHigh: null, valLow: 1.5, valHigh: 3.0 },
  { phase: "Phase 2", name: "Seed / Series A", pairs: 100_000, arrLow: 1.5, arrHigh: 3.5, valLow: 25, valHigh: 70 },
  { phase: "Phase 3", name: "Series B", pairs: 750_000, arrLow: 15, arrHigh: 25, valLow: 270, valHigh: 550 },
  { phase: "Phase 4", name: "Unicorn", pairs: 2_500_000, arrLow: 50, arrHigh: null, valLow: 1000, valHigh: null },
];

function formatCompact(n: number): string {
  return new Intl.NumberFormat("fr-FR", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}
function formatMoney(n: number, currency: "€" | "$" = "€"): string {
  return `${currency}${new Intl.NumberFormat("fr-FR", { notation: "compact", maximumFractionDigits: 1 }).format(n)}`;
}
function formatFull(n: number): string {
  return new Intl.NumberFormat("fr-FR").format(Math.round(n));
}

function Slider({
  icon: Icon,
  label,
  value,
  valueLabel,
  min,
  max,
  step,
  onChange,
}: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  label: string;
  value: number;
  valueLabel: string;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-sm font-medium" style={{ color: INK }}>
          <Icon className="h-4 w-4" style={{ color: ACCENT }} />
          {label}
        </span>
        <span
          className="rounded-full px-2.5 py-0.5 text-xs font-semibold tabular-nums"
          style={{ backgroundColor: `${ACCENT}1A`, color: ACCENT }}
        >
          {valueLabel}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-3 w-full accent-current"
        style={{ accentColor: ACCENT }}
      />
    </div>
  );
}

export default function InvestorDashboardPage() {
  const [activePairsLog, setActivePairsLog] = useState(Math.log10(100_000));
  const [conversionRate, setConversionRate] = useState(12);
  // €1/mois default — real 2026-08-28 investor feedback (Dror Sharon):
  // paying customers are the metric that matters, not ARPU maximized per
  // user; price low enough that "protect a relationship for less than a
  // coffee" is an easy yes, and let conversion volume carry ARR instead.
  const [b2cArpu, setB2cArpu] = useState(1);
  const [b2bTakeRate, setB2bTakeRate] = useState(15);
  const [valuationMultiple, setValuationMultiple] = useState(12);
  const [countryPhase, setCountryPhase] = useState<CountryPhase>("fr_us");

  const activePairs = Math.round(10 ** activePairsLog);
  const expansion = COUNTRY_PHASES.find((c) => c.id === countryPhase)!;

  const model = useMemo(() => {
    const paidPairs = activePairs * (conversionRate / 100);
    const b2cMrr = paidPairs * b2cArpu;
    const b2cArr = b2cMrr * 12;
    const b2bArr = activePairs * b2bTakeRate;

    const totalArrBase = b2cArr + b2bArr;
    const totalArr = totalArrBase * expansion.multiplier;
    const totalMrr = totalArr / 12;

    const b2cShare = totalArrBase > 0 ? b2cArr / totalArrBase : 0.5;
    const b2bShare = 1 - b2cShare;

    const valuationM = (totalArr / 1_000_000) * valuationMultiple;

    return { paidPairs, b2cMrr, b2cArr, b2bArr, totalArr, totalMrr, b2cShare, b2bShare, valuationM };
  }, [activePairs, conversionRate, b2cArpu, b2bTakeRate, valuationMultiple, expansion.multiplier]);

  // Current phase = the highest milestone whose pair threshold is met.
  // Progress to the next phase averages three honestly-separate ratios
  // (pairs / ARR / valuation) rather than collapsing them into one
  // number that implies more precision than a slider model has.
  const currentPhaseIndex = MILESTONES.reduce(
    (acc, m, i) => (activePairs >= m.pairs ? i : acc),
    -1
  );
  const nextMilestone = MILESTONES[Math.min(currentPhaseIndex + 1, MILESTONES.length - 1)];
  const nextArrTargetM = nextMilestone.arrLow ?? 1;
  const nextValTargetM = nextMilestone.valLow;
  const progressToNext = Math.min(
    1,
    (activePairs / nextMilestone.pairs +
      model.totalArr / 1_000_000 / nextArrTargetM +
      model.valuationM / nextValTargetM) /
      3
  );

  return (
    <main
      className={`${fraunces.variable} ${workSans.variable} min-h-screen antialiased`}
      style={{ backgroundColor: CREAM, color: INK }}
    >
      <div className="mx-auto max-w-5xl px-6 py-14">
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
          style={{ backgroundColor: `${ACCENT}1A`, color: ACCENT }}
        >
          <Gem className="h-3.5 w-3.5" />
          Modèle de scénario — usage interne
        </span>
        <h1
          className="mt-4"
          style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: "clamp(1.8rem, 3.5vw, 2.5rem)" }}
        >
          Ittsui — Trajectoire vers le statut de leader
        </h1>
        <p className="mt-2 max-w-2xl text-sm" style={{ color: MUTED }}>
          Chaque chiffre ci-dessous est calculé en direct à partir des curseurs — ce n&apos;est pas une donnée
          financière réelle rapportée, c&apos;est un outil de scénario pour explorer des hypothèses de croissance.
        </p>

        <div className="mt-10 grid gap-8 lg:grid-cols-5">
          {/* Controls */}
          <div className="space-y-7 rounded-2xl border bg-white p-6 lg:col-span-2" style={{ borderColor: BORDER }}>
            <h2 className="text-xs font-semibold uppercase tracking-wide" style={{ color: MUTED }}>
              Hypothèses
            </h2>

            <Slider
              icon={Users}
              label="Paires actives"
              value={activePairsLog}
              valueLabel={formatCompact(activePairs)}
              min={Math.log10(2_000)}
              max={Math.log10(3_000_000)}
              step={0.01}
              onChange={setActivePairsLog}
            />
            <Slider
              icon={Percent}
              label="Taux de conversion Ittsui Plus"
              value={conversionRate}
              valueLabel={`${conversionRate.toFixed(0)}%`}
              min={0}
              max={40}
              step={1}
              onChange={setConversionRate}
            />
            <Slider
              icon={Coins}
              label="ARPU B2C mensuel"
              value={b2cArpu}
              valueLabel={`€${b2cArpu.toFixed(2)}`}
              min={1}
              max={9.99}
              step={0.1}
              onChange={setB2cArpu}
            />
            <Slider
              icon={Store}
              label="Take-rate B2B par paire / an"
              value={b2bTakeRate}
              valueLabel={`€${b2bTakeRate.toFixed(0)}`}
              min={0}
              max={60}
              step={1}
              onChange={setB2bTakeRate}
            />
            <Slider
              icon={TrendingUp}
              label="Multiple de valorisation (EV/ARR)"
              value={valuationMultiple}
              valueLabel={`${valuationMultiple.toFixed(0)}×`}
              min={3}
              max={25}
              step={1}
              onChange={setValuationMultiple}
            />

            <div>
              <span className="flex items-center gap-2 text-sm font-medium">
                <Globe2 className="h-4 w-4" style={{ color: ACCENT }} />
                Phase d&apos;expansion géographique
              </span>
              <div className="mt-3 space-y-2">
                {COUNTRY_PHASES.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCountryPhase(c.id)}
                    className="flex w-full items-center justify-between rounded-xl border px-3.5 py-2.5 text-left transition-colors"
                    style={
                      countryPhase === c.id
                        ? { borderColor: ACCENT, backgroundColor: `${ACCENT}0D` }
                        : { borderColor: BORDER, backgroundColor: "white" }
                    }
                  >
                    <span>
                      <span className="block text-sm font-medium">{c.label}</span>
                      <span className="block text-xs" style={{ color: MUTED }}>
                        {c.detail}
                      </span>
                    </span>
                    <span className="text-xs font-semibold tabular-nums" style={{ color: ACCENT }}>
                      ×{c.multiplier.toFixed(2)}
                    </span>
                  </button>
                ))}
              </div>
              <p className="mt-2 text-[11px]" style={{ color: MUTED }}>
                Multiplicateur d&apos;expansion appliqué à l&apos;ARR total — TAM et pouvoir d&apos;achat plus
                élevés dans les marchés supplémentaires.
              </p>
            </div>
          </div>

          {/* Outputs */}
          <div className="space-y-6 lg:col-span-3">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border bg-white p-5" style={{ borderColor: BORDER }}>
                <p className="text-xs font-medium uppercase tracking-wide" style={{ color: MUTED }}>
                  MRR total
                </p>
                <p className="mt-1" style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: "1.9rem" }}>
                  {formatMoney(model.totalMrr)}
                </p>
                <p className="text-xs" style={{ color: MUTED }}>
                  {formatFull(model.totalMrr)} / mois
                </p>
              </div>
              <div className="rounded-2xl border p-5 text-white" style={{ backgroundColor: ACCENT, borderColor: ACCENT }}>
                <p className="text-xs font-medium uppercase tracking-wide text-white/80">ARR total</p>
                <p className="mt-1" style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: "1.9rem" }}>
                  {formatMoney(model.totalArr)}
                </p>
                <p className="text-xs text-white/80">{formatFull(model.totalArr)} / an</p>
              </div>
            </div>

            {/* B2C vs B2B split */}
            <div className="rounded-2xl border bg-white p-5" style={{ borderColor: BORDER }}>
              <p className="text-xs font-medium uppercase tracking-wide" style={{ color: MUTED }}>
                Répartition B2C / B2B
              </p>
              <div className="mt-3 flex h-3 overflow-hidden rounded-full" style={{ backgroundColor: BORDER }}>
                <div style={{ width: `${model.b2cShare * 100}%`, backgroundColor: ACCENT }} />
                <div style={{ width: `${model.b2bShare * 100}%`, backgroundColor: INK }} />
              </div>
              <div className="mt-2.5 flex justify-between text-sm">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: ACCENT }} />
                  B2C — {formatMoney(model.b2cArr)} ({(model.b2cShare * 100).toFixed(0)}%)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: INK }} />
                  B2B — {formatMoney(model.b2bArr)} ({(model.b2bShare * 100).toFixed(0)}%)
                </span>
              </div>
              <p className="mt-3 text-[11px]" style={{ color: MUTED }}>
                {formatCompact(model.paidPairs)} paires payantes sur {formatCompact(activePairs)} paires actives.
              </p>
            </div>

            {/* Valuation */}
            <div className="rounded-2xl border bg-white p-5" style={{ borderColor: BORDER }}>
              <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide" style={{ color: MUTED }}>
                <Gem className="h-3.5 w-3.5" />
                Valorisation implicite
              </p>
              <p className="mt-1" style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: "2.1rem" }}>
                {formatMoney(model.valuationM * 1_000_000, "$")}
              </p>
              <p className="text-xs" style={{ color: MUTED }}>
                {formatMoney(model.totalArr, "$")} ARR × {valuationMultiple.toFixed(0)}× — € et $ traités à parité
                pour ce modèle.
              </p>
            </div>

            {/* Milestone roadmap */}
            <div className="rounded-2xl border bg-white p-5" style={{ borderColor: BORDER }}>
              <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide" style={{ color: MUTED }}>
                <Target className="h-3.5 w-3.5" />
                Trajectoire vers Unicorn ($1B+)
              </p>
              <div className="mt-4 space-y-0">
                {MILESTONES.map((m, i) => {
                  const reached = i <= currentPhaseIndex;
                  const isNext = i === currentPhaseIndex + 1;
                  return (
                    <div key={m.phase} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        {reached ? (
                          <CheckCircle2 className="h-5 w-5" style={{ color: GOOD }} />
                        ) : (
                          <Circle className="h-5 w-5" style={{ color: BORDER }} />
                        )}
                        {i < MILESTONES.length - 1 && (
                          <div className="my-1 w-px flex-1" style={{ backgroundColor: reached ? GOOD : BORDER, minHeight: "28px" }} />
                        )}
                      </div>
                      <div className="pb-5">
                        <p className="text-sm font-medium">
                          {m.phase} — {m.name}
                          {isNext && (
                            <span className="ml-2 rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: `${ACCENT}1A`, color: ACCENT }}>
                              PROCHAIN
                            </span>
                          )}
                        </p>
                        <p className="text-xs" style={{ color: MUTED }}>
                          {formatCompact(m.pairs)}+ paires
                          {m.arrLow && ` · $${m.arrLow}${m.arrHigh ? `–${m.arrHigh}` : "+"}M ARR`}
                          {" · "}${m.valLow}
                          {m.valHigh ? `–${m.valHigh}` : "+"}M valorisation
                        </p>
                        {isNext && (
                          <div className="mt-2">
                            <div className="h-1.5 w-full max-w-[220px] overflow-hidden rounded-full" style={{ backgroundColor: BORDER }}>
                              <div className="h-full rounded-full" style={{ width: `${progressToNext * 100}%`, backgroundColor: ACCENT }} />
                            </div>
                            <p className="mt-1 flex items-center gap-1 text-[11px]" style={{ color: MUTED }}>
                              {(progressToNext * 100).toFixed(0)}% du chemin (moyenne paires / ARR / valorisation)
                              <ArrowRight className="h-3 w-3" />
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
