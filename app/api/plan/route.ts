// /app/api/plan/route.ts
// The signed-in person's plan (lib/plan.ts): trial, free or Plus, this
// month's rendez-vous and their invite code. The first call, made right
// after sign-in by lib/firebase.ts, starts the 14-day trial, a month longer
// with an invite code in the ittsui_ref cookie (lib/referral.ts), and counts
// the new account by the city page or campaign it came through (ittsui_src).

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyRequestUser } from "@/lib/firebaseAdmin";
import { getPlan } from "@/lib/plan";

async function handle(request: Request) {
  const uid = await verifyRequestUser(request);
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json(await getPlan(uid, cookies().get("ittsui_ref")?.value, cookies().get("ittsui_src")?.value));
}

export const GET = handle;
export const POST = handle;
