// /lib/passkeys.ts
// Shared server-side config and Firestore-backed challenge storage for the
// passkey (WebAuthn) sign-in flow — an ADDITIONAL method alongside Google
// Sign-In (lib/firebase.ts's signInWithGoogle, entirely unchanged), never a
// replacement. Both remain fully independent sign-in paths.
//
// rpID must be a domain the page is actually served from, or a parent of
// it — the apex "ittsui.fr" covers both ittsui.fr and www.ittsui.fr, since
// a subdomain may use its parent's rpID. That's why EXPECTED_ORIGINS still
// lists both explicitly (origin matching is exact, unlike rpID), without
// needing to first resolve the apex/www canonicalization question raised
// elsewhere in this project.

import { adminDb } from "@/lib/firebaseAdmin";

// Configurable so passkeys are actually testable against localhost in dev
// (WebAuthn strictly rejects any rpID that isn't the current page's domain
// or a registrable parent of it — confirmed hard error, not a suggestion,
// while building this) — production always defaults to the real values
// regardless of whether these env vars are set.
export const RP_NAME = "Ittsui";
export const RP_ID = process.env.PASSKEY_RP_ID || "ittsui.fr";
export const EXPECTED_ORIGINS = process.env.PASSKEY_ORIGINS
  ? process.env.PASSKEY_ORIGINS.split(",")
  : ["https://ittsui.fr", "https://www.ittsui.fr"];

const CHALLENGE_TTL_MS = 5 * 60 * 1000; // 5 minutes — generous for a real user completing a biometric prompt, short enough that a stale challenge can't be replayed much later

// Registration challenges are keyed by the caller's uid (already known —
// registration requires being signed in first). Authentication challenges
// have no known user yet, so callers pass a fresh random key instead (see
// app/api/passkeys/auth-options/route.ts) and echo it back on verify.
export async function storeChallenge(key: string, challenge: string): Promise<void> {
  await adminDb.collection("passkeyChallenges").doc(key).set({
    challenge,
    createdAt: Date.now(),
  });
}

// One-time use: deletes the challenge as it reads it, so a captured
// request/response pair can't be replayed to complete a second ceremony.
export async function consumeChallenge(key: string): Promise<string | null> {
  const ref = adminDb.collection("passkeyChallenges").doc(key);
  const snap = await ref.get();
  if (!snap.exists) return null;
  await ref.delete();
  const data = snap.data()!;
  if (Date.now() - (data.createdAt as number) > CHALLENGE_TTL_MS) return null;
  return data.challenge as string;
}

export interface StoredPasskeyCredential {
  userId: string;
  publicKey: string; // base64 of the raw public key bytes SimpleWebAuthn returns
  counter: number;
  transports: string[];
  deviceType: string; // "singleDevice" | "multiDevice" (credentialDeviceType)
  backedUp: boolean;
  label: string; // user-facing name for account-management UI ("lost device" removal)
  createdAt: string;
  lastUsedAt: string | null;
}
