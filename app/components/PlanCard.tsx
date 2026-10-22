// /app/components/PlanCard.tsx
// The person's plan in the app (lib/plan.ts):
//   - PlanCard, on the dashboard: Plus, the trial's days left, or this
//     month's free rendez-vous, with the way to Plus or to the billing
//     portal;
//   - PlusOffer, where the free rendez-vous runs out (the request form):
//     why, and the way to Plus.
// Both read the plan from /api/plan and never decide anything themselves.

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { User } from "firebase/auth";
import { ACCENT, BORDER, INK, MUTED } from "@/lib/theme";
import { PLUS_PRICE_LABEL } from "@/lib/planConfig";
import { fetchPlan, openBillingPortal, startPlusCheckout, type Plan } from "@/lib/planClient";
import { useLang, useT } from "@/app/components/site/LangProvider";
import { PLAN } from "./plan.i18n";

const DAY = 24 * 60 * 60 * 1000;

function useUpgrade(user: User) {
  const { lang } = useLang();
  const t = useT(PLAN);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function run(action: "checkout" | "portal", before?: () => void) {
    if (busy) return;
    setBusy(true);
    setError(null);
    before?.();
    const failure = action === "checkout" ? await startPlusCheckout(user, lang) : await openBillingPortal(user, lang);
    if (failure) {
      setError(failure === "not_configured" ? t("Le paiement n'est pas encore activé, revenez bientôt.") : t("Une erreur est survenue."));
      setBusy(false);
    }
  }
  return { busy, error, run };
}

function UpgradeButton({ busy, onClick }: { busy: boolean; onClick: () => void }) {
  const { lang } = useLang();
  const t = useT(PLAN);
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-medium text-white transition-transform hover:scale-[1.02] disabled:opacity-60"
      style={{ backgroundColor: ACCENT }}
    >
      {busy ? "..." : t("Passer à Plus, {price}/mois", { price: PLUS_PRICE_LABEL[lang] })}
    </button>
  );
}

export function PlanCard({ user }: { user: User }) {
  const t = useT(PLAN);
  const [plan, setPlan] = useState<Plan | null>(null);
  const upgrade = useUpgrade(user);

  useEffect(() => {
    let live = true;
    fetchPlan(user).then((p) => live && setPlan(p));
    return () => {
      live = false;
    };
  }, [user]);

  if (!plan) return null;

  if (plan.tier === "plus") {
    return (
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium" style={{ backgroundColor: `${ACCENT}14`, color: ACCENT }}>
          {t("✓ Ittsui Plus")}
        </span>
        {plan.manageable && (
          <button onClick={() => upgrade.run("portal")} disabled={upgrade.busy} className="text-xs underline underline-offset-4 disabled:opacity-60" style={{ color: MUTED }}>
            {upgrade.busy ? "..." : t("Gérer l'abonnement")}
          </button>
        )}
        {upgrade.error && <p className="w-full text-xs" style={{ color: ACCENT }}>{upgrade.error}</p>}
      </div>
    );
  }

  const daysLeft = Math.ceil((new Date(plan.trialEndsAt).getTime() - Date.now()) / DAY);
  return (
    <div className="mt-3 rounded-2xl border px-4 py-3" style={{ borderColor: BORDER }}>
      <p className="text-sm font-medium" style={{ color: INK }}>
        {plan.tier === "trial"
          ? daysLeft > 1
            ? t("Essai Plus : encore {n} jours", { n: daysLeft })
            : t("Essai Plus : dernier jour")
          : t("Plan gratuit : {used}/{limit} rendez-vous ce mois-ci", { used: Math.min(plan.used, plan.limit ?? 1), limit: plan.limit ?? 1 })}
      </p>
      <p className="mt-1 text-xs" style={{ color: MUTED }}>
        {plan.tier === "trial" ? t("Ensuite, un rendez-vous par mois reste gratuit.") : t("Avec Plus : chaque semaine, sans limite, sans engagement.")}
      </p>
      <div className="mt-3">
        <UpgradeButton busy={upgrade.busy} onClick={() => upgrade.run("checkout")} />
      </div>
      {upgrade.error && <p className="mt-1.5 text-xs" style={{ color: ACCENT }}>{upgrade.error}</p>}
    </div>
  );
}

/** Shown instead of sending, once the free rendez-vous is used. `before` saves the draft. */
export function PlusOffer({ user, before }: { user: User; before?: () => void }) {
  const t = useT(PLAN);
  const upgrade = useUpgrade(user);
  return (
    <div className="rounded-2xl border px-5 py-6 text-center" style={{ borderColor: ACCENT }}>
      <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: "1.35rem", color: INK }}>{t("Votre rendez-vous gratuit du mois est utilisé")}</h2>
      <p className="mt-3 text-sm" style={{ color: MUTED }}>
        {t(
          "Le plan gratuit comprend un rendez-vous par mois. Avec Ittsui Plus, proposez autant de moments que vous voulez, chaque semaine, à toutes les personnes qui comptent."
        )}
      </p>
      <div className="mt-5">
        <UpgradeButton busy={upgrade.busy} onClick={() => upgrade.run("checkout", before)} />
      </div>
      <p className="mt-2 text-xs" style={{ color: MUTED }}>
        {t("Sans engagement, résiliable à tout moment.")}
      </p>
      {upgrade.error && <p className="mt-2 text-xs" style={{ color: ACCENT }}>{upgrade.error}</p>}
      <Link href="/dashboard" className="mt-4 inline-block text-xs underline underline-offset-4" style={{ color: MUTED }}>
        {t("Retour au tableau de bord")}
      </Link>
    </div>
  );
}
