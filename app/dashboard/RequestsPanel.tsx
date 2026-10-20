"use client";
// /app/dashboard/RequestsPanel.tsx
// Tracks every ad-hoc meeting request the signed-in user sent or received
// (see /api/meeting-requests/list) — the status-tracking dashboard asked
// for alongside the request-creation flow at /request/new. Self-contained,
// same shape as DashboardClient.tsx's PasskeyManager: its own auth/fetch,
// mounted as one more account-level section.

import { useEffect, useState } from "react";
import Link from "next/link";
import { auth } from "@/lib/firebase";
import type { MeetingRequest, MeetingRequestStatus } from "@/lib/types";
import { INK, MUTED, ACCENT, BORDER } from "@/lib/theme";
import { DiscoveryTileButton } from "@/app/components/DiscoveryGrid";
import { googleCalendarLink } from "@/lib/googleCalendarLink";
import { Mascot } from "@/app/components/Mascot";
import { VENUE_PHOTOS } from "@/lib/venuePhotos";
import { DATE_LOCALE, type Locale } from "@/lib/i18n";
import { useLang, useT } from "@/app/components/site/LangProvider";
import { REQUESTS } from "./requests.i18n";

const VENUE_TYPE_LABEL: Record<string, string> = {
  cafe: "Café",
  restaurant: "Restaurant",
  park: "Parc",
  museum: "Musée",
  home: "Chez vous",
};

const STATUS_LABEL: Record<MeetingRequestStatus, string> = {
  pending: "En attente",
  accepted: "Accepté",
  declined: "Décliné",
  expired: "Expiré",
  cancelled: "Annulée",
};

// Semantic status coding, not brand chrome — same reasoning DashboardClient
// already applies to its own amber/emerald/neutral week-status badges.
const STATUS_COLOR: Record<MeetingRequestStatus, string> = {
  pending: "#B08900",
  accepted: "#1E7A4C",
  declined: "#8A8378",
  expired: "#8A8378",
  cancelled: "#8A8378",
};

function StatusPill({ status }: { status: MeetingRequestStatus }) {
  const t = useT(REQUESTS);
  const color = STATUS_COLOR[status];
  return (
    <span
      className="rounded-full px-2.5 py-1 text-xs font-medium"
      style={{ backgroundColor: `${color}1A`, color }}
    >
      {t(STATUS_LABEL[status])}
    </span>
  );
}

// "27 août" instead of a raw "2026-08-27" — real feedback: a bare ISO
// string getting mid-cut by an ellipsis on narrow screens read as an
// unfinished dev placeholder rather than a designed empty state.
// ("27 Aug" in English, 「8月27日」 in Japanese.)
function formatShortDate(iso: string, lang: Locale): string {
  const [year, month, day] = iso.split("-").map(Number);
  if (!month || !day) return iso;
  return new Intl.DateTimeFormat(DATE_LOCALE[lang], { day: "numeric", month: "short" }).format(new Date(year, month - 1, day));
}

function RequestRow({
  request,
  perspective,
  onCancelled,
}: {
  request: MeetingRequest;
  perspective: "sent" | "received";
  onCancelled: () => void;
}) {
  const t = useT(REQUESTS);
  const { lang } = useLang();
  const otherParty = perspective === "sent" ? request.recipientName : request.senderName;
  const [cancelling, setCancelling] = useState(false);

  async function handleCancel() {
    const user = auth.currentUser;
    if (!user) return;
    setCancelling(true);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch("/api/meeting-requests/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ requestId: request.id }),
      });
      if (res.ok) onCancelled();
    } finally {
      setCancelling(false);
    }
  }

  return (
    <li className="py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          {request.venueType && (
            <div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg">
              <DiscoveryTileButton
                tile={{
                  value: request.venueType,
                  label: VENUE_TYPE_LABEL[request.venueType] ? t(VENUE_TYPE_LABEL[request.venueType]) : "",
                  image: VENUE_PHOTOS[request.venueType],
                }}
                active={false}
                onClick={() => {}}
              />
            </div>
          )}
          {/* Venue name can truncate on a narrow screen — the date/time
              never does, on its own line now: real feedback (confirmed
              live) was that a single truncated line was cutting off the
              date/time itself, the one thing this row can't afford to
              hide. */}
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{otherParty}</p>
            <p className="truncate text-xs" style={{ color: MUTED }}>
              {request.venueName}
            </p>
            <p className="text-xs" style={{ color: MUTED }}>
              {t("{date} à {time}", { date: formatShortDate(request.date, lang), time: request.time })}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {/* Yuki, "The Cheerleader — encouraging, supportive, positive":
              a small reaction specifically for the good-news status, not
              every row — a badge next to every pending/declined request
              too would just be noise, not warmth. */}
          {request.status === "accepted" && <Mascot name="yuki" size="sm" />}
          <StatusPill status={request.status} />
        </div>
      </div>
      {request.status === "accepted" && (
        <a
          href={googleCalendarLink({
            title: `${request.venueName} — Ittsui`,
            details: t("Rendez-vous confirmé via Ittsui."),
            venueAddress: request.venueAddress,
            date: request.date,
            time: request.time,
          })}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1.5 inline-block text-xs underline underline-offset-4"
          style={{ color: ACCENT }}
        >
          {t("Ajouter à Google Agenda")}
        </a>
      )}
      {/* Real gap found live: a sent request stuck in "En attente" had no
          way to be withdrawn at all — an accumulating list of stale
          proposals to the same person was the only possible outcome,
          directly contradicting "une seule proposition, une seule
          décision, puis le silence". */}
      {perspective === "sent" && request.status === "pending" && (
        <button
          type="button"
          onClick={handleCancel}
          disabled={cancelling}
          className="mt-1.5 text-xs underline underline-offset-4 disabled:opacity-50"
          style={{ color: MUTED }}
        >
          {cancelling ? t("Annulation...") : t("Annuler cette demande")}
        </button>
      )}
    </li>
  );
}

export function RequestsPanel() {
  const t = useT(REQUESTS);
  const [sent, setSent] = useState<MeetingRequest[] | null>(null);
  const [received, setReceived] = useState<MeetingRequest[] | null>(null);

  async function refresh() {
    const user = auth.currentUser;
    if (!user) return;
    const idToken = await user.getIdToken();
    const res = await fetch("/api/meeting-requests/list", { headers: { Authorization: `Bearer ${idToken}` } });
    if (!res.ok) return;
    const data = await res.json();
    setSent(data.sent ?? []);
    setReceived(data.received ?? []);
  }

  useEffect(() => {
    refresh();
  }, []);

  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide" style={{ color: MUTED }}>
        {t("Demandes de rendez-vous")}
      </p>
      {/* Two equal-weight actions, not one primary flow with the second
          buried as small text underneath — real feedback: a quiet link
          there went undiscovered. Since 2026-10-20 the second one is the
          email summary (Ittsui's other half); "Envoyer un geste" is hidden
          from the app, its pages kept for links already sent. */}
      <div className="mt-2 flex gap-2">
        <Link
          href="/request/new"
          className="flex-1 rounded-full border px-3 py-2 text-center text-xs font-medium"
          style={{ borderColor: ACCENT, color: ACCENT }}
        >
          {t("☕ Nouvelle demande")}
        </Link>
        <Link
          href="/triage"
          className="flex-1 rounded-full border px-3 py-2 text-center text-xs font-medium"
          style={{ borderColor: BORDER, color: INK }}
        >
          {t("📬 Résumer mes e-mails")}
        </Link>
      </div>

      {received && received.length > 0 && (
        <div className="mt-3">
          <p className="text-[11px] uppercase tracking-wide" style={{ color: MUTED }}>
            {t("Reçues")}
          </p>
          <ul className="divide-y" style={{ borderColor: BORDER }}>
            {received.map((r) => (
              <RequestRow key={r.id} request={r} perspective="received" onCancelled={refresh} />
            ))}
          </ul>
        </div>
      )}

      {sent && sent.length > 0 && (
        <div className="mt-4">
          <p className="text-[11px] uppercase tracking-wide" style={{ color: MUTED }}>
            {t("Envoyées")}
          </p>
          <ul className="divide-y" style={{ borderColor: BORDER }}>
            {sent.map((r) => (
              <RequestRow key={r.id} request={r} perspective="sent" onCancelled={refresh} />
            ))}
          </ul>
        </div>
      )}

      {sent && received && sent.length === 0 && received.length === 0 && (
        <p className="mt-2 text-sm" style={{ color: MUTED }}>
          {t("Aucune demande pour l'instant.")}
        </p>
      )}
    </div>
  );
}
