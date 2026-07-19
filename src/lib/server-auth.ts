import { NextRequest } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

const ADMIN_EMAIL = "princerajpiyush84@gmail.com";

export interface AuthenticatedRequestUser {
  uid: string;
  isAdmin: boolean;
  purchasedCourses: string[];
}

export async function getAuthenticatedRequestUser(req: NextRequest): Promise<AuthenticatedRequestUser | null> {
  const authorization = req.headers.get("authorization") || "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!token) return null;

  try {
    const decoded = await adminAuth.verifyIdToken(token);

    const profile = await adminDb.collection("users").doc(decoded.uid).get();
    const profileData = profile.data() || {};
    const isAdmin = decoded.email?.toLowerCase() === ADMIN_EMAIL || decoded.role === "admin" || profileData.role === "admin";
    const purchasedCourses = Array.isArray(profileData.purchasedCourses) ? profileData.purchasedCourses.map(String) : [];
    return { uid: decoded.uid, isAdmin, purchasedCourses };
  } catch (error) {
    console.warn("Admin token verification failed:", error);
    return null;
  }
}

export async function isAdminRequest(req: NextRequest) {
  return Boolean((await getAuthenticatedRequestUser(req))?.isAdmin);
}
