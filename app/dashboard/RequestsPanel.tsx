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
import { MUTED, ACCENT, BORDER } from "@/lib/theme";

const STATUS_LABEL: Record<MeetingRequestStatus, string> = {
  pending: "En attente",
  accepted: "Accepté",
  declined: "Décliné",
  expired: "Expiré",
};

// Semantic status coding, not brand chrome — same reasoning DashboardClient
// already applies to its own amber/emerald/neutral week-status badges.
const STATUS_COLOR: Record<MeetingRequestStatus, string> = {
  pending: "#B08900",
  accepted: "#1E7A4C",
  declined: "#8A8378",
  expired: "#8A8378",
};

function StatusPill({ status }: { status: MeetingRequestStatus }) {
  const color = STATUS_COLOR[status];
  return (
    <span
      className="rounded-full px-2.5 py-1 text-xs font-medium"
      style={{ backgroundColor: `${color}1A`, color }}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

function RequestRow({ request, perspective }: { request: MeetingRequest; perspective: "sent" | "received" }) {
  const otherParty = perspective === "sent" ? request.recipientName : request.senderName;
  return (
    <li className="flex items-center justify-between gap-3 py-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{otherParty}</p>
        <p className="truncate text-xs" style={{ color: MUTED }}>
          {request.venueName} · {request.date} à {request.time}
        </p>
      </div>
      <StatusPill status={request.status} />
    </li>
  );
}

export function RequestsPanel() {
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
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide" style={{ color: MUTED }}>
          Demandes de rendez-vous
        </p>
        <Link href="/request/new" className="text-xs font-medium underline underline-offset-4" style={{ color: ACCENT }}>
          Nouvelle demande
        </Link>
      </div>

      {received && received.length > 0 && (
        <div className="mt-3">
          <p className="text-[11px] uppercase tracking-wide" style={{ color: MUTED }}>
            Reçues
          </p>
          <ul className="divide-y" style={{ borderColor: BORDER }}>
            {received.map((r) => (
              <RequestRow key={r.id} request={r} perspective="received" />
            ))}
          </ul>
        </div>
      )}

      {sent && sent.length > 0 && (
        <div className="mt-4">
          <p className="text-[11px] uppercase tracking-wide" style={{ color: MUTED }}>
            Envoyées
          </p>
          <ul className="divide-y" style={{ borderColor: BORDER }}>
            {sent.map((r) => (
              <RequestRow key={r.id} request={r} perspective="sent" />
            ))}
          </ul>
        </div>
      )}

      {sent && received && sent.length === 0 && received.length === 0 && (
        <p className="mt-2 text-sm" style={{ color: MUTED }}>
          Aucune demande pour l&apos;instant.
        </p>
      )}
    </div>
  );
}
