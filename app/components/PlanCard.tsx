// /app/components/PlanCard.tsx
// The person's plan in the app (lib/plan.ts):
//   - PlanCard, on the dashboard: Plus, the trial's days left, or this
//     month's free rendez-vous, with the way to Plus (and the founding
//     code) or to the billing portal, and their invite link (a month of
//     Plus for both people, lib/referral.ts);
//   - PlusOffer, where the free rendez-vous runs out (the request form):
//     why, and the way to Plus;
//   - YourTurn, for a guest who just accepted a rendez-vous: the way to
//     start their own, with the sender's invite code on the link.
// They read the plan from /api/plan and never decide anything themselves.

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { User } from "firebase/auth";
import { ACCENT, BORDER, INK, MUTED } from "@/lib/theme";
import { pagePath } from "@/lib/i18n";
import { FOUNDING_CODE, PLUS_PRICE_LABEL } from "@/lib/planConfig";
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

/** The founding offer, typed at Stripe Checkout (promotion codes are on). */
function FoundingHint() {
  const t = useT(PLAN);
  return (
    <p className="mt-1.5 text-xs" style={{ color: MUTED }}>
      {t("Code {code} : -50 % pendant 3 mois, pour les 100 premiers membres.", { code: FOUNDING_CODE })}
    </p>
  );
}

/** "Invite someone": the home page with their code, shared or copied. */
function InviteRow({ code, referrals }: { code: string; referrals: number }) {
  const { lang } = useLang();
  const t = useT(PLAN);
  const [copied, setCopied] = useState(false);
  async function share() {
    const url = new URL(pagePath("home", lang), window.location.origin);
    url.searchParams.set("ref", code);
    const text = t("Je bloque du temps pour les gens qui comptent avec Ittsui. Avec mon lien, tu as un mois de Plus offert :");
    try {
      if (navigator.share) {
        await navigator.share({ title: "Ittsui", text, url: url.toString() });
        return;
      }
      await navigator.clipboard.writeText(`${text} ${url.toString()}`);
      setCopied(true);
    } catch {
      // Share sheet dismissed: nothing to do.
    }
  }
  return (
    <div className="mt-3 border-t pt-3" style={{ borderColor: BORDER }}>
      <p className="text-xs" style={{ color: INK }}>
        {t("Invitez un proche : un mois de Plus offert à chacun.")}
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <button onClick={share} className="rounded-full border px-3 py-1.5 text-xs font-medium" style={{ borderColor: ACCENT, color: ACCENT }}>
          {copied ? t("Lien copié") : t("Partager mon lien")}
        </button>
        {referrals > 0 && (
          <span className="text-xs" style={{ color: MUTED }}>
            {t("Inscrits grâce à vous : {n}", { n: referrals })}
          </span>
        )}
      </div>
    </div>
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
  const invite = plan.referralCode ? <InviteRow code={plan.referralCode} referrals={plan.referrals} /> : null;

  if (plan.tier === "plus") {
    return (
      <div className="mt-3 rounded-2xl border px-4 py-3" style={{ borderColor: BORDER }}>
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium" style={{ backgroundColor: `${ACCENT}14`, color: ACCENT }}>
            {t("✓ Ittsui Plus")}
          </span>
          {plan.manageable && (
            <button onClick={() => upgrade.run("portal")} disabled={upgrade.busy} className="text-xs underline underline-offset-4 disabled:opacity-60" style={{ color: MUTED }}>
              {upgrade.busy ? "..." : t("Gérer l'abonnement")}
            </button>
          )}
        </div>
        {upgrade.error && <p className="mt-1.5 text-xs" style={{ color: ACCENT }}>{upgrade.error}</p>}
        {invite}
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
        <FoundingHint />
      </div>
      {upgrade.error && <p className="mt-1.5 text-xs" style={{ color: ACCENT }}>{upgrade.error}</p>}
      {invite}
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
        <FoundingHint />
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

/**
 * The guest's next step, right after accepting a rendez-vous: the moment
 * they've just felt Ittsui from the receiving side. The link carries the
 * sender's invite code (middleware.ts keeps it), so if the guest starts,
 * both get a month of Plus.
 */
export function YourTurn({ senderName, senderRef }: { senderName: string | null; senderRef: string | null }) {
  const t = useT(PLAN);
  const href = senderRef ? `/request/new?ref=${senderRef}` : "/request/new";
  return (
    <div className="mt-6 rounded-2xl border px-5 py-5 text-left" style={{ borderColor: ACCENT }}>
      <p style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: "1.2rem", color: INK }}>{t("À votre tour")}</p>
      <p className="mt-2 text-sm" style={{ color: MUTED }}>
        {t("Bloquez du temps avec les personnes qui comptent pour vous : Ittsui propose le lieu et l'heure, il ne reste qu'à confirmer.")}
      </p>
      <p className="mt-2 text-xs font-medium" style={{ color: ACCENT }}>
        {senderRef && senderName
          ? t("Avec l'invitation de {name} : 14 jours de Plus, plus un mois offert.", { name: senderName })
          : t("14 jours de Plus offerts, sans carte bancaire.")}
      </p>
      <Link
        href={href}
        className="mt-4 inline-flex w-full items-center justify-center rounded-full py-3 text-sm font-medium text-white"
        style={{ backgroundColor: ACCENT }}
      >
        {t("Commencer")}
      </Link>
    </div>
  );
}
