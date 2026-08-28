// /app/dashboard/archive/page.tsx
// Server Component wrapper, same reasoning as app/dashboard/page.tsx —
// kept thin so `dynamic = "force-dynamic"` is honored and Next.js skips
// its build-time prerender attempt for a page that's 100% client
// auth/Firestore state.
export const dynamic = "force-dynamic";

import ArchiveClient from "./ArchiveClient";

export default function ArchivePage() {
  return <ArchiveClient />;
}
