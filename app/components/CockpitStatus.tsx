// /app/components/CockpitStatus.tsx
// Four-stage lifecycle indicator for a pair, real data only:
//   1. Envoyée   — the pair document exists (always true)
//   2. Reçue     — pair.inviteOpenedAt is set (see api/mark-invite-opened)
//   3. Planifiée — pair.status === "active" (the recurring day/time is live)
//   4. Confirmée — the current week's status is "confirmed"
//
// Reordered from "venue confirmed, then ritual scheduled" to the actual
// causal order: a specific week's venue can't be confirmed before the
// pair itself is active, so "scheduled" has to precede "confirmed", not
// follow it. Each later stage implies every earlier one already happened
// — this is a linear progress read, not four independent booleans.

import type { Pair, Week } from "@/lib/types";
import { ACCENT, BORDER, MUTED } from "@/lib/theme";

interface CockpitStatusProps {
  pair: Pair;
  week?: Week | null;
}

type StageState = "done" | "current" | "pending";

export function CockpitStatus({ pair, week }: CockpitStatusProps) {
  const opened = Boolean(pair.inviteOpenedAt);
  const active = pair.status === "active";
  const confirmed = active && week?.status === "confirmed";

  const stages: { label: string; state: StageState }[] = [
    { label: "Envoyée", state: "done" },
    { label: "Reçue", state: opened ? "done" : active ? "done" : "current" },
    { label: "Planifiée", state: active ? "done" : "pending" },
    { label: "Lieu validé", state: confirmed ? "done" : active ? "current" : "pending" },
  ];

  return (
    <div className="flex items-center gap-1.5" role="list" aria-label="Statut du rituel">
      {stages.map((stage, i) => (
        <div key={stage.label} className="flex items-center gap-1.5" role="listitem">
          {i > 0 && (
            <span
              className="h-px w-3"
              style={{ backgroundColor: stage.state === "pending" ? BORDER : ACCENT }}
              aria-hidden="true"
            />
          )}
          <span
            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium"
            style={
              stage.state === "done"
                ? { backgroundColor: `${ACCENT}1A`, color: ACCENT }
                : stage.state === "current"
                  ? { backgroundColor: ACCENT, color: "white" }
                  : { backgroundColor: "transparent", color: MUTED, border: `1px solid ${BORDER}` }
            }
          >
            {stage.state === "done" && "✓ "}
            {stage.label}
          </span>
        </div>
      ))}
    </div>
  );
}
