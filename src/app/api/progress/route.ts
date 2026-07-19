export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const courseId = searchParams.get("courseId");

    if (!userId || !courseId) {
      return NextResponse.json({ error: "userId and courseId required" }, { status: 400 });
    }

    const docId = `${userId}_${courseId}`;
    const docSnap = await adminDb.collection("progress").doc(docId).get();

    if (!docSnap.exists) {
      return NextResponse.json({
        progress: {
          userId,
          courseId,
          completedLessonIds: [],
        }
      });
    }

    return NextResponse.json({ progress: { id: docSnap.id, ...docSnap.data() } });
  } catch (error: unknown) {
    console.warn("GET progress warning:", error);
    return NextResponse.json({ progress: { completedLessonIds: [] } });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId, courseId, lessonId, isCompleted } = await req.json();
    if (!userId || !courseId || !lessonId) {
      return NextResponse.json({ error: "Missing progress parameters" }, { status: 400 });
    }

    const docId = `${userId}_${courseId}`;
    const progressRef = adminDb.collection("progress").doc(docId);
    const docSnap = await progressRef.get();

    let completedLessonIds: string[] = [];
    if (docSnap.exists) {
      completedLessonIds = docSnap.data()?.completedLessonIds || [];
    }

    if (isCompleted && !completedLessonIds.includes(lessonId)) {
      completedLessonIds.push(lessonId);
    } else if (!isCompleted) {
      completedLessonIds = completedLessonIds.filter((id) => id !== lessonId);
    }

    const progressData = {
      userId,
      courseId,
      completedLessonIds,
      lastAccessedLessonId: lessonId,
      updatedAt: new Date().toISOString(),
    };

    await progressRef.set(progressData, { merge: true });

    return NextResponse.json({ success: true, progress: progressData });
  } catch (error: unknown) {
    console.warn("POST progress warning:", error);
    return NextResponse.json({ success: true });
  }
}
