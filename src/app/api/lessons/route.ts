export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { deleteR2Objects } from "@/lib/r2";
import { getAuthenticatedRequestUser } from "@/lib/server-auth";

// Compatibility endpoint for integrations that still request /api/lessons.
// New code should use /api/course-content and the courseFolders/courseItems collections.
export async function GET(req: NextRequest) {
  try {
    const courseId = new URL(req.url).searchParams.get("courseId");
    if (!courseId) return NextResponse.json({ error: "courseId required" }, { status: 400 });
    const viewer = await getAuthenticatedRequestUser(req);
    const includePremium = Boolean(viewer?.isAdmin || viewer?.purchasedCourses.includes(courseId));

    const [itemSnapshot, legacySnapshot] = await Promise.all([
      adminDb.collection("courseItems").where("courseId", "==", courseId).get(),
      adminDb.collection("lessons").where("courseId", "==", courseId).get(),
    ]);

    const items: Array<Record<string, unknown> & { id: string }> = itemSnapshot.docs
      .map((doc) => ({ id: doc.id, data: doc.data() as Record<string, unknown> }))
      .filter((item) => item.data.type === "video")
      .map((item) => ({
        id: item.id,
        ...item.data,
        moduleTitle: item.data.folderId,
        durationMinutes: Number(item.data.duration || 0),
      }));
    const lessons: Array<Record<string, unknown> & { id: string }> = legacySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    if (!includePremium) {
      const demoLessons = [...lessons, ...items]
        .filter((lesson) => Boolean(lesson.isFreePreview))
        .map((lesson) => ({
          id: lesson.id,
          title: String(lesson.title || "Demo lesson"),
          type: String(lesson.type || "video"),
          ...(lesson.videoUrl ? { videoUrl: String(lesson.videoUrl) } : {}),
          ...(lesson.pdfUrl ? { pdfUrl: String(lesson.pdfUrl) } : {}),
          isFreePreview: true,
        }));
      return NextResponse.json({ lessons: demoLessons });
    }

    return NextResponse.json({ lessons: [...lessons, ...items] });
  } catch (error) {
    console.error("GET lessons compatibility error:", error);
    return NextResponse.json({ error: "Unable to load lessons" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as Record<string, unknown>;
    const courseId = String(body.courseId || "");
    const moduleTitle = String(body.moduleTitle || "Module 1").trim() || "Module 1";
    const title = String(body.title || "").trim();
    const videoUrl = String(body.videoUrl || "");
    if (!courseId || !title || !videoUrl) return NextResponse.json({ error: "courseId, title and videoUrl required" }, { status: 400 });

    const folderQuery = await adminDb.collection("courseFolders").where("courseId", "==", courseId).get();
    let folderId: string;
    const matchingFolder = folderQuery.docs.find((folder) => folder.data().name === moduleTitle);
    if (!matchingFolder) {
      const folderRef = await adminDb.collection("courseFolders").add({
        courseId,
        name: moduleTitle,
        order: folderQuery.size,
        createdAt: new Date().toISOString(),
      });
      folderId = folderRef.id;
    } else {
      folderId = matchingFolder.id;
    }

    const itemSnapshot = await adminDb.collection("courseItems").where("folderId", "==", folderId).get();
    const itemData = {
      courseId,
      folderId,
      type: "video",
      title,
      videoUrl,
      ...(body.pdfUrl ? { pdfUrl: String(body.pdfUrl) } : {}),
      description: String(body.description || ""),
      duration: Number(body.durationMinutes || 0),
      order: itemSnapshot.size,
      isFreePreview: Boolean(body.isFreePreview),
      createdAt: new Date().toISOString(),
      source: "r2",
    };
    const ref = await adminDb.collection("courseItems").add(itemData);
    return NextResponse.json({ success: true, lesson: { id: ref.id, ...itemData } });
  } catch (error) {
    console.error("POST lessons compatibility error:", error);
    return NextResponse.json({ error: "Unable to create lesson" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    const itemRef = adminDb.collection("courseItems").doc(id);
    const itemSnap = await itemRef.get();
    if (itemSnap.exists) {
      const data = itemSnap.data() || {};
      await itemRef.delete();
      await deleteR2Objects([data.storageKey, data.thumbnailStorageKey].filter(Boolean).map(String));
    } else await adminDb.collection("lessons").doc(id).delete();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE lessons compatibility error:", error);
    return NextResponse.json({ error: "Unable to delete lesson" }, { status: 500 });
  }
}
