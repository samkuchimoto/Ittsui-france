// /app/components/StatusBanner.tsx
// Sequenced micro-copy banner for an async operation already in progress
// elsewhere (e.g. useUserLocation, or an invite POST) — each step's label
// is driven by that operation's own real status, not an internal timer
// disconnected from what's actually happening.

const ACCENT = "#A84B38";
const MUTED = "#78716C";
const BORDER = "#E8E2D9";

export interface StatusStep {
  key: string;
  label: string;
}

interface StatusBannerProps {
  steps: StatusStep[];
  currentKey: string | null; // null = nothing active, renders nothing
  doneSlot?: React.ReactNode; // shown once the last step's key is reached
}

export function StatusBanner({ steps, currentKey, doneSlot }: StatusBannerProps) {
  if (!currentKey) return null;
  const index = steps.findIndex((s) => s.key === currentKey);
  if (index === -1) return null;

  const isLast = index === steps.length - 1;
  const step = steps[index];

  return (
    <div
      className="flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm"
      style={{
        borderColor: isLast ? ACCENT : BORDER,
        backgroundColor: isLast ? `${ACCENT}0D` : "white",
        color: isLast ? ACCENT : MUTED,
      }}
    >
      {!isLast && <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full" style={{ backgroundColor: ACCENT }} />}
      <span>{step.label}</span>
      {isLast && doneSlot}
    </div>
  );
}
