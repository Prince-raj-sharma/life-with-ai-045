"use server";

import { adminDb } from "@/firebase/admin";

export async function getPlatformStatusAction() {
  try {
    const courses = await adminDb.collection("courses").count().get();
    return { success: true, count: courses.data().count };
  } catch {
    return { success: false, count: 0 };
  }
}
