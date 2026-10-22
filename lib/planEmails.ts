// /lib/planEmails.ts
// The free plan's limit email (lib/plan.ts): when the weekly ritual skips
// a relationship because the person who started it has used this month's
// free rendez-vous, they hear why, once a month per relationship
// (Pair.planLimitNotice), with the way to Plus. Server-only.

import { adminDb } from "@/lib/firebaseAdmin";
import { emailButton, emailShell, escapeHtml } from "@/lib/emailTemplates";
import { langOf } from "@/lib/i18n";
import { PLUS_PRICE_LABEL } from "@/lib/planConfig";
import type { Pair } from "@/lib/types";

const COPY = {
  fr: {
    subject: "Ittsui : votre rendez-vous gratuit de ce mois est utilisé",
    title: "Le rendez-vous gratuit du mois est passé",
    body: "Cette semaine, Ittsui n'a pas proposé de moment avec {name} : le plan gratuit comprend un rendez-vous par mois, et celui de ce mois est déjà utilisé. Avec Ittsui Plus ({price} par mois, sans engagement), les propositions reprennent chaque semaine, avec toutes les personnes qui comptent.",
    button: "Passer à Plus",
    after: "Le mois prochain, votre rendez-vous gratuit revient tout seul.",
  },
  en: {
    subject: "Ittsui: this month's free rendez-vous is used",
    title: "This month's free rendez-vous is used",
    body: "This week Ittsui didn't propose a moment with {name}: the free plan includes one rendez-vous a month, and this month's is already used. With Ittsui Plus ({price} a month, cancel anytime), proposals come back every week, with everyone who matters.",
    button: "Go Plus",
    after: "Next month, your free rendez-vous comes back on its own.",
  },
  ja: {
    subject: "Ittsui：今月の無料ランデヴーはご利用済みです",
    title: "今月の無料ランデヴーはご利用済みです",
    body: "今週は{name}さんとの時間をご提案できませんでした。無料プランのランデヴーは月1回までで、今月分はすでにご利用済みです。Ittsui Plus（月額{price}、いつでも解約可能）なら、大切な人たちとの提案が毎週届きます。",
    button: "Plusにする",
    after: "来月になると、無料のランデヴーはまた自動で使えるようになります。",
  },
} as const;

export async function notifyPlanLimit(pair: Pair, month: string): Promise<void> {
  if (pair.planLimitNotice === month) return;
  const owner = pair.userIds[0];
  const email: string | undefined = (await adminDb.collection("users").doc(owner).get()).data()?.email;
  const lang = langOf(pair.lang);
  const c = COPY[lang];
  if (email && process.env.RESEND_API_KEY) {
    const body = c.body.replace("{name}", pair.partnerName).replace("{price}", PLUS_PRICE_LABEL[lang]);
    const link = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`;
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
      body: JSON.stringify({
        from: "Ittsui <hello@ittsui.fr>",
        to: email,
        subject: c.subject,
        text: `${body}\n\n${c.button} : ${link}\n\n${c.after}`,
        html: emailShell({
          mascotName: "pika",
          title: escapeHtml(c.title),
          bodyHtml: `<p style="font-size: 15px; line-height: 1.6;">${escapeHtml(body)}</p>${emailButton(link, escapeHtml(c.button))}<p style="font-size: 13px; color: #78716C; text-align: center;">${escapeHtml(c.after)}</p>`,
        }),
      }),
    });
    if (!res.ok) console.error(`planEmails: limit email failed (${res.status}) for pair ${pair.id}`);
  }
  await adminDb.collection("pairs").doc(pair.id).update({ planLimitNotice: month });
}
