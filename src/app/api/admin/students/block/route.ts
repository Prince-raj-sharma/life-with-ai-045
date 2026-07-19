export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function POST(req: NextRequest) {
  try {
    const { uid, blocked } = await req.json();

    if (!uid) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    await adminDb.collection("users").doc(uid).set(
      {
        blocked,
      },
      { merge: true }
    );

    return NextResponse.json({
      success: true,
      blocked,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Failed to update student status" },
      { status: 500 }
    );
  }
}