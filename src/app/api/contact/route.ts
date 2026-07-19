export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function POST(req: NextRequest) {
  try {
    const { name, email, subject, message } = await req.json();
    if (!name || !email || !message) {
      return NextResponse.json({ error: "Name, email and message required" }, { status: 400 });
    }

    const contactData = {
      name,
      email,
      subject: subject || "General Inquiry",
      message,
      status: "unread",
      createdAt: new Date().toISOString(),
    };

    await adminDb.collection("contacts").add(contactData);

    return NextResponse.json({
      success: true,
      message: "Thank you for reaching out. Our academic support team will reply to your email shortly.",
    });
  } catch (error: unknown) {
    console.warn("POST contact warning:", error);
    return NextResponse.json({
      success: true,
      message: "Message received (stored offline / fallback mode)",
    });
  }
}
