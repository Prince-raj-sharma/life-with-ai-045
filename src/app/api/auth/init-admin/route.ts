export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

const ADMIN_EMAIL = "princerajpiyush84@gmail.com";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const adminPassword = body.password || process.env.ADMIN_INITIAL_PASSWORD || process.env.ADMIN_PASSWORD;

    if (!adminPassword) {
      return NextResponse.json({
        success: false,
        message: "Security Error: No admin password provided in request body or ADMIN_INITIAL_PASSWORD environment variable."
      }, { status: 400 });
    }

    let uid = "";
    try {
      const existingUser = await adminAuth.getUserByEmail(ADMIN_EMAIL);
      uid = existingUser.uid;
      await adminAuth.updateUser(uid, { password: adminPassword });
    } catch {
      const newUser = await adminAuth.createUser({
        email: ADMIN_EMAIL,
        password: adminPassword,
        displayName: "Prince Raj (Admin)",
        emailVerified: true,
      });
      uid = newUser.uid;
    }

    await adminAuth.setCustomUserClaims(uid, { admin: true });

    const userRef = adminDb.collection("users").doc(uid);
    await userRef.set({
      uid,
      email: ADMIN_EMAIL,
      displayName: "Prince Raj (Admin)",
      role: "admin",
      createdAt: new Date().toISOString(),
      emailVerified: true,
      purchasedCourses: [],
      wishlist: [],
      bookmarks: [],
    }, { merge: true });

    return NextResponse.json({
      success: true,
      message: `Admin account ${ADMIN_EMAIL} initialized successfully.`
    });
  } catch (error: unknown) {
    console.warn("Init admin API warning:", error);
    return NextResponse.json({
      success: false,
      message: "Could not initialize admin via Admin SDK (check FIREBASE_PRIVATE_KEY in .env.local)."
    }, { status: 200 });
  }
}
