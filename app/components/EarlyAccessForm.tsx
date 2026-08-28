"use client";
// /app/components/EarlyAccessForm.tsx
// Extracted out of app/page.tsx so that file can be a Server Component.
// Real feature request: a way for someone not ready for the full setup
// flow to leave an email for early tester access, visible on the landing
// page itself rather than buried in a footer or a separate page.

import { useState } from "react";
import { MUTED, ACCENT, BORDER } from "@/lib/theme";

export function EarlyAccessForm() {
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
        body: JSON.stringify({ email }),
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
        <p className="text-sm font-medium">
          {status === "already" ? "Vous êtes déjà sur la liste — merci !" : "C'est noté, merci !"}
        </p>
        <p className="mt-1 text-sm" style={{ color: MUTED }}>
          On vous recontacte dès qu&apos;une place se libère pour tester Ittsui en avant-première.
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
      <p className="text-sm font-medium">Accès anticipé</p>
      <p className="mt-1 text-sm" style={{ color: MUTED }}>
        Envie de tester Ittsui avant tout le monde ? Laissez votre e-mail.
      </p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="vous@exemple.com"
          className="w-full rounded-full border bg-white px-4 py-2.5 text-sm outline-none transition-colors focus:border-current"
          style={{ borderColor: BORDER }}
        />
        <button
          type="submit"
          disabled={status === "submitting"}
          className="shrink-0 rounded-full px-6 py-2.5 text-sm font-medium text-white transition-transform hover:scale-[1.02] disabled:opacity-60"
          style={{ backgroundColor: ACCENT }}
        >
          {status === "submitting" ? "..." : "Je m'inscris"}
        </button>
      </div>
      {status === "error" && (
        <p className="mt-2 text-xs" style={{ color: ACCENT }}>
          Une erreur est survenue, réessayez.
        </p>
      )}
    </form>
  );
}
