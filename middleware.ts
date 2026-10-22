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

import { NextResponse, type NextRequest } from "next/server";
import { LANG_COOKIE, isLocale } from "@/lib/i18n";

const YEAR = 60 * 60 * 24 * 365;

// An invite link (?ref=CODE, lib/referral.ts) is kept for 30 days, so the
// month of Plus it promises is there when the person signs up.
const REF_COOKIE = "ittsui_ref";
const MONTH = 60 * 60 * 24 * 30;

export function middleware(request: NextRequest) {
  const response = route(request);
  const ref = request.nextUrl.searchParams.get("ref");
  if (ref && /^[A-HJ-NP-Z2-9]{6}$/.test(ref)) response.cookies.set(REF_COOKIE, ref, { path: "/", maxAge: MONTH, sameSite: "lax" });
  return response;
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
    "/en",
    "/ja",
    "/es",
    "/he",
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
