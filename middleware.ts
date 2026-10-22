// /middleware.ts
// Two small language jobs, nothing else (no auth, no rewrites: see
// AGENTS.md on what auth-related routing has cost before).
//
// 1. ?lang=en|ja|fr on an app link — set by the English and Japanese
//    pages (lib/i18n.ts withLang) — is remembered in the ittsui_lang
//    cookie, and injected into this same request so the server render
//    already uses it instead of asking.
// 2. A returning visitor who chose English or Japanese, arriving on "/",
//    is sent to /en or /ja. Search engines and first-time visitors have
//    no cookie and get the French homepage, which stays the default.
//
// Plus two first-party cookies: an invite code (ittsui_ref) and the first
// city page or campaign link someone arrives through (ittsui_src).

import { NextResponse, type NextRequest } from "next/server";
import { LANG_COOKIE, isLocale } from "@/lib/i18n";
import { landingOf } from "@/lib/cities";

const YEAR = 60 * 60 * 24 * 365;

// An invite link (?ref=CODE, lib/referral.ts) is kept for 30 days, so the
// month of Plus it promises is there when the person signs up.
const REF_COOKIE = "ittsui_ref";
const MONTH = 60 * 60 * 24 * 30;

// The first city landing page or campaign link (utm_source) someone arrives
// through, kept 30 days and never overwritten: lib/plan.ts counts the
// accounts each one brings, without storing it with the account.
const SRC_COOKIE = "ittsui_src";

export function middleware(request: NextRequest) {
  const response = route(request);
  const ref = request.nextUrl.searchParams.get("ref");
  if (ref && /^[A-HJ-NP-Z2-9]{6}$/.test(ref)) response.cookies.set(REF_COOKIE, ref, { path: "/", maxAge: MONTH, sameSite: "lax" });
  if (!request.cookies.has(SRC_COOKIE)) {
    const source = firstTouch(request);
    if (source) response.cookies.set(SRC_COOKIE, source, { path: "/", maxAge: MONTH, sameSite: "lax" });
  }
  return response;
}

function firstTouch(request: NextRequest): string | null {
  const { pathname, searchParams } = request.nextUrl;
  const landing = landingOf(pathname);
  const utmSource = searchParams.get("utm_source");
  if (!landing && !utmSource) return null;
  const clean = (value: string | null) => (value ?? "").replace(/[^\w.-]/g, "").slice(0, 40);
  const candidates = [landing?.lang, pathname.split("/")[1], searchParams.get("lang"), request.cookies.get(LANG_COOKIE)?.value];
  const lang = candidates.find((value) => isLocale(value)) ?? "fr";
  return new URLSearchParams({
    city: landing?.city ?? "",
    lang,
    utm_source: clean(utmSource),
    utm_campaign: clean(searchParams.get("utm_campaign")),
  }).toString();
}

function route(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  const fromUrl = searchParams.get("lang");

  if (isLocale(fromUrl)) {
    if (pathname === "/" && fromUrl !== "fr") {
      const url = request.nextUrl.clone();
      url.pathname = `/${fromUrl}`;
      url.searchParams.delete("lang");
      const redirect = NextResponse.redirect(url, 307);
      redirect.cookies.set(LANG_COOKIE, fromUrl, { path: "/", maxAge: YEAR, sameSite: "lax" });
      return redirect;
    }
    const headers = new Headers(request.headers);
    const otherCookies = (request.headers.get("cookie") ?? "")
      .split(/;\s*/)
      .filter((cookie) => cookie && !cookie.startsWith(`${LANG_COOKIE}=`));
    headers.set("cookie", [...otherCookies, `${LANG_COOKIE}=${fromUrl}`].join("; "));
    const response = NextResponse.next({ request: { headers } });
    response.cookies.set(LANG_COOKIE, fromUrl, { path: "/", maxAge: YEAR, sameSite: "lax" });
    return response;
  }

  if (pathname === "/") {
    const saved = request.cookies.get(LANG_COOKIE)?.value;
    if (saved && saved !== "fr" && isLocale(saved)) {
      const url = request.nextUrl.clone();
      url.pathname = `/${saved}`;
      return NextResponse.redirect(url, 307);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/ja",
    "/es",
    "/he",
    "/paris",
    // :path*, not :city: Next appends (.json)? to each source, which turns a
    // bare trailing :city into a param that only matches ".json".
    "/en/:path*",
    "/ja/tokyo",
    "/es/ciudad-de-mexico",
    "/he/tel-aviv",
    "/setup/:path*",
    "/dashboard/:path*",
    "/contacts/:path*",
    "/request/:path*",
    "/invite/:path*",
    "/geste/:path*",
    "/partenaires/:path*",
    "/triage/:path*",
  ],
};
