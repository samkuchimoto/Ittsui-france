// /app/setup/page.tsx
// Server Component wrapper — kept deliberately thin. All the actual
// logic lives in SetupClient.tsx ("use client"); this file exists only
// so `dynamic = "force-dynamic"` is honored (that export is only
// recognized in Server Components) and Next.js skips its default
// build-time prerender attempt for a page that's 100% client auth/
// Firestore state anyway. Without this split, importing lib/firebase.ts
// at all (even unused) runs its client init at build time — harmless
// when real NEXT_PUBLIC_* env vars are present (Vercel always has
// them), but a hard build failure anywhere they aren't (a clean CI
// checkout with no secrets configured).
export const dynamic = "force-dynamic";

import SetupClient from "./SetupClient";

export default function SetupPage() {
  return <SetupClient />;
}
