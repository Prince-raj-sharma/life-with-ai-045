export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

const ADMIN_EMAIL = "princerajpiyush84@gmail.com";

function normalizeIndianMobile(value: string) {
  const trimmed = value.trim();
  if (!trimmed || !/^[+\d\s()-]+$/.test(trimmed)) return null;

  const digits = trimmed.replace(/\D/g, "");
  const nationalNumber =
    digits.length === 10
      ? digits
      : digits.length === 11 && digits.startsWith("0")
        ? digits.slice(1)
        : digits.length === 12 && digits.startsWith("91")
          ? digits.slice(2)
          : null;

  if (!nationalNumber || !/^[6-9]\d{9}$/.test(nationalNumber)) return null;
  return `+91${nationalNumber}`;
}

export async function POST(req: NextRequest) {
  try {
    const authorization = req.headers.get("authorization") || "";
    const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
    if (!token) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const decoded = await adminAuth.verifyIdToken(token);
    const { uid, email: bodyEmail, displayName, mobile, photoURL } = await req.json();

    if (uid && uid !== decoded.uid) {
      return NextResponse.json({ error: "Authenticated user mismatch" }, { status: 403 });
    }

    const email = decoded.email || bodyEmail;
    if (!email) {
      return NextResponse.json({ error: "Authenticated email is missing" }, { status: 400 });
    }

    const normalizedMobile = typeof mobile === "string" && mobile.trim()
      ? normalizeIndianMobile(mobile)
      : undefined;
    if (typeof mobile === "string" && mobile.trim() && !normalizedMobile) {
      return NextResponse.json({ error: "Please provide a valid Indian mobile number" }, { status: 400 });
    }

    const userRef = adminDb.collection("users").doc(decoded.uid);
    const docSnap = await userRef.get();
    const existingData = docSnap.exists ? docSnap.data() || {} : {};

    const role = email.toLowerCase() === ADMIN_EMAIL ? "admin" : "student";
    const providerId = typeof decoded.firebase?.sign_in_provider === "string"
      ? decoded.firebase.sign_in_provider
      : "";
    const emailVerified = providerId !== "password" || decoded.email_verified === true;
    const now = new Date().toISOString();
    const resolvedDisplayName = typeof displayName === "string" && displayName.trim()
      ? displayName.trim()
      : (typeof existingData.displayName === "string" && existingData.displayName.trim()
        ? existingData.displayName
        : email.split("@")[0]);

    const profileData = {
      uid: decoded.uid,
      email,
      displayName: resolvedDisplayName,
      photoURL: photoURL || existingData.photoURL || null,
      role,
      createdAt: existingData.createdAt || now,
      lastLogin: now,
      emailVerified,
      purchasedCourses: Array.isArray(existingData.purchasedCourses) ? existingData.purchasedCourses : [],
      wishlist: Array.isArray(existingData.wishlist) ? existingData.wishlist : [],
      bookmarks: Array.isArray(existingData.bookmarks) ? existingData.bookmarks : [],
      ...(normalizedMobile ? { mobile: normalizedMobile } : existingData.mobile ? { mobile: existingData.mobile } : {}),
    };

    await userRef.set(profileData, { merge: true });
    return NextResponse.json({ status: docSnap.exists ? "updated" : "created", role, emailVerified });
  } catch (error: unknown) {
    console.error("Auth sync API error:", error);
    return NextResponse.json({ error: "Could not synchronize your account profile" }, { status: 500 });
  }
}
