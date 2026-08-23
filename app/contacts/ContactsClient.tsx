"use client";
// /app/contacts/ContactsClient.tsx
// Standalone address-book management: build the list upfront (family,
// friends, partner) rather than only ever gaining a contact as a side
// effect of sending them a request from /request/new. Same /api/contacts
// backend either screen uses — this is just the other way in.

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fraunces, Work_Sans } from "next/font/google";
import type { User } from "firebase/auth";
import { auth, watchAuthState } from "@/lib/firebase";
import type { Contact } from "@/lib/types";
import { INK, MUTED, ACCENT, BORDER } from "@/lib/theme";
import { FriendlyLoading } from "@/app/components/FriendlyLoading";

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

export default function ContactsClient() {
  const router = useRouter();
  const [user, setUser] = useState<User | false | null>(null);
  const [contacts, setContacts] = useState<Contact[] | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => watchAuthState((u) => setUser(u ?? false)), []);

  useEffect(() => {
    if (user === null) return;
    if (!user) {
      router.push("/setup");
      return;
    }
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function refresh() {
    if (!auth.currentUser) return;
    const idToken = await auth.currentUser.getIdToken();
    const res = await fetch("/api/contacts", { headers: { Authorization: `Bearer ${idToken}` } });
    if (res.ok) {
      const data = await res.json();
      setContacts(data.contacts ?? []);
    }
  }

  async function handleAdd() {
    setError(null);
    if (!name.trim() || !email.trim()) {
      setError("Le nom et l'e-mail sont requis.");
      return;
    }
    if (!auth.currentUser) return;
    setSaving(true);
    try {
      const idToken = await auth.currentUser.getIdToken();
      const res = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ name, email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Une erreur est survenue.");
      setName("");
      setEmail("");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue.");
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(id: string) {
    if (!auth.currentUser) return;
    const idToken = await auth.currentUser.getIdToken();
    await fetch(`/api/contacts?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${idToken}` },
    });
    await refresh();
  }

  if (user === null || (user && contacts === null)) {
    return (
      <main className={`${fraunces.variable} ${workSans.variable} min-h-screen bg-[#FFFDF9] antialiased`} style={{ color: INK }}>
        <div className="mx-auto max-w-md px-6 py-14 text-center text-sm" style={{ color: MUTED }}>
          <FriendlyLoading />
        </div>
      </main>
    );
  }

  return (
    <main className={`${fraunces.variable} ${workSans.variable} min-h-screen bg-[#FFFDF9] antialiased`} style={{ color: INK }}>
      <div className="mx-auto max-w-md px-6 py-12">
        <div className="flex items-center justify-between">
          <span style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: "1.1rem" }}>Ittsui</span>
          <Link href="/dashboard" className="text-xs underline underline-offset-4" style={{ color: MUTED }}>
            Tableau de bord
          </Link>
        </div>
        <h1 className="mt-4" style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: "1.75rem" }}>
          Mes contacts
        </h1>
        <p className="mt-2 text-sm" style={{ color: MUTED }}>
          Famille, ami(e)s, partenaire — pas de messagerie, juste de quoi leur envoyer une demande de rendez-vous en
          un geste.
        </p>

        <div className="mt-6 space-y-2">
          <input
            type="text"
            placeholder="Nom"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border px-3 py-2.5 text-sm"
            style={{ borderColor: BORDER }}
          />
          <input
            type="email"
            placeholder="E-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border px-3 py-2.5 text-sm"
            style={{ borderColor: BORDER }}
          />
          {error && (
            <p className="text-sm" style={{ color: ACCENT }}>
              {error}
            </p>
          )}
          <button
            onClick={handleAdd}
            disabled={saving}
            className="w-full rounded-full py-3 text-sm font-medium text-white transition-transform hover:scale-[1.01] disabled:opacity-60"
            style={{ backgroundColor: ACCENT }}
          >
            {saving ? "Ajout..." : "Ajouter à mes contacts"}
          </button>
        </div>

        <div className="mt-8 border-t pt-6" style={{ borderColor: BORDER }}>
          {contacts && contacts.length > 0 ? (
            <ul className="divide-y" style={{ borderColor: BORDER }}>
              {contacts.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{c.name}</p>
                    <p className="truncate text-xs" style={{ color: MUTED }}>
                      {c.email}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <Link
                      href={`/request/new?contactId=${c.id}`}
                      className="text-xs font-medium underline underline-offset-4"
                      style={{ color: ACCENT }}
                    >
                      Proposer un RDV
                    </Link>
                    <button
                      onClick={() => handleRemove(c.id)}
                      className="text-xs underline underline-offset-4"
                      style={{ color: MUTED }}
                    >
                      Supprimer
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm" style={{ color: MUTED }}>
              Aucun contact pour l&apos;instant.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
