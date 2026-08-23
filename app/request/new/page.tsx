// /app/request/new/page.tsx
// Server Component wrapper — kept deliberately thin, same reasoning as
// /app/setup/page.tsx: only here so `dynamic = "force-dynamic"` is
// honored (Server Components only) and Next.js skips a build-time
// prerender of a page that's 100% client auth/Firestore state.
export const dynamic = "force-dynamic";

import RequestFormClient from "./RequestFormClient";

export default function NewRequestPage() {
  return <RequestFormClient />;
}
