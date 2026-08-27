"use client";
// /app/geste/[gestureId]/page.tsx
// What a recipient lands on from the "envoyer un geste" link. Public,
// no login (same reasoning as /request/[requestId]: an unguessable link
// is the whole point of a low-friction gesture, not another account to
// create). Deliberately shows no delivery/tracking state for physical
// modes — see lib/gestureLinks.ts: this app never claims to have
// purchased or shipped anything, only that the sender wanted them to
// know. "painting" mode is the one real exception: a real AI-generated
// image, shown with its mandatory disclosure badge (same treatment as
// DiscoveryGrid's AI mood tiles) — never delivery/tracking state either,
// since nothing physical was ever promised for that mode.
//
// For a physical gesture (own/curated/suggested), the recipient can
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
import type { GestureMode, CuratedGestureItem, GestureRecipientChoice, PaintingStatus } from "@/lib/types";
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
  customItem: string | null;
  note: string | null;
  recipientChoice: GestureRecipientChoice | null;
  paintingImageUrl: string | null;
  paintingStatus: PaintingStatus | null;
  rewardStatus: "sent" | "failed" | null;
  courierStatus: "dispatched" | "failed" | null;
  courierTrackingUrl: string | null;
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

function itemLabel(preview: GesturePreview): string | null {
  if (preview.mode === "own") return preview.itemDescription;
  if (preview.mode !== "curated" && preview.mode !== "suggested") return null;
  if (preview.item === "autre") return preview.customItem;
  return preview.item ? CURATED_ITEM_LABEL[preview.item] : null;
}

export default function GesturePage() {
  const params = useParams();
  const gestureId = params?.gestureId as string;
  const [preview, setPreview] = useState<GesturePreview | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [addressMode, setAddressMode] = useState(false);
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
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

  async function sendChoice(choice: GestureRecipientChoice, addr?: string, contactPhone?: string) {
    setReplying(true);
    try {
      const res = await fetch(`/api/gestures/${gestureId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ choice, ...(addr ? { address: addr } : {}), ...(contactPhone ? { phone: contactPhone } : {}) }),
      });
      if (!res.ok) throw new Error("failed");
      const data = await res.json().catch(() => ({}));
      setPreview((current) =>
        current
          ? { ...current, recipientChoice: choice, courierStatus: data.courierStatus ?? current.courierStatus, courierTrackingUrl: data.courierTrackingUrl ?? current.courierTrackingUrl }
          : current
      );
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

  // Painting and message modes have nothing physical to deliver — no
  // address/in-person choice makes sense for either.
  const isPhysical = preview.mode === "own" || preview.mode === "curated" || preview.mode === "suggested";
  const label = itemLabel(preview);

  return (
    <Shell>
      <div className="mt-10 text-center">
        <Mascot name="mochi" animation="bounce" size="xl" />
        <h1 className="mt-6" style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: "1.75rem" }}>
          {preview.senderName} a pensé à vous
        </h1>

        {preview.mode === "painting" && preview.paintingImageUrl && (
          <div className="relative mt-5 overflow-hidden rounded-2xl" style={{ border: `1px solid ${BORDER}` }}>
            {/* Mandatory, high-contrast, on every AI-generated image
                without exception — same rule as DiscoveryGrid's mood
                tiles, not a small-print watermark. */}
            <span
              className="absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-semibold text-white"
              style={{ backgroundColor: "rgba(0,0,0,0.72)" }}
            >
              Illustration générée par IA
            </span>
            {/* Real generated image, not a stock photo — a plain <img>,
                same as this app's other Fal.ai output, since the host is
                a per-request Fal.ai URL, not a stable asset domain worth
                allowlisting in next.config.js like images.unsplash.com. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview.paintingImageUrl} alt="Peinture générée par IA" className="block w-full" />
          </div>
        )}
        {preview.mode === "painting" && !preview.paintingImageUrl && (
          <p className="mt-3 text-sm" style={{ color: MUTED }}>
            La génération d&apos;image n&apos;était pas disponible au moment de l&apos;envoi.
          </p>
        )}

        {label && (
          <p className="mt-3 text-base" style={{ color: INK }}>
            {label}
          </p>
        )}
        {preview.note && preview.mode !== "painting" && (
          <p className="mt-3 text-sm italic" style={{ color: MUTED }}>
            « {preview.note} »
          </p>
        )}
        {(preview.mode === "curated" || preview.mode === "suggested") && preview.rewardStatus === "sent" && (
          <p className="mt-3 text-sm font-medium" style={{ color: "#1E7A4C" }}>
            Un vrai chèque-cadeau vous a été envoyé par e-mail (regardez aussi vos spams).
          </p>
        )}

        {isPhysical && (
          <div className="mt-8 rounded-2xl border p-4 text-left" style={{ borderColor: BORDER }}>
            {preview.recipientChoice ? (
              <div className="text-sm" style={{ color: MUTED }}>
                <p>
                  {preview.recipientChoice === "address"
                    ? `Vous avez transmis une adresse à ${preview.senderName}.`
                    : `Vous avez prévenu ${preview.senderName} que vous préférez le recevoir en main propre.`}
                </p>
                {preview.courierStatus === "dispatched" && (
                  <p className="mt-2 font-medium" style={{ color: "#1E7A4C" }}>
                    Un coursier a été programmé pour venir chercher l&apos;objet.
                    {preview.courierTrackingUrl && (
                      <>
                        {" "}
                        <a href={preview.courierTrackingUrl} target="_blank" rel="noopener noreferrer" className="underline">
                          Suivre la course →
                        </a>
                      </>
                    )}
                  </p>
                )}
              </div>
            ) : addressMode ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (address.trim()) sendChoice("address", address.trim(), phone.trim() || undefined);
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
                {preview.mode === "own" && (
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Votre numéro (pour le coursier)"
                    className="mt-2 w-full rounded-xl border bg-white px-4 py-3 text-sm outline-none focus:border-current"
                    style={{ borderColor: BORDER }}
                  />
                )}
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

        {preview.rewardStatus !== "sent" && preview.courierStatus !== "dispatched" && (
          <div className="mt-6 rounded-2xl border p-4 text-left text-sm" style={{ borderColor: BORDER, color: MUTED }}>
            Ittsui n&apos;a rien livré ni acheté automatiquement — {preview.senderName} vous a simplement fait
            savoir qu&apos;iel pense à vous, et s&apos;occupe du reste de son côté.
          </div>
        )}
      </div>
    </Shell>
  );
}
