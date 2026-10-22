// /app/api/plan/route.ts
// The signed-in person's plan (lib/plan.ts): trial, free or Plus, and this
// month's rendez-vous. The first call, made right after sign-in by
// lib/firebase.ts, starts the 14-day trial.

import { NextResponse } from "next/server";
import { verifyRequestUser } from "@/lib/firebaseAdmin";
import { getPlan } from "@/lib/plan";

async function handle(request: Request) {
  const uid = await verifyRequestUser(request);
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json(await getPlan(uid));
}

export const GET = handle;
export const POST = handle;
