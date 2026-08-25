"use client";
// Mounted once in the root layout (not inside /request/new itself) —
// Android delivers a share intent to whatever screen the app happens to
// resume on, not necessarily /request/new, so this has to listen globally
// and navigate there itself rather than assuming RequestFormClient is
// already mounted. Hands the shared text off via the same sessionStorage
// pattern RequestFormClient.tsx already uses for its own draft, so no new
// state-passing mechanism was invented for this.

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { onShareReceived } from "@/lib/nativeShareTarget";

export const SHARED_TEXT_KEY = "ittsui-shared-text";

export function ShareTargetListener() {
  const router = useRouter();

  useEffect(() => {
    let unsubscribe = () => {};
    onShareReceived((text) => {
      sessionStorage.setItem(SHARED_TEXT_KEY, text);
      router.push("/request/new");
    }).then((unsub) => {
      unsubscribe = unsub;
    });
    return () => unsubscribe();
  }, [router]);

  return null;
}
