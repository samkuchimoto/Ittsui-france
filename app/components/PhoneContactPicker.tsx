"use client";
// Shared "browse the whole phone address book in-app, tap someone, done"
// UI — extracted out of RequestFormClient.tsx so /contacts and /setup can
// offer the exact same flexibility instead of staying limited to the
// older one-at-a-time OS picker dialog (lib/nativeContacts.ts's
// pickNativeContact()). Real request behind this: "like I can WhatsApp
// people directly from my phone contacts, I want to Ittsui people
// directly" — that should hold everywhere a recipient gets chosen, not
// just on one screen.

import { useState } from "react";
import { listNativeContacts, type PickedContact } from "@/lib/nativeContacts";
import { MUTED, BORDER, INK } from "@/lib/theme";

export function PhoneContactPicker({
  onPick,
  onOpenChange,
  triggerLabel = "Voir tous mes contacts",
  triggerClassName,
  triggerStyle,
}: {
  onPick: (contact: PickedContact) => void;
  // Lets a caller with other UI to hide while this list is open (saved-
  // contact chips, manual fields) react to that without needing to manage
  // the contacts array itself — this component owns that state entirely.
  onOpenChange?: (open: boolean) => void;
  triggerLabel?: string;
  triggerClassName: string;
  triggerStyle: React.CSSProperties;
}) {
  const [contacts, setContacts] = useState<PickedContact[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  async function open() {
    setLoading(true);
    try {
      setContacts(await listNativeContacts());
      onOpenChange?.(true);
    } finally {
      setLoading(false);
    }
  }

  function close() {
    setContacts(null);
    setSearch("");
    onOpenChange?.(false);
  }

  function pick(c: PickedContact) {
    close(); // close first — tap, then go, not tap-then-still-browsing
    onPick(c);
  }

  if (!contacts) {
    return (
      <button type="button" onClick={open} disabled={loading} className={triggerClassName} style={triggerStyle}>
        {loading ? "Chargement..." : triggerLabel}
      </button>
    );
  }

  return (
    <div className="mt-2 rounded-2xl border p-3" style={{ borderColor: BORDER }}>
      <div className="flex items-center gap-2">
        <input
          type="text"
          placeholder="Rechercher un nom..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoFocus
          className="w-full rounded-lg border px-3 py-2 text-sm"
          style={{ borderColor: BORDER }}
        />
        <button type="button" onClick={close} className="shrink-0 text-xs underline underline-offset-4" style={{ color: MUTED }}>
          Fermer
        </button>
      </div>
      {contacts.length === 0 ? (
        <p className="mt-3 text-sm" style={{ color: MUTED }}>
          Aucun contact trouvé sur ce téléphone.
        </p>
      ) : (
        <div className="mt-2 max-h-72 divide-y overflow-y-auto" style={{ borderColor: BORDER }}>
          {contacts
            .filter((c) => (c.name ?? "").toLowerCase().includes(search.trim().toLowerCase()))
            .map((c, i) => (
              <button
                key={`${c.name}-${c.phone ?? c.email}-${i}`}
                type="button"
                onClick={() => pick(c)}
                className="block w-full py-3 text-left"
              >
                <span className="block truncate text-sm font-medium" style={{ color: INK }}>
                  {c.name}
                </span>
                <span className="block truncate text-xs" style={{ color: MUTED }}>
                  {c.phone || c.email}
                </span>
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
