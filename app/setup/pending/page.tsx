// /app/setup/pending/page.tsx
// Server Component wrapper — kept deliberately thin. All the actual
// logic lives in PendingClient.tsx ("use client"); see
// app/dashboard/page.tsx's header comment for why this split exists
// (force-dynamic is only honored in Server Components).
export const dynamic = "force-dynamic";

import PendingClient from "./PendingClient";

export default function PendingPage() {
  return <PendingClient />;
}
