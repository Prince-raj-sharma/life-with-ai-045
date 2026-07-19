export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { adminDb } from "@/lib/firebase-admin";
import { assertR2Config, r2 } from "@/lib/r2";
import { isAdminRequest } from "@/lib/server-auth";

function safeDownloadName(name: string) {
  return name.replace(/[\\/\r\n\"<>:|?*]+/g, "-").slice(0, 180) || "course-file";
}

export async function GET(req: NextRequest) {
  if (!(await isAdminRequest(req))) return NextResponse.json({ error: "Admin authorization required" }, { status: 403 });
  const searchParams = new URL(req.url).searchParams;
  const courseId = searchParams.get("courseId") || "";
  const itemId = searchParams.get("itemId") || "";
  if (!courseId || !itemId) return NextResponse.json({ error: "courseId and itemId are required" }, { status: 400 });

  try {
    const item = await adminDb.collection("courseItems").doc(itemId).get();
    if (!item.exists || item.data()?.courseId !== courseId) return NextResponse.json({ error: "File not found" }, { status: 404 });
    const data = item.data() || {};
    const title = safeDownloadName(String(data.title || "course-file"));
    const mode = searchParams.get("mode");
    const storageKey = String(data.storageKey || data.r2Key || "");
    if (storageKey) {
      assertR2Config();
      const signedUrl = await getSignedUrl(r2, new GetObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME!,
        Key: storageKey,
        ResponseContentDisposition: `attachment; filename="${title}"`,
        ResponseContentType: String(data.mimeType || "application/octet-stream"),
      }), { expiresIn: 5 * 60 });
      if (mode === "url") return NextResponse.json({ url: signedUrl, fileName: title });
      return NextResponse.redirect(signedUrl);
    }
    const url = String(data.url || data.videoUrl || data.pdfUrl || "");
    if (!url) return NextResponse.json({ error: "File URL is missing" }, { status: 404 });
    if (mode === "url") return NextResponse.json({ url, fileName: title });
    const response = await fetch(url);
    if (!response.ok || !response.body) return NextResponse.json({ error: "Stored file could not be downloaded" }, { status: 502 });

    return new NextResponse(response.body, {
      status: 200,
      headers: {
        "Content-Type": response.headers.get("content-type") || String(data.mimeType || "application/octet-stream"),
        ...(response.headers.get("content-length") ? { "Content-Length": response.headers.get("content-length")! } : {}),
        "Content-Disposition": `attachment; filename="${title}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("Admin course file download error:", error);
    return NextResponse.json({ error: "Unable to download file" }, { status: 500 });
  }
}
