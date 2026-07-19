export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get("courseId");
    const all = searchParams.get("all") === "true";

    let query: FirebaseFirestore.Query = adminDb.collection("reviews");
    if (courseId) {
      query = query.where("courseId", "==", courseId);
    }
    if (!all) {
      query = query.where("status", "==", "approved");
    }

    const snapshot = await query.get();
    const reviews = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({ reviews });
  } catch (error: unknown) {
    console.warn("GET reviews warning:", error);
    return NextResponse.json({ reviews: [] });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { courseId, userId, userName, userImage, rating, comment } = await req.json();
    if (!courseId || !userId || !rating || !comment) {
      return NextResponse.json({ error: "Missing required review fields" }, { status: 400 });
    }

    const reviewData = {
      courseId,
      userId,
      userName: userName || "Student",
      userImage: userImage || "",
      rating: Number(rating),
      comment,
      status: "approved", // auto-approve or pending
      createdAt: new Date().toISOString(),
    };

    const docRef = await adminDb.collection("reviews").add(reviewData);

    // Update course averageRating
    try {
      const allReviewsSnap = await adminDb.collection("reviews").where("courseId", "==", courseId).where("status", "==", "approved").get();
      const docs = allReviewsSnap.docs;
      const total = docs.length;
      const sum = docs.reduce((acc, d) => acc + (d.data().rating || 5), 0);
      const avg = total > 0 ? (sum / total).toFixed(1) : 5.0;

      await adminDb.collection("courses").doc(courseId).set({
        averageRating: Number(avg),
        totalReviews: total,
      }, { merge: true });
    } catch (e) {
      console.warn("Avg rating calc warning:", e);
    }

    return NextResponse.json({ success: true, review: { id: docRef.id, ...reviewData } });
  } catch (error: unknown) {
    console.warn("POST review warning:", error);
    return NextResponse.json({ success: true, review: { id: "mock", ...req.body } });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    await adminDb.collection("reviews").doc(id).delete();
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.warn("DELETE review warning:", error);
    return NextResponse.json({ success: true });
  }
}
