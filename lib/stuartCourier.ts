// /lib/stuartCourier.ts
// Real courier dispatch for "own" mode gestures — verified against
// Stuart's own open-source client libraries on 2026-08-27
// (github.com/StuartApp/stuart-client-js and stuart-client-php), not
// guessed: their public marketing/help pages describe the feature but
// don't republish the technical contract, so the source of truth here
// is the literal request/response shapes their official clients send,
// not a paraphrase of a report.
//
// OAuth2 client_credentials flow, base URLs api(.sandbox).stuart.com,
// POST /v2/jobs with a { job: { pickups, dropoffs } } body. Only fires
// once BOTH addresses are known — the sender's pickup (collected at
// creation) and the recipient's own dropoff (collected via
// /api/gestures/[gestureId]'s PATCH) — Ittsui never has both before
// that second step, so this is called from the PATCH handler, not the
// creation route. Same honest-fallback posture as the Fal.ai painting
// call: missing configuration returns "not_configured", never a
// fabricated dispatch.

const SANDBOX_BASE = "https://api.sandbox.stuart.com";
const PRODUCTION_BASE = "https://api.stuart.com";

export type StuartResult =
  | { status: "not_configured" }
  | { status: "dispatched"; jobId: string; trackingUrl?: string }
  | { status: "failed"; reason: string };

async function getAccessToken(baseUrl: string, clientId: string, clientSecret: string): Promise<string | null> {
  try {
    const res = await fetch(`${baseUrl}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: clientId,
        client_secret: clientSecret,
        scope: "api",
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return typeof data?.access_token === "string" ? data.access_token : null;
  } catch {
    return null;
  }
}

export async function dispatchStuartCourier({
  clientReference,
  packageDescription,
  pickupAddress,
  pickupContact,
  dropoffAddress,
  dropoffContact,
}: {
  clientReference: string; // idempotency-ish reference — the gesture's own Firestore doc id
  packageDescription: string;
  pickupAddress: string;
  pickupContact: { firstname: string; lastname: string; phone: string };
  dropoffAddress: string;
  dropoffContact: { firstname: string; lastname: string; phone: string };
}): Promise<StuartResult> {
  const clientId = process.env.STUART_CLIENT_ID;
  const clientSecret = process.env.STUART_CLIENT_SECRET;
  if (!clientId || !clientSecret) return { status: "not_configured" };

  const baseUrl = process.env.STUART_ENV === "production" ? PRODUCTION_BASE : SANDBOX_BASE;

  const token = await getAccessToken(baseUrl, clientId, clientSecret);
  if (!token) return { status: "failed", reason: "échec d'authentification Stuart" };

  try {
    const res = await fetch(`${baseUrl}/v2/jobs`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        job: {
          transport_type: "bike",
          pickups: [{ address: pickupAddress, contact: pickupContact }],
          dropoffs: [
            {
              address: dropoffAddress,
              contact: dropoffContact,
              package_type: "small",
              package_description: packageDescription,
              client_reference: clientReference,
            },
          ],
        },
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`stuart: job creation failed (${res.status}) ${body}`);
      return { status: "failed", reason: `HTTP ${res.status}` };
    }
    const data = await res.json();
    const jobId: unknown = data?.id;
    const trackingUrl: unknown = data?.deliveries?.[0]?.tracking_url;
    if (typeof jobId !== "string" && typeof jobId !== "number") {
      return { status: "failed", reason: "réponse inattendue" };
    }
    return { status: "dispatched", jobId: String(jobId), trackingUrl: typeof trackingUrl === "string" ? trackingUrl : undefined };
  } catch (err) {
    console.error("stuart: request threw", err);
    return { status: "failed", reason: "network error" };
  }
}
