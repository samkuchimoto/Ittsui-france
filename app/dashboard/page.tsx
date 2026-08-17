// /app/dashboard/page.tsx
// Server Component wrapper — kept deliberately thin. All the actual
// logic lives in DashboardClient.tsx ("use client"); this file exists
// only so `dynamic = "force-dynamic"` is honored (that export is only
// recognized in Server Components) and Next.js skips its default
// build-time prerender attempt for a page that's 100% client auth/
// Firestore state anyway. See DashboardClient.tsx's header comment for
// the full reasoning.
export const dynamic = "force-dynamic";

import DashboardClient from "./DashboardClient";

export default function DashboardPage() {
  return <DashboardClient />;
}
