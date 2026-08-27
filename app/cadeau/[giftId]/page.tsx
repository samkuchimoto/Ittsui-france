"use client";
// /app/cadeau/[giftId]/page.tsx
// What a recipient lands on from the "envoyer un geste" link. Public,
// no login (same reasoning as /request/[requestId]: an unguessable link
// is the whole point of a low-friction gesture, not another account to
// create). Deliberately shows no delivery/tracking state — see
// lib/giftLinks.ts: this app never claims to have purchased or shipped
// anything, only that the sender wanted them to know.

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Fraunces, Work_Sans } from "next/font/google";
import { Mascot } from "@/app/components/Mascot";
import { FriendlyLoading } from "@/app/components/FriendlyLoading";
import { GIFT_CATEGORY_LABEL } from "@/lib/giftLinks";
import type { GiftCategory } from "@/lib/types";
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

interface GiftPreview {
  senderName: string;
  recipientName: string;
  category: GiftCategory;
  note: string | null;
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

export default function GiftPage() {
  const params = useParams();
  const giftId = params?.giftId as string;
  const [preview, setPreview] = useState<GiftPreview | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    if (!giftId) return;
    fetch(`/api/gifts/${giftId}`)
      .then((res) => {
        if (!res.ok) throw new Error("not found");
        return res.json();
      })
      .then((data) => {
        setPreview(data);
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }, [giftId]);

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

  return (
    <Shell>
      <div className="mt-10 text-center">
        <Mascot name="mochi" animation="bounce" size="xl" />
        <h1 className="mt-6" style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: "1.75rem" }}>
          {preview.senderName} a pensé à vous
        </h1>
        <p className="mt-3 text-base" style={{ color: INK }}>
          {GIFT_CATEGORY_LABEL[preview.category]}
        </p>
        {preview.note && (
          <p className="mt-3 text-sm italic" style={{ color: MUTED }}>
            « {preview.note} »
          </p>
        )}
        <div className="mt-8 rounded-2xl border p-4 text-left text-sm" style={{ borderColor: BORDER, color: MUTED }}>
          Ittsui n&apos;a rien livré ni acheté automatiquement — {preview.senderName} vous a simplement fait
          savoir qu&apos;iel pense à vous, et s&apos;occupe du reste de son côté.
        </div>
      </div>
    </Shell>
  );
}
