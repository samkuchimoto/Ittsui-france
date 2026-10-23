"use client";

// /app/components/CheckInButton.tsx
// "I'm here" at the venue (app/api/meeting-requests/checkin): reads the
// phone's position once, sends it, says what happened. Inside the Ittsui app,
// or on an iPhone (no Ittsui app there yet), it checks in; an Android browser
// is sent to the app on Google Play first (2026-10-23 pivot).

import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import { ACCENT, MUTED } from "@/lib/theme";
import { useT } from "@/app/components/site/LangProvider";
import { CHECKIN } from "./checkin.i18n";

const PLAY_URL = "https://play.google.com/store/apps/details?id=fr.ittsui.app";

export function CheckInButton({ requestId }: { requestId: string }) {
  const t = useT(CHECKIN);
  const [androidWeb, setAndroidWeb] = useState(false);
  const [state, setState] = useState<"idle" | "locating" | "done" | "both">("idle");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const native = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.();
    setAndroidWeb(!native && /android/i.test(navigator.userAgent));
  }, []);

  if (androidWeb) {
    return (
      <a
        href={`${PLAY_URL}&referrer=${encodeURIComponent("utm_source=checkin")}`}
        className="mt-4 block w-full rounded-full border py-3 text-center text-sm font-medium"
        style={{ borderColor: ACCENT, color: ACCENT }}
      >
        {t("Pointer à l'arrivée depuis l'application Ittsui")}
      </a>
    );
  }

  function checkIn() {
    if (!navigator.geolocation) {
      setMessage(t("Position indisponible sur cet appareil."));
      return;
    }
    setState("locating");
    setMessage(null);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const token = await auth.currentUser?.getIdToken().catch(() => undefined);
          const res = await fetch("/api/meeting-requests/checkin", {
            method: "POST",
            headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
            body: JSON.stringify({ requestId, lat: position.coords.latitude, lon: position.coords.longitude, accuracy: position.coords.accuracy }),
          });
          const data = await res.json();
          if (res.ok) {
            setState(data.both ? "both" : "done");
            return;
          }
          setState("idle");
          setMessage(
            res.status === 425
              ? t("Le pointage ouvre 30 minutes avant le rendez-vous.")
              : res.status === 410
                ? t("Le pointage est fermé : le rendez-vous est passé.")
                : data.distanceM
                  ? t("Vous êtes à {m} m du lieu : rapprochez-vous puis réessayez.", { m: data.distanceM })
                  : res.status === 422
                    ? t("Ce lieu n'est pas trouvable sur la carte : pointage impossible ici.")
                    : t("Le pointage n'a pas marché. Réessayez."),
          );
        } catch {
          setState("idle");
          setMessage(t("Le pointage n'a pas marché. Réessayez."));
        }
      },
      () => {
        setState("idle");
        setMessage(t("Position refusée : autorisez-la pour pointer à l'arrivée."));
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  }

  if (state === "done" || state === "both") {
    return (
      <p className="mt-4 text-sm font-medium" style={{ color: ACCENT }}>
        {state === "both" ? t("Vous êtes tous les deux sur place ✓") : t("Arrivée validée ✓")}
      </p>
    );
  }
  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={checkIn}
        disabled={state === "locating"}
        className="w-full rounded-full border py-3 text-sm font-medium disabled:opacity-60"
        style={{ borderColor: ACCENT, color: ACCENT }}
      >
        {state === "locating" ? t("Vérification de votre position…") : t("Je suis arrivé(e)")}
      </button>
      {message && (
        <p className="mt-2 text-xs" style={{ color: MUTED }}>
          {message}
        </p>
      )}
    </div>
  );
}
