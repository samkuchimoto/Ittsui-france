"use client";
// /app/geste/[gestureId]/page.tsx
// What a recipient lands on from the "envoyer un geste" link. Public,
// no login (same reasoning as /request/[requestId]: an unguessable link
// is the whole point of a low-friction gesture, not another account to
// create). Deliberately shows no delivery/tracking state — see
// lib/gestureLinks.ts: this app never claims to have purchased or
// shipped anything, only that the sender wanted them to know.
//
// For a physical gesture (any mode but "message"), the recipient can
// reply with how they'd like to actually receive it — an address, or
// in person next time — via PATCH /api/gestures/[gestureId]. Relayed
// back to the sender by email if they left one at send time.

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Fraunces, Work_Sans } from "next/font/google";
import { Mascot } from "@/app/components/Mascot";
import { FriendlyLoading } from "@/app/components/FriendlyLoading";
import { CURATED_ITEM_LABEL } from "@/lib/gestureLinks";
import type { GestureMode, CuratedGestureItem, GestureRecipientChoice } from "@/lib/types";
import { INK, MUTED, ACCENT, BORDER } from "@/lib/theme";

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

interface GesturePreview {
  senderName: string;
  recipientName: string;
  mode: GestureMode;
  itemDescription: string | null;
  item: CuratedGestureItem | null;
  note: string | null;
  recipientChoice: GestureRecipientChoice | null;
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main
      className={`${fraunces.variable} ${workSans.variable} min-h-screen bg-[#FFFDF9] antialiased`}
      style={{ color: INK }}
    >
      <div className="mx-auto max-w-md px-6 py-14">
        <Link href="/" className="text-sm" style={{ color: MUTED }}>
          ← Ittsui
        </Link>
        {children}
      </div>
    </main>
  );
}

export default function GesturePage() {
  const params = useParams();
  const gestureId = params?.gestureId as string;
  const [preview, setPreview] = useState<GesturePreview | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [addressMode, setAddressMode] = useState(false);
  const [address, setAddress] = useState("");
  const [replying, setReplying] = useState(false);

  useEffect(() => {
    if (!gestureId) return;
    fetch(`/api/gestures/${gestureId}`)
      .then((res) => {
        if (!res.ok) throw new Error("not found");
        return res.json();
      })
      .then((data) => {
        setPreview(data);
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }, [gestureId]);

  async function sendChoice(choice: GestureRecipientChoice, addr?: string) {
    setReplying(true);
    try {
      const res = await fetch(`/api/gestures/${gestureId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ choice, ...(addr ? { address: addr } : {}) }),
      });
      if (!res.ok) throw new Error("failed");
      setPreview((current) => (current ? { ...current, recipientChoice: choice } : current));
    } catch {
      // Silent — the recipient's own read-only view is more important
      // than a retry loop for a nice-to-have reply; the sender's email
      // notification simply won't fire, no data was lost or corrupted.
    } finally {
      setReplying(false);
    }
  }

  if (status === "loading") {
    return (
      <Shell>
        <div className="mt-10">
          <FriendlyLoading />
        </div>
      </Shell>
    );
  }

  if (status === "error" || !preview) {
    return (
      <Shell>
        <div className="mt-10 text-center">
          <Mascot name="kokoro" variant="confused" size="lg" />
          <p className="mt-4 text-sm" style={{ color: MUTED }}>
            Ce lien n&apos;existe plus ou n&apos;est plus valide.
          </p>
        </div>
      </Shell>
    );
  }

  const isPhysical = preview.mode !== "message";

  return (
    <Shell>
      <div className="mt-10 text-center">
        <Mascot name="mochi" animation="bounce" size="xl" />
        <h1 className="mt-6" style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: "1.75rem" }}>
          {preview.senderName} a pensé à vous
        </h1>
        {isPhysical && (
          <p className="mt-3 text-base" style={{ color: INK }}>
            {preview.mode === "own" ? preview.itemDescription : CURATED_ITEM_LABEL[preview.item!]}
          </p>
        )}
        {preview.note && (
          <p className="mt-3 text-sm italic" style={{ color: MUTED }}>
            « {preview.note} »
          </p>
        )}

        {isPhysical && (
          <div className="mt-8 rounded-2xl border p-4 text-left" style={{ borderColor: BORDER }}>
            {preview.recipientChoice ? (
              <p className="text-sm" style={{ color: MUTED }}>
                {preview.recipientChoice === "address"
                  ? `Vous avez transmis une adresse à ${preview.senderName}.`
                  : `Vous avez prévenu ${preview.senderName} que vous préférez le recevoir en main propre.`}
              </p>
            ) : addressMode ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (address.trim()) sendChoice("address", address.trim());
                }}
              >
                <label className="block text-sm font-medium">Votre adresse</label>
                <input
                  type="text"
                  autoFocus
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="mt-2 w-full rounded-xl border bg-white px-4 py-3 text-sm outline-none focus:border-current"
                  style={{ borderColor: BORDER }}
                />
                <button
                  type="submit"
                  disabled={replying}
                  className="mt-3 w-full rounded-full py-3 text-sm font-medium text-white disabled:opacity-50"
                  style={{ backgroundColor: ACCENT }}
                >
                  Envoyer mon adresse à {preview.senderName}
                </button>
              </form>
            ) : (
              <>
                <p className="text-sm font-medium">Comment préférez-vous le recevoir ?</p>
                <div className="mt-3 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => setAddressMode(true)}
                    className="w-full rounded-full py-3 text-sm font-medium text-white"
                    style={{ backgroundColor: ACCENT }}
                  >
                    Entrer mon adresse
                  </button>
                  <button
                    type="button"
                    disabled={replying}
                    onClick={() => sendChoice("in_person")}
                    className="w-full rounded-full border py-3 text-sm font-medium disabled:opacity-50"
                    style={{ borderColor: BORDER, color: INK }}
                  >
                    En main propre, au prochain rendez-vous
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        <div className="mt-6 rounded-2xl border p-4 text-left text-sm" style={{ borderColor: BORDER, color: MUTED }}>
          Ittsui n&apos;a rien livré ni acheté automatiquement — {preview.senderName} vous a simplement fait
          savoir qu&apos;iel pense à vous, et s&apos;occupe du reste de son côté.
        </div>
      </div>
    </Shell>
  );
}
