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
import { Capacitor } from "@capacitor/core";
import { auth, watchAuthState } from "@/lib/firebase";
import type { Contact } from "@/lib/types";
import { isValidEmail } from "@/lib/validation";
import { pickNativeContact, type PickedContact } from "@/lib/nativeContacts";
import { PhoneContactPicker } from "@/app/components/PhoneContactPicker";
import { INK, MUTED, ACCENT, BORDER } from "@/lib/theme";
import { FriendlyLoading } from "@/app/components/FriendlyLoading";
import { PageMascotHeader } from "@/app/components/PageMascotHeader";

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
  // Phone first, on purpose: real people know a friend's phone number,
  // not their email, especially away from a desk (2026-08-25 real-user
  // test — see /request/new's identical fields for the fuller reasoning).
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [isNative, setIsNative] = useState(false);
  const [importing, setImporting] = useState(false);
  // Collapsed by default — see RequestFormClient.tsx's identical toggle for
  // the real Gen Z tester feedback ("avec l'email c'est pour faire quoi")
  // this responds to. Auto-revealed whenever a value already exists
  // (contact import), never hidden once shown.
  const [showEmail, setShowEmail] = useState(false);

  useEffect(() => watchAuthState((u) => setUser(u ?? false)), []);

  // Checked post-mount, not during render: Capacitor's platform check
  // only resolves correctly in the browser, so seeding it into render
  // directly would render "web" on the server and "native" on the
  // client's first paint — the same SSR/client mismatch already worked
  // around elsewhere in this app (see lib/nativeContacts.ts).
  useEffect(() => setIsNative(Capacitor.isNativePlatform()), []);

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
    if (!name.trim()) {
      setError("Le nom est requis.");
      return;
    }
    const hasEmail = email.trim().length > 0;
    const hasPhone = phone.trim().length > 0;
    if (!hasEmail && !hasPhone) {
      setError("Indiquez un e-mail ou un numéro de téléphone.");
      return;
    }
    if (hasEmail && !isValidEmail(email)) {
      setError("Cette adresse e-mail ne semble pas valide.");
      return;
    }
    if (!auth.currentUser) return;
    setSaving(true);
    try {
      const idToken = await auth.currentUser.getIdToken();
      const res = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ name, ...(hasEmail ? { email } : {}), ...(hasPhone ? { phone } : {}) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Une erreur est survenue.");
      setName("");
      setPhone("");
      setEmail("");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue.");
    } finally {
      setSaving(false);
    }
  }

  // Shared by handleImportContact (OS single-pick dialog) and the
  // PhoneContactPicker below (in-app browsable list) — both hand back the
  // same PickedContact shape.
  function applyPickedContact(picked: PickedContact) {
    if (picked.name) setName(picked.name);
    const hasValidEmail = Boolean(picked.email && isValidEmail(picked.email));
    const hasPhone = Boolean(picked.phone);
    // Wholesale replace with what THIS contact actually has (so a stale
    // manually-typed value from before doesn't linger and end up
    // mismatched with the new pick), but keep BOTH when the contact has
    // both — a contact with an email and a phone shouldn't lose the phone
    // (and with it the WhatsApp/SMS option later) just because it also
    // has an email. Same fix as RequestFormClient.tsx's identical
    // applyPickedContact.
    setEmail(hasValidEmail ? picked.email! : "");
    setPhone(hasPhone ? picked.phone! : "");
    if (!hasValidEmail && !hasPhone) {
      setError("Ce contact n'a ni e-mail ni numéro de téléphone enregistré.");
    }
  }

  async function handleImportContact() {
    setError(null);
    setImporting(true);
    try {
      const picked = await pickNativeContact();
      if (!picked) return; // not native, permission denied, or cancelled — leave the form as-is
      applyPickedContact(picked);
    } finally {
      setImporting(false);
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
          <Link href="/" style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: "1.1rem" }}>
            Ittsui
          </Link>
          <Link href="/dashboard" className="text-xs underline underline-offset-4" style={{ color: MUTED }}>
            Tableau de bord
          </Link>
        </div>
        <PageMascotHeader />
        <h1 className="mt-4" style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: "1.75rem" }}>
          Mes contacts
        </h1>
        <p className="mt-2 text-sm" style={{ color: MUTED }}>
          Famille, ami(e)s, partenaire — pas de messagerie, juste de quoi leur envoyer une demande de rendez-vous en
          un geste.
        </p>

        <div className="mt-6 space-y-2">
          {isNative && (
            <button
              onClick={handleImportContact}
              disabled={importing}
              className="w-full rounded-lg border py-2.5 text-sm font-medium disabled:opacity-60"
              style={{ borderColor: BORDER, color: INK }}
            >
              {importing ? "Import..." : "Importer depuis mes contacts"}
            </button>
          )}
          {isNative && (
            <PhoneContactPicker
              onPick={applyPickedContact}
              triggerClassName="w-full rounded-lg border py-2.5 text-sm font-medium disabled:opacity-60"
              triggerStyle={{ borderColor: BORDER, color: INK }}
            />
          )}
          <input
            type="text"
            placeholder="Nom"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border px-3 py-2.5 text-sm"
            style={{ borderColor: BORDER }}
          />
          <input
            type="tel"
            placeholder="Numéro de téléphone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full rounded-lg border px-3 py-2.5 text-sm"
            style={{ borderColor: BORDER }}
          />
          {showEmail || email.trim().length > 0 ? (
            <>
              <p className="text-xs" style={{ color: MUTED }}>
                Ou, si vous l&apos;avez, son e-mail :
              </p>
              <input
                type="email"
                placeholder="E-mail (optionnel)"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border px-3 py-2.5 text-sm"
                style={{ borderColor: BORDER }}
              />
            </>
          ) : (
            <button
              type="button"
              onClick={() => setShowEmail(true)}
              className="text-xs font-medium underline underline-offset-4"
              style={{ color: MUTED }}
            >
              + Ajouter aussi un e-mail
            </button>
          )}
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
                      {c.email || c.phone}
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
