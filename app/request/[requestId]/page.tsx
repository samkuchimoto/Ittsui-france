"use client";
// /app/request/[requestId]/page.tsx
// What the recipient lands on from the meeting-request email/link. Public
// preview shell (no auth required to view venue/date/time) — Google
// sign-in is only actually required for accept when the request was
// email-addressed (see /api/meeting-requests/[requestId]'s requiresLogin
// and /api/meeting-requests/respond's matching trust-boundary logic). A
// phone-only request can now be accepted with a single tap, no login at
// all — the unguessable link itself was already the sole authorization
// for that case; requiring sign-in on top of it was pure friction with no
// added security. Decline never requires login either way (GDPR: an
// opt-out shouldn't cost someone an account).

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { fraunces, workSans } from "@/app/fonts";
import { signInWithGoogle, watchAuthState } from "@/lib/firebase";
import type { User } from "firebase/auth";
import { FriendlyLoading } from "@/app/components/FriendlyLoading";
import { DiscoveryTileButton } from "@/app/components/DiscoveryGrid";
import { PageMascotHeader } from "@/app/components/PageMascotHeader";
import { Mascot } from "@/app/components/Mascot";
import { buildICSContent, downloadICSFile } from "@/lib/icsFile";
import { VenueDirections } from "@/app/components/VenueDirections";
import { VENUE_PHOTOS } from "@/lib/venuePhotos";
import type { VenueType } from "@/lib/types";
import { INK, MUTED, ACCENT, BORDER } from "@/lib/theme";
import { isLocale, pagePath, type Locale } from "@/lib/i18n";
import { frenchDateLabel } from "@/lib/proposalMessage";
import { useLang, useT } from "@/app/components/site/LangProvider";
import { AppLangSwitch } from "@/app/components/site/AppLangSwitch";
import { localeTypography } from "@/app/components/site/typography";
import { REQUEST_PAGE } from "./request-page.i18n";
import { YourTurn } from "@/app/components/PlanCard";
import { cityOf } from "@/lib/cities";

const VENUE_TYPE_LABEL: Record<string, string> = {
  cafe: "Café",
  restaurant: "Restaurant",
  park: "Parc",
  museum: "Musée",
  home: "Chez vous",
};

interface RequestPreview {
  status: string;
  senderName: string;
  recipientName: string;
  venueName: string;
  venueAddress: string;
  venueType: VenueType | null;
  date: string;
  time: string;
  requiresLogin: boolean;
  perk?: string | null;
  cityId?: string;
}

interface AcceptedDetails {
  venueName: string;
  venueAddress: string;
  venueType: VenueType | null;
  date: string;
  time: string;
  visit?: { code: string; perk: string } | null;
  cityId?: string;
}

type Status = "checking" | "ready" | "not_found" | "declining" | "declined" | "accepting" | "accepted" | "error";

// The stored date stays as it was in French ("2026-09-20 à 15:30"); English
// and Japanese get a written-out day.
// The meeting city's own date and time (lib/cities.ts); outside Paris it says which city.
function whenLabel(t: (text: string, vars?: Record<string, string>) => string, lang: Locale, date: string, time: string, cityId?: string) {
  const city = cityOf(cityId);
  return t("{date} à {time}", { date: lang === "fr" ? date : frenchDateLabel(date, lang), time: city.id === "paris" ? time : `${time} (${city.name[lang]})` });
}

function Shell({ children }: { children: React.ReactNode }) {
  const { lang } = useLang();
  return (
    <main
      lang={lang === "fr" ? undefined : lang}
      className={`${fraunces.variable} ${workSans.variable} min-h-screen bg-[#FFFDF9] antialiased`}
      style={{ color: INK, ...localeTypography(lang, fraunces.style.fontFamily) }}
    >
      <div className="mx-auto max-w-md px-6 py-14 text-center">
        <Link href={pagePath("home", lang)} className="text-sm" style={{ color: MUTED }}>
          ← Ittsui
        </Link>
        {/* No first-open language question on a page someone else's link
            opens (see LangProvider.tsx): it opens in the sender's language,
            and this switch is there for anyone who reads another. */}
        <AppLangSwitch className="mt-3 justify-center" />
        <PageMascotHeader />
        {children}
      </div>
    </main>
  );
}

function VenuePreviewCard({ preview }: { preview: RequestPreview }) {
  const { lang } = useLang();
  const t = useT(REQUEST_PAGE);
  return (
    <div className="mt-5 rounded-2xl border p-4 text-left" style={{ borderColor: BORDER, backgroundColor: "white" }}>
      {/* Collapses to nothing rather than an empty box when there's no
          real photo to show — the blank top area a real tester hit
          live was exactly this rendering with no image at all. */}
      {preview.venueType && VENUE_PHOTOS[preview.venueType] && (
        <div className="mb-3 h-[120px] w-full overflow-hidden rounded-xl">
          <DiscoveryTileButton
            tile={{
              value: preview.venueType,
              label: VENUE_TYPE_LABEL[preview.venueType] ? t(VENUE_TYPE_LABEL[preview.venueType]) : "",
              image: VENUE_PHOTOS[preview.venueType],
            }}
            active={false}
            onClick={() => {}}
          />
        </div>
      )}
      <p className="text-base font-medium">{preview.venueName}</p>
      {preview.perk && (
        <p className="mt-0.5 text-xs font-medium" style={{ color: ACCENT }}>
          {t("Partenaire · {perk}", { perk: preview.perk })}
        </p>
      )}
      {/* The invitee is the one person on this screen who has never seen
          the venue and still has to physically get there. Leaving the
          address as dead text was the "Adress not / Je rentre" finding at
          its sharpest. */}
      <VenueDirections venueName={preview.venueName} venueAddress={preview.venueAddress} className="mt-0.5" />
      <p className="mt-2 text-sm" style={{ color: MUTED }}>
        {whenLabel(t, lang, preview.date, preview.time, preview.cityId)}
      </p>
    </div>
  );
}

export default function RequestResponsePage() {
  const router = useRouter();
  const params = useParams<{ requestId: string }>();
  const { lang, suggestLang } = useLang();
  const t = useT(REQUEST_PAGE);

  const [status, setStatus] = useState<Status>("checking");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [user, setUser] = useState<User | false | null>(null);
  const [slowConnection, setSlowConnection] = useState(false);
  const [accepted, setAccepted] = useState<AcceptedDetails | null>(null);
  // The sender, for the guest's "your turn" card after accepting (YourTurn).
  const [invite, setInvite] = useState<{ name: string | null; ref: string | null }>({ name: null, ref: null });
  const [signingIn, setSigningIn] = useState(false);
  const [preview, setPreview] = useState<RequestPreview | null>(null);

  // Fetches the public preview (venue/date/time + whether this specific
  // request needs a signed-in identity to accept) independently of auth —
  // this used to not exist at all, so the pre-accept screen showed no
  // venue details and every request defensively required a Google
  // sign-in even when there was no email to actually check against.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/meeting-requests/${params.requestId}`);
        const data = await res.json().catch(() => null);
        if (cancelled) return;
        if (!res.ok || !data) {
          setStatus(res.status === 410 ? "declined" : "not_found");
          return;
        }
        if (isLocale(data.lang)) suggestLang(data.lang);
        setInvite({ name: data.senderName ?? null, ref: data.senderRef ?? null });
        if (data.status === "declined" || data.status === "expired") {
          setStatus("declined");
          return;
        }
        if (data.status === "accepted") {
          setAccepted({
            venueName: data.venueName,
            venueAddress: data.venueAddress,
            venueType: data.venueType ?? null,
            date: data.date,
            time: data.time,
            visit: data.visit ?? null,
            cityId: data.cityId,
          });
          setStatus("accepted");
          return;
        }
        setPreview(data as RequestPreview);
      } catch {
        if (!cancelled) setStatus("not_found");
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.requestId]);

  useEffect(() => {
    const unsub = watchAuthState((u) => setUser(u ?? false));
    return unsub;
  }, []);

  useEffect(() => {
    if (user !== null) return;
    const timer = setTimeout(() => setSlowConnection(true), 3000);
    return () => clearTimeout(timer);
  }, [user]);

  // Only auto-accepts on a resolved sign-in for a request that actually
  // needs one. A phone-only request (requiresLogin === false) never auto-
  // accepts just because a session happens to exist — accepting is a
  // deliberate tap on "Oui, je viens" below, not something that fires
  // silently the moment Firebase resolves an unrelated signed-in session.
  //
  // Real login-lockout bug found live: this used to stop watching `user`
  // entirely once status became "error" (the guard only allowed
  // "checking"/"ready"). That meant switching to the correct Google
  // account after a wrong-account 403 never re-attempted accept() at
  // all — the retry button's own sign-in would succeed, but nothing ever
  // called accept() again with the new account. Re-including "error"
  // here (paired with the handleAcceptTap fix below, which stops
  // reusing the stale wrong-account `user` instead of actually opening
  // the account picker) makes the retry path work end to end. No
  // infinite-loop risk: this effect only re-runs when `user` itself
  // changes (a genuinely different signed-in account), not on every
  // status change, since status isn't in the dependency array.
  useEffect(() => {
    if (user === null || !preview) return;
    if (status !== "checking" && status !== "ready" && status !== "error") return;
    if (preview.requiresLogin) {
      if (user) accept(user);
      else if (status !== "error") setStatus("ready");
    } else if (status !== "error") {
      setStatus("ready");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, preview]);

  async function accept(u: User | null) {
    setStatus("accepting");
    setErrorMsg(null);
    try {
      const res = await fetch("/api/meeting-requests/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: params.requestId,
          ...(u ? { userId: u.uid, userEmail: u.email } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(t(data?.error ?? "Une erreur est survenue."));
      setAccepted({
        venueName: data.venueName,
        venueAddress: data.venueAddress,
        venueType: data.venueType ?? null,
        date: data.date,
        time: data.time,
        visit: data.visit ?? null,
        cityId: data.cityId,
      });
      setStatus("accepted");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : t("Une erreur est survenue."));
      setStatus("error");
    }
  }

  async function handleDecline() {
    setStatus("declining");
    setErrorMsg(null);
    try {
      const res = await fetch("/api/meeting-requests/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId: params.requestId, decline: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(t(data?.error ?? "Une erreur est survenue."));
      setStatus("declined");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : t("Une erreur est survenue."));
      setStatus("error");
    }
  }

  // The one-tap path — only ever reachable when preview.requiresLogin is
  // false, so this never bypasses the real identity check an email-
  // addressed request still needs.
  function handleInstantAccept() {
    accept(user || null);
  }

  async function handleAcceptTap() {
    if (signingIn) return; // a second tap while the popup is open cancels and
    // reopens it, which looks like the account chooser inexplicably
    // reappearing (confirmed via real testing 2026-08-25)
    setErrorMsg(null);
    // Real login-lockout bug found live: this button reads "Se connecter
    // avec un autre compte" once errorMsg is set (see the JSX below), but
    // `user` is still the SAME already-known-wrong Firebase Auth session
    // — Google sign-in hadn't actually run yet. Short-circuiting to
    // accept(user) here just re-failed with the same wrong account,
    // silently, with no account picker ever appearing. Only take this
    // shortcut on a genuinely fresh attempt (no prior error yet).
    if (user && !errorMsg) {
      accept(user);
      return;
    }
    setSigningIn(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : t("Échec de la connexion."));
    } finally {
      setSigningIn(false);
    }
  }

  function handleAddToCalendar() {
    if (!accepted) return;
    const content = buildICSContent({
      title: `${accepted.venueName} — Ittsui`,
      description: t("Rendez-vous confirmé via Ittsui."),
      venueAddress: accepted.venueAddress,
      date: accepted.date,
      time: accepted.time,
      uid: String(params.requestId),
      timezone: cityOf(accepted.cityId).timezone,
    });
    downloadICSFile("ittsui-rendez-vous.ics", content);
  }

  if (status === "checking" || status === "accepting") {
    return (
      <Shell>
        <p className="text-sm" style={{ color: MUTED }}>
          <FriendlyLoading />
        </p>
        {slowConnection && status === "checking" && (
          <div className="mt-6">
            <p className="text-sm" style={{ color: MUTED }}>
              {t(
                "Cela prend plus de temps que prévu. Si vous êtes sur un wifi public ou professionnel, il se peut qu'il bloque la connexion à Google — essayez avec les données mobiles."
              )}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 rounded-full border px-4 py-2 text-sm font-medium"
              style={{ borderColor: BORDER, color: INK }}
            >
              {t("Réessayer")}
            </button>
          </div>
        )}
      </Shell>
    );
  }

  if (status === "not_found") {
    return (
      <Shell>
        <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: "1.5rem" }}>
          {t("Demande introuvable")}
        </h1>
        <p className="mt-3 text-sm" style={{ color: MUTED }}>
          {t("Ce lien n'est plus valide, ou n'a jamais existé.")}
        </p>
      </Shell>
    );
  }

  if (status === "accepted") {
    return (
      <Shell>
        {accepted?.venueType && (
          <div className="mx-auto mb-5 h-32 w-32 overflow-hidden rounded-2xl">
            <DiscoveryTileButton
              tile={{
                value: accepted.venueType,
                label: VENUE_TYPE_LABEL[accepted.venueType] ? t(VENUE_TYPE_LABEL[accepted.venueType]) : "",
              }}
              active={false}
              onClick={() => {}}
            />
          </div>
        )}
        <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: "1.5rem" }}>
          {t("Rendez-vous confirmé")}
        </h1>
        {accepted && (
          <p className="mt-2 text-sm font-medium">
            {accepted.venueName} · {whenLabel(t, lang, accepted.date, accepted.time, accepted.cityId)}
          </p>
        )}
        {/* Honest status, not just a checkmark and a venue name: "Calé sur
            l'agenda" is real (both people confirmed a date/time) — but a
            restaurant or museum commonly still needs an actual reservation
            or ticket, which nothing in this app has booked. Same
            amber/green convention already used for status elsewhere
            (RequestsPanel's StatusPill, the dashboard's StatusBadge), and
            the same honesty rule as the venue-recommendation fallback
            chain: never let the UI imply something happened that didn't. */}
        {accepted && (
          <span
            className="mt-3 inline-flex items-center rounded-full px-3 py-1 text-xs font-medium"
            style={{ backgroundColor: "#1E7A4C1A", color: "#1E7A4C" }}
          >
            {t("✓ Calé sur l'agenda")}
          </span>
        )}
        {accepted?.visit && (
          <div className="mt-3 rounded-xl border p-3 text-left" style={{ borderColor: `${ACCENT}55`, backgroundColor: `${ACCENT}0D` }}>
            <p className="text-sm font-medium" style={{ color: ACCENT }}>
              {accepted.visit.perk ? t("Partenaire · {perk}", { perk: accepted.visit.perk }) : t("Partenaire Ittsui")}
            </p>
            <p className="mt-1 text-xs" style={{ color: MUTED }}>
              {t("Code à montrer au comptoir : {code}", { code: accepted.visit.code })}
            </p>
          </div>
        )}
        {accepted && (accepted.venueType === "restaurant" || accepted.venueType === "museum") && (
          <div className="mt-3 rounded-xl border p-3 text-left" style={{ borderColor: "#B0890033", backgroundColor: "#B0890014" }}>
            <p className="text-sm font-medium" style={{ color: "#B08900" }}>
              {t("⚠ Réservation requise")}
            </p>
            <p className="mt-1 text-xs" style={{ color: MUTED }}>
              {t("{venue} n'a pas été réservé pour vous — pensez à appeler ou réserver directement.", {
                venue: accepted.venueName,
              })}
              {accepted.venueAddress && ` ${accepted.venueAddress}.`}
            </p>
          </div>
        )}
        <p className="mt-3 text-sm" style={{ color: MUTED }}>
          {t("Vous recevrez un e-mail de confirmation. L'autre personne a été notifiée.")}
        </p>
        {accepted && (
          <button
            onClick={handleAddToCalendar}
            className="mt-4 block w-full text-sm underline underline-offset-4"
            style={{ color: ACCENT }}
          >
            {t("Ajouter à mon agenda")}
          </button>
        )}
        <button
          onClick={() => router.push("/dashboard")}
          className="mt-6 w-full rounded-full py-3 text-sm font-medium text-white"
          style={{ backgroundColor: ACCENT }}
        >
          {t("Aller au tableau de bord")}
        </button>
        {/* Right after confirming is the one moment this person has just
            felt Ittsui's actual value from the receiving side: the natural
            next step is trying the sending side themselves. The link
            carries the sender's invite code, so if they start, both get a
            month of Plus (lib/referral.ts). */}
        <YourTurn senderName={invite.name} senderRef={invite.ref} />
      </Shell>
    );
  }

  if (status === "declined") {
    return (
      <Shell>
        <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: "1.5rem" }}>
          {t("Demande déclinée")}
        </h1>
        <p className="mt-3 text-sm" style={{ color: MUTED }}>
          {t("Aucune donnée n'a été conservée. Rien d'autre à faire.")}
        </p>
      </Shell>
    );
  }

  // "ready" (or "declining"/"error" — both keep rendering this same
  // screen, just with an error message or a disabled state layered on).
  // Two genuinely different paths from here, decided entirely by the
  // preview's requiresLogin — never by anything the client itself infers.
  const instantAcceptAvailable = preview && !preview.requiresLogin;
  const wrongAccount = Boolean(errorMsg && errorMsg === t("cette demande ne correspond pas à votre compte"));

  return (
    <Shell>
      <Link href={pagePath("home", lang)} style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: "1.1rem" }}>
        Ittsui
      </Link>
      <h1 className="mt-4" style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: "1.75rem" }}>
        {preview?.senderName
          ? t("{name} vous invite à un rendez-vous", { name: preview.senderName })
          : t("Vous avez reçu une demande de rendez-vous")}
      </h1>
      <p className="mx-auto mt-3 max-w-xs text-sm" style={{ color: MUTED }}>
        {t(
          "Pas une appli de rencontre : quelqu'un que vous connaissez vous propose un lieu, une date et une heure via Ittsui, un outil de maintien relationnel."
        )}
      </p>

      {preview && <VenuePreviewCard preview={preview} />}

      {errorMsg && wrongAccount && (
        <div className="mt-4 flex justify-center">
          <Mascot name="kokoro" variant="confused" size="lg" />
        </div>
      )}
      {errorMsg && (
        <p className="mt-4 text-sm" style={{ color: ACCENT }}>
          {errorMsg}
          {wrongAccount &&
            t(". Vous êtes connecté(e) avec le mauvais compte Google — reconnectez-vous avec celui qui a reçu la demande.")}
        </p>
      )}

      {instantAcceptAvailable ? (
        // Phone-only request — the link itself is already the
        // authorization (see respond/route.ts), so this is genuinely
        // one tap, no account, no download, matching how the sender
        // originally shared it (WhatsApp/SMS, no app required to open it
        // either).
        <>
          <button
            onClick={handleInstantAccept}
            className="mt-6 w-full rounded-full py-3.5 text-sm font-medium text-white transition-transform hover:scale-[1.01]"
            style={{ backgroundColor: ACCENT }}
          >
            {t("Oui, je viens")}
          </button>
          <button
            onClick={handleDecline}
            className="mt-3 w-full rounded-full border py-3 text-sm font-medium"
            style={{ borderColor: BORDER, color: INK }}
          >
            {t("Pas disponible")}
          </button>
        </>
      ) : (
        <>
          <p className="mx-auto mt-3 max-w-xs text-sm" style={{ color: MUTED }}>
            {t("Un seul geste pour confirmer : connectez-vous avec Google, ça suffit à l'accepter.")}
          </p>
          <button
            onClick={handleAcceptTap}
            disabled={signingIn}
            className="mt-6 w-full rounded-full py-3.5 text-sm font-medium text-white transition-transform hover:scale-[1.01] disabled:opacity-60"
            style={{ backgroundColor: ACCENT }}
          >
            {signingIn ? t("Connexion...") : errorMsg ? t("Se connecter avec un autre compte") : t("J'accepte")}
          </button>
          {!errorMsg && (
            <>
              <p className="mt-3 text-xs" style={{ color: MUTED }}>
                {t("Via Google, juste pour vérifier que c'est bien vous.")}
              </p>
              <button
                onClick={handleDecline}
                className="mt-4 w-full rounded-full border py-3 text-sm font-medium"
                style={{ borderColor: BORDER, color: INK }}
              >
                {t("Pas disponible")}
              </button>
            </>
          )}
        </>
      )}
    </Shell>
  );
}
