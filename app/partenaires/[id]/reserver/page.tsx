"use client";
// /app/partenaires/[id]/reserver/page.tsx
// The real booking surface: pick one of a partner venue's own open
// slots and confirm — no login required (same reasoning as the
// phone-only meeting-request accept flow: the requester doesn't need an
// Ittsui account for a one-off booking at a place that already agreed
// to be bookable this way).

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Fraunces, Work_Sans } from "next/font/google";
import { INK, MUTED, ACCENT, BORDER } from "@/lib/theme";
import { FriendlyLoading } from "@/app/components/FriendlyLoading";
import { Mascot } from "@/app/components/Mascot";

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

interface VenuePreview {
  venueName: string;
  category: string;
  address: string;
  slots: { id: string; date: string; time: string }[];
}

export default function BookPartnerPage() {
  const params = useParams<{ id: string }>();
  const [preview, setPreview] = useState<VenuePreview | null | "not_found">(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<"idle" | "booking" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/venue-partners/${params.id}`)
      .then(async (res) => {
        if (!res.ok) {
          setPreview("not_found");
          return;
        }
        setPreview(await res.json());
      })
      .catch(() => setPreview("not_found"));
  }, [params.id]);

  async function handleBook(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedSlot) return;
    setStatus("booking");
    setError(null);
    try {
      const res = await fetch(`/api/venue-partners/${params.id}/book`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slotId: selectedSlot,
          requesterName: name,
          ...(email ? { requesterEmail: email } : {}),
          ...(phone ? { requesterPhone: phone } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Une erreur est survenue.");
      setStatus("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue.");
      setStatus("error");
    }
  }

  return (
    <main
      className={`${fraunces.variable} ${workSans.variable} min-h-screen bg-[#FFFDF9] antialiased`}
      style={{ color: INK }}
    >
      <div className="mx-auto max-w-md px-6 py-14 text-center">
        <Link href="/" className="text-sm" style={{ color: MUTED }}>
          ← Ittsui
        </Link>

        {preview === null && (
          <p className="mt-6 text-sm" style={{ color: MUTED }}>
            <FriendlyLoading />
          </p>
        )}

        {preview === "not_found" && (
          <h1 className="mt-6" style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: "1.5rem" }}>
            Lieu introuvable
          </h1>
        )}

        {preview && preview !== "not_found" && status !== "done" && (
          <>
            <h1 className="mt-6" style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: "1.75rem" }}>
              {preview.venueName}
            </h1>
            <p className="mt-1 text-sm" style={{ color: MUTED }}>
              {preview.address}
            </p>

            {preview.slots.length === 0 ? (
              <p className="mt-6 text-sm" style={{ color: MUTED }}>
                Plus de créneau disponible pour l&apos;instant.
              </p>
            ) : (
              <form onSubmit={handleBook} className="mt-6 space-y-4 text-left">
                <div>
                  <p className="text-sm font-medium">Choisissez un créneau</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {preview.slots.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setSelectedSlot(s.id)}
                        className="rounded-full border px-3.5 py-2 text-sm transition-colors"
                        style={
                          selectedSlot === s.id
                            ? { borderColor: ACCENT, backgroundColor: ACCENT, color: "white" }
                            : { borderColor: BORDER, color: INK }
                        }
                      >
                        {s.date} à {s.time}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium">Votre nom</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-2 w-full rounded-xl border bg-white px-4 py-3 text-sm outline-none focus:border-current"
                    style={{ borderColor: BORDER }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium">
                    E-mail <span className="font-normal" style={{ color: MUTED }}>(ou téléphone)</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-2 w-full rounded-xl border bg-white px-4 py-3 text-sm outline-none focus:border-current"
                    style={{ borderColor: BORDER }}
                  />
                </div>
                <div>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Numéro de téléphone"
                    className="w-full rounded-xl border bg-white px-4 py-3 text-sm outline-none focus:border-current"
                    style={{ borderColor: BORDER }}
                  />
                </div>

                {error && (
                  <p className="text-sm" style={{ color: ACCENT }}>
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={!selectedSlot || status === "booking" || (!email && !phone)}
                  className="w-full rounded-full py-3.5 text-sm font-medium text-white transition-transform hover:scale-[1.01] disabled:opacity-50"
                  style={{ backgroundColor: ACCENT }}
                >
                  {status === "booking" ? "Réservation..." : "Réserver ce créneau"}
                </button>
              </form>
            )}
          </>
        )}

        {status === "done" && (
          <div className="mt-8">
            <div className="flex justify-center">
              <Mascot name="pika" animation="bounce" size="lg" />
            </div>
            <h1 className="mt-4" style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: "1.5rem" }}>
              Réservation confirmée
            </h1>
            <p className="mt-2 text-sm" style={{ color: MUTED }}>
              Le lieu a été prévenu — il n&apos;y a plus rien à faire.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
