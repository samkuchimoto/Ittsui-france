import { test, expect } from "@playwright/test";

// Checks the unauthenticated default state of each page — not the full
// signed-in product, which would need a real Firebase account to
// simulate reliably. What these actually verify: FriendlyLoading's
// rotating text ("Un instant…" etc.) resolves to real content within a
// bound time rather than spinning forever. A screenshot of that rotating
// text alone can't prove a hang (see CLAUDE.md's note on this) — an
// automated wait-then-assert can.

const LOADING_TEXT = /Un instant…|On vérifie tout ça…|Presque prêt…/;

test.describe("Onboarding pages resolve past their loading state", () => {
  test("/setup shows the sign-in prompt, not a stuck loader", async ({ page }) => {
    await page.goto("/setup");
    await expect(page.getByText("Connectez-vous pour continuer.")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(LOADING_TEXT)).not.toBeVisible();
  });

  test("/invite/[pairId] shows the invite preview shell for an unknown link, not a stuck loader", async ({
    page,
  }) => {
    // A syntactically valid but nonexistent pairId — the point here isn't
    // activation (that needs a real signed-in account matching a real
    // pending invite), it's that the page's own "checking" state resolves
    // to *something* real instead of hanging indefinitely.
    await page.goto("/invite/e2e-test-nonexistent-pair-id");
    await expect(page.getByText("Vous avez été invité(e) sur Ittsui")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(LOADING_TEXT)).not.toBeVisible();
  });

  test("/dashboard redirects an unauthenticated visitor to /setup rather than hanging", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForURL(/\/setup(?!\/)/, { timeout: 10_000 });
  });

  // A syntactically valid but nonexistent requestId. Unlike the /invite
  // test above, this page's "checking" state resolves purely from the new
  // GET /api/meeting-requests/[requestId] preview fetch — no auth
  // dependency at all — so this also doubles as coverage that the fetch
  // itself completes and correctly surfaces a 404 as a real page state,
  // not an infinite loader.
  test("/request/[requestId] shows a not-found state for an unknown link, not a stuck loader", async ({ page }) => {
    await page.goto("/request/e2e-test-nonexistent-request-id");
    await expect(page.getByText("Demande introuvable")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(LOADING_TEXT)).not.toBeVisible();
  });
});

test.describe("GET /api/meeting-requests/[requestId] (public preview)", () => {
  test("returns 404 for a nonexistent request, not a 500 or a hang", async ({ request }) => {
    const res = await request.get("/api/meeting-requests/e2e-test-nonexistent-request-id");
    expect(res.status()).toBe(404);
    const body = await res.json();
    expect(body.error).toBeTruthy();
  });
});
