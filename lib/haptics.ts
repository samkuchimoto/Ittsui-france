// /lib/haptics.ts
// Shared no-op-on-web wrapper around @capacitor/haptics — the pages that
// use this also render in a plain browser tab, not just the Capacitor
// Android shell (capacitor.config points server.url at the live site), so
// a missing native bridge must never block the action it's attached to.

import { Haptics, ImpactStyle } from "@capacitor/haptics";

export function tapHaptic(style: ImpactStyle = ImpactStyle.Medium) {
  Haptics.impact({ style }).catch(() => {});
}

export { ImpactStyle };
