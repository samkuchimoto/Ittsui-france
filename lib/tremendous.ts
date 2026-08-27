// /lib/tremendous.ts
// Real digital gift-card fulfillment for "curated"/"suggested" gestures
// — verified against Tremendous's own current API reference on
// 2026-08-27 (developers.tremendous.com/reference/create-order), not
// written from memory. Same honest-fallback posture as Fal.ai
// (lib/... ai-venue-mood, app/api/gestures/route.ts's generatePainting):
// missing configuration returns "not_configured", never a fabricated
// success. This is the one piece of this feature that spends real
// money — TREMENDOUS_GESTURE_AMOUNT_CENTS has no built-in default on
// purpose, so the amount is always something a human explicitly set,
// not a guess.

const SANDBOX_BASE = "https://testflight.tremendous.com/api/v2";
const PRODUCTION_BASE = "https://api.tremendous.com/api/v2";

export type TremendousResult =
  | { status: "not_configured" }
  | { status: "sent"; orderId: string }
  | { status: "failed"; reason: string };

export async function sendTremendousReward({
  externalId,
  recipientEmail,
  recipientName,
  senderName,
  message,
}: {
  externalId: string; // idempotency key — the gesture's own Firestore doc id
  recipientEmail: string;
  recipientName: string;
  senderName: string;
  message: string;
}): Promise<TremendousResult> {
  const apiKey = process.env.TREMENDOUS_API_KEY;
  const campaignId = process.env.TREMENDOUS_CAMPAIGN_ID;
  const fundingSourceId = process.env.TREMENDOUS_FUNDING_SOURCE_ID;
  const amountCents = process.env.TREMENDOUS_GESTURE_AMOUNT_CENTS;
  if (!apiKey || !campaignId || !fundingSourceId || !amountCents) {
    return { status: "not_configured" };
  }
  const denomination = Number(amountCents) / 100;
  if (!Number.isFinite(denomination) || denomination <= 0) {
    return { status: "failed", reason: "TREMENDOUS_GESTURE_AMOUNT_CENTS invalide" };
  }

  const baseUrl = process.env.TREMENDOUS_ENV === "production" ? PRODUCTION_BASE : SANDBOX_BASE;

  try {
    const res = await fetch(`${baseUrl}/orders`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        external_id: externalId,
        payment: { funding_source_id: fundingSourceId },
        reward: {
          campaign_id: campaignId,
          value: { denomination, currency_code: "EUR" },
          recipient: { email: recipientEmail, name: recipientName },
          delivery: { method: "EMAIL", meta: { sender_name: senderName, message } },
        },
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`tremendous: order failed (${res.status}) ${body}`);
      return { status: "failed", reason: `HTTP ${res.status}` };
    }
    const data = await res.json();
    const orderId: unknown = data?.order?.id;
    if (typeof orderId !== "string") return { status: "failed", reason: "réponse inattendue" };
    return { status: "sent", orderId };
  } catch (err) {
    console.error("tremendous: request threw", err);
    return { status: "failed", reason: "network error" };
  }
}
