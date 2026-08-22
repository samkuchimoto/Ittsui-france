"use client";

// /lib/passkeyClient.ts
// Client-side passkey registration and sign-in — an ADDITIONAL method
// alongside Google Sign-In (lib/firebase.ts), never a replacement. Bridges
// into the same Firebase Auth session via signInWithCustomToken(), so
// every existing watchAuthState()/onAuthStateChanged() call site in
// SetupClient/DashboardClient/PendingClient picks up a passkey-authenticated
// session identically to a Google one — no changes needed there.

import { startRegistration, startAuthentication } from "@simplewebauthn/browser";
import { signInWithCustomToken } from "firebase/auth";
import { auth } from "@/lib/firebase";

async function authedFetch(url: string, idToken: string, body?: unknown) {
  return fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

// Requires an existing signed-in session (via Google) — passkeys are
// something you add to an account you already have, not how you create
// one from nothing.
export async function registerPasskey(label?: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = auth.currentUser;
  if (!user) return { ok: false, error: "Vous devez être connecté(e)." };

  try {
    const idToken = await user.getIdToken();

    const optionsRes = await authedFetch("/api/passkeys/register-options", idToken);
    if (!optionsRes.ok) {
      const data = await optionsRes.json().catch(() => ({}));
      return { ok: false, error: data.error ?? "Impossible de démarrer la configuration." };
    }
    const optionsJSON = await optionsRes.json();

    let response;
    try {
      response = await startRegistration({ optionsJSON });
    } catch (err) {
      // NotAllowedError = user cancelled or timed out — normal, not a bug.
      if (err instanceof Error && err.name === "NotAllowedError") {
        return { ok: false, error: "Configuration annulée." };
      }
      throw err;
    }

    const verifyRes = await authedFetch("/api/passkeys/register-verify", idToken, {
      response,
      label: label || undefined,
    });
    if (!verifyRes.ok) {
      const data = await verifyRes.json().catch(() => ({}));
      return { ok: false, error: data.error ?? "Vérification échouée." };
    }

    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Une erreur est survenue." };
  }
}

// No prior session needed — this IS how a session gets created. Returns
// the signed-in Firebase User on success; callers' existing
// onAuthStateChanged listeners will also fire naturally once
// signInWithCustomToken resolves, same as any other sign-in method.
export async function signInWithPasskey(): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const optionsRes = await fetch("/api/passkeys/auth-options", { method: "POST" });
    if (!optionsRes.ok) {
      return { ok: false, error: "Impossible de démarrer la connexion." };
    }
    const { options: optionsJSON, challengeKey } = await optionsRes.json();

    let response;
    try {
      response = await startAuthentication({ optionsJSON });
    } catch (err) {
      if (err instanceof Error && err.name === "NotAllowedError") {
        return { ok: false, error: "Connexion annulée." };
      }
      throw err;
    }

    const verifyRes = await fetch("/api/passkeys/auth-verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ response, challengeKey }),
    });
    const data = await verifyRes.json();
    if (!verifyRes.ok) {
      return { ok: false, error: data.error ?? "Connexion échouée." };
    }

    await signInWithCustomToken(auth, data.customToken);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Une erreur est survenue." };
  }
}

export interface PasskeySummary {
  id: string;
  label: string;
  createdAt: string;
  lastUsedAt: string | null;
  deviceType: string;
}

export async function listPasskeys(): Promise<PasskeySummary[]> {
  const user = auth.currentUser;
  if (!user) return [];
  const idToken = await user.getIdToken();
  const res = await fetch("/api/passkeys/list", { headers: { Authorization: `Bearer ${idToken}` } });
  if (!res.ok) return [];
  const data = await res.json();
  return data.passkeys ?? [];
}

export async function removePasskey(credentialId: string): Promise<boolean> {
  const user = auth.currentUser;
  if (!user) return false;
  const idToken = await user.getIdToken();
  const res = await authedFetch("/api/passkeys/remove", idToken, { credentialId });
  return res.ok;
}
