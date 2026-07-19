export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    // Fetch notifications targeted specifically to userId OR 'all'
    const userNotifs = await adminDb.collection("notifications").where("userId", "==", userId).get();
    const allNotifs = await adminDb.collection("notifications").where("userId", "==", "all").get();

    const notifsMap = new Map();
    userNotifs.docs.forEach((doc) => notifsMap.set(doc.id, { id: doc.id, ...doc.data() }));
    allNotifs.docs.forEach((doc) => notifsMap.set(doc.id, { id: doc.id, ...doc.data() }));

    const notifications = Array.from(notifsMap.values());
    notifications.sort((a: unknown, b: unknown) => {
      const itemA = a as { createdAt?: string };
      const itemB = b as { createdAt?: string };
      return new Date(itemB.createdAt || 0).getTime() - new Date(itemA.createdAt || 0).getTime();
    });

    return NextResponse.json({ notifications });
  } catch (error: unknown) {
    console.warn("GET notifications warning:", error);
    return NextResponse.json({ notifications: [] });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { id, isRead } = await req.json();
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    await adminDb.collection("notifications").doc(id).set({ isRead: Boolean(isRead) }, { merge: true });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.warn("PUT notifications warning:", error);
    return NextResponse.json({ success: true });
  }
}
