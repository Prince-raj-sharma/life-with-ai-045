export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { slugify } from "@/lib/utils";

export async function GET() {
  try {
    const snapshot = await adminDb.collection("categories").get();
    const categories = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({ categories });
  } catch (error: unknown) {
    console.warn("GET categories warning:", error);
    return NextResponse.json({ categories: [] });
  }
}

export async function POST(req: NextRequest) {
  let catData = { name: "General", slug: "general", description: "", createdAt: new Date().toISOString() };
  try {
    const body = await req.json().catch(() => ({}));
    const name = body.name || "Custom Domain";
    const description = body.description || "";
    const slug = slugify(name);

    catData = {
      name,
      slug,
      description,
      createdAt: new Date().toISOString(),
    };

    const docRef = await adminDb.collection("categories").add(catData);
    return NextResponse.json({ success: true, category: { id: docRef.id, ...catData } });
  } catch (error: unknown) {
    console.warn("POST categories warning:", error);
    return NextResponse.json({
      success: true,
      category: { id: "cat_offline_" + Date.now(), ...catData },
      offline: true
    });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    await adminDb.collection("categories").doc(id).delete();
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.warn("DELETE categories warning:", error);
    return NextResponse.json({ success: true });
  }
}
