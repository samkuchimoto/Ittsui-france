// /app/api/meeting-requests/list/route.ts
// Powers the dashboard's request-tracking panel: everything the signed-in
// user sent, and everything sent to them (once resolved onto recipientId
// by /api/meeting-requests/respond — a still-pending request to someone
// who hasn't signed in yet won't show up on their side, same as a Pair
// invite not appearing anywhere until accepted).

import { NextResponse } from "next/server";
import { verifyRequestUser, adminDb } from "@/lib/firebaseAdmin";
import type { MeetingRequest } from "@/lib/types";

export async function GET(request: Request) {
  const uid = await verifyRequestUser(request);
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // where() without orderBy on purpose — combining an equality filter with
  // orderBy on a different field needs a Firestore composite index that
  // doesn't exist in this project (see lib/sort.ts's identical reasoning
  // for the equivalent /pairs query). Sorted in-memory instead; negligible
  // cost for the small per-user set this is.
  const [sentSnap, receivedSnap] = await Promise.all([
    adminDb.collection("meetingRequests").where("senderId", "==", uid).get(),
    adminDb.collection("meetingRequests").where("recipientId", "==", uid).get(),
  ]);

  const byNewest = (a: MeetingRequest, b: MeetingRequest) => (a.createdAt < b.createdAt ? 1 : -1);

  const sent = sentSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as MeetingRequest).sort(byNewest);
  const received = receivedSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as MeetingRequest).sort(byNewest);

  return NextResponse.json({ sent, received });
}
