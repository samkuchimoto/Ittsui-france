"use client";
// /app/components/SlowLoadFallback.tsx
// Appears once a loading state has genuinely run past 3 seconds — most
// loads resolve well before this ever renders. FriendlyLoading's rotating
// text has no ceiling of its own, so without this, any genuinely slow (or
// stuck) load reads identically to a healthy one still in progress, with
// no way out short of a manual browser refresh.

import { INK, MUTED, BORDER } from "@/lib/theme";
import { useT } from "@/app/components/site/LangProvider";
import { COMPONENTS } from "./components.i18n";

export function SlowLoadFallback({ show }: { show: boolean }) {
  const t = useT(COMPONENTS);
  if (!show) return null;
  return (
    <div className="mt-6">
      <p className="text-sm" style={{ color: MUTED }}>
        {t("Cela prend plus de temps que prévu.")}
      </p>
      <button
        onClick={() => window.location.reload()}
        className="mt-4 rounded-full border px-4 py-2 text-sm font-medium"
        style={{ borderColor: BORDER, color: INK }}
      >
        {t("Réessayer")}
      </button>
    </div>
  );
}
