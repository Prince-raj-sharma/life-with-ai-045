export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function POST(req: NextRequest) {
  try {
    const { uid, displayName } = await req.json();

    if (!uid || !displayName) {
      return NextResponse.json(
        { error: "Missing fields" },
        { status: 400 }
      );
    }

    await adminDb.collection("users").doc(uid).set(
      {
        displayName,
      },
      { merge: true }
    );

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error: "Update failed",
      },
      {
        status: 500,
      }
    );
  }
}