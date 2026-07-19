export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebase-admin";

export async function POST(req: NextRequest) {
  try {
    const { uid } = await req.json();

    if (!uid) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }
    const user = await adminAuth.getUser(uid);
    console.log(user.email);

    await adminDb.collection("users").doc(uid).delete();
    console.log("Deleting Auth User:", uid);
    console.log("Auth user deleted successfully");

    try {
      await adminAuth.deleteUser(uid);
    console.log("✅ Firebase Auth user deleted");
    } catch (error) {
      console.error("❌ Failed to delete Auth user:", error);
      return NextResponse.json(
        {
          success: false,
          error: String(error),
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Student deleted successfully",
    });

  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Delete failed" },
      { status: 500 }
    );
  }
}