"use client";
// /app/components/EarlyAccessForm.tsx
// Extracted out of app/page.tsx so that file can be a Server Component.
// Real feature request: a way for someone not ready for the full setup
// flow to leave an email for early tester access, visible on the landing
// page itself rather than buried in a footer or a separate page.

import { useState } from "react";
import { MUTED, ACCENT, BORDER } from "@/lib/theme";
import type { Locale } from "@/lib/i18n";

const COPY: Record<
  Locale,
  {
    already: string;
    done: string;
    followUp: string;
    title: string;
    lede: string;
    placeholder: string;
    submit: string;
    error: string;
  }
> = {
  fr: {
    already: "Vous êtes déjà sur la liste — merci !",
    done: "C'est noté, merci !",
    followUp: "On vous recontacte dès qu'une place se libère pour tester Ittsui en avant-première.",
    title: "Accès anticipé",
    lede: "Envie de tester Ittsui avant tout le monde ? Laissez votre e-mail.",
    placeholder: "vous@exemple.com",
    submit: "Je m'inscris",
    error: "Une erreur est survenue, réessayez.",
  },
  en: {
    already: "You're already on the list. Thank you!",
    done: "Got it, thank you!",
    followUp: "We'll get back to you as soon as a spot opens up to try Ittsui early.",
    title: "Early access",
    lede: "Want to try Ittsui before everyone else? Leave your email.",
    placeholder: "you@example.com",
    submit: "Sign me up",
    error: "Something went wrong. Please try again.",
  },
  ja: {
    already: "すでに登録済みです。ありがとうございます！",
    done: "登録しました。ありがとうございます！",
    followUp: "先行テストの枠が空き次第、ご連絡します。",
    title: "先行アクセス",
    lede: "いち早くIttsuiを試してみませんか？メールアドレスをご登録ください。",
    placeholder: "you@example.com",
    submit: "登録する",
    error: "エラーが発生しました。もう一度お試しください。",
  },
  es: {
    already: "Ya estás en la lista. ¡Gracias!",
    done: "¡Listo, gracias!",
    followUp: "Te escribimos en cuanto haya un lugar para probar Ittsui antes que nadie.",
    title: "Acceso anticipado",
    lede: "¿Quieres probar Ittsui antes que nadie? Deja tu correo.",
    placeholder: "tu@ejemplo.com",
    submit: "Apuntarme",
    error: "Algo salió mal, inténtalo de nuevo.",
  },
  he: {
    already: "כבר נרשמת. תודה!",
    done: "נרשם, תודה!",
    followUp: "ניצור קשר ברגע שיתפנה מקום לנסות את Ittsui לפני כולם.",
    title: "גישה מוקדמת",
    lede: "רוצים לנסות את Ittsui לפני כולם? השאירו את המייל.",
    placeholder: "you@example.com",
    submit: "להירשם",
    error: "משהו השתבש, נסו שוב.",
  },
};

export function EarlyAccessForm({ lang = "fr" }: { lang?: Locale } = {}) {
  const t = COPY[lang];
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "done" | "already" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "submitting") return;
    setStatus("submitting");
    try {
      const res = await fetch("/api/early-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // The page's language, so a reply can be written in it.
        body: JSON.stringify({ email, lang }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error);
      setStatus(data.status === "already_registered" ? "already" : "done");
    } catch {
      setStatus("error");
    }
  }

  if (status === "done" || status === "already") {
    return (
      <div className="rounded-2xl border p-6 text-center" style={{ borderColor: BORDER, backgroundColor: "white" }}>
        <p className="text-sm font-medium">{status === "already" ? t.already : t.done}</p>
        <p className="mt-1 text-sm" style={{ color: MUTED }}>
          {t.followUp}
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border p-6 text-center"
      style={{ borderColor: BORDER, backgroundColor: "white" }}
    >
      <p className="text-sm font-medium">{t.title}</p>
      <p className="mt-1 text-sm" style={{ color: MUTED }}>
        {t.lede}
      </p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t.placeholder}
          className="w-full rounded-full border bg-white px-4 py-2.5 text-sm outline-none transition-colors focus:border-current"
          style={{ borderColor: BORDER }}
        />
        <button
          type="submit"
          disabled={status === "submitting"}
          className="shrink-0 rounded-full px-6 py-2.5 text-sm font-medium text-white transition-transform hover:scale-[1.02] disabled:opacity-60"
          style={{ backgroundColor: ACCENT }}
        >
          {status === "submitting" ? "..." : t.submit}
        </button>
      </div>
      {status === "error" && (
        <p className="mt-2 text-xs" style={{ color: ACCENT }}>
          {t.error}
        </p>
      )}
    </form>
  );
}
