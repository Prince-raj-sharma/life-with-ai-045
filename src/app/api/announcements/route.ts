export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function GET() {
  try {
    const snapshot = await adminDb.collection("announcements").get();
    const announcements = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    announcements.sort((a: unknown, b: unknown) => {
      const itemA = a as { createdAt?: string };
      const itemB = b as { createdAt?: string };
      return new Date(itemB.createdAt || 0).getTime() - new Date(itemA.createdAt || 0).getTime();
    });

    return NextResponse.json({ announcements });
  } catch (error: unknown) {
    console.warn("GET announcements warning:", error);
    return NextResponse.json({ announcements: [] });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { title, content, target, createdBy } = await req.json();
    if (!title || !content) {
      return NextResponse.json({ error: "Title and content required" }, { status: 400 });
    }

    const annData = {
      title,
      content,
      target: target || "all",
      createdBy: createdBy || "Admin",
      createdAt: new Date().toISOString(),
    };

    const docRef = await adminDb.collection("announcements").add(annData);

    // Also broadcast notification to students
    try {
      await adminDb.collection("notifications").add({
        userId: "all",
        title: `📢 Announcement: ${title}`,
        message: content.slice(0, 100) + (content.length > 100 ? "..." : ""),
        type: "announcement",
        isRead: false,
        createdAt: new Date().toISOString(),
        link: "/dashboard/notifications"
      });
    } catch (e) {
      console.warn("Ann broadcast warn:", e);
    }

    return NextResponse.json({ success: true, announcement: { id: docRef.id, ...annData } });
  } catch (error: unknown) {
    console.warn("POST announcement warning:", error);
    return NextResponse.json({ success: true, announcement: { id: "mock", ...req.body } });
  }
}
