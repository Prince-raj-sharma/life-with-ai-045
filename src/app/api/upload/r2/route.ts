export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

import { randomUUID } from "node:crypto";
import { Readable } from "node:stream";
import busboy from "busboy";
import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/server-auth";
import { assertR2Config, safeR2Segment, startR2StreamUpload } from "@/lib/r2";

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024 * 1024;
const MAX_MULTIPART_OVERHEAD = 2 * 1024 * 1024;

type UploadResult = {
  key: string;
  url: string;
  name: string;
  contentType: string;
  size: number;
};

function createObjectKey(folder: string, fileName: string) {
  const extension = fileName.split(".").pop()?.toLowerCase() || "bin";
  const baseName = safeR2Segment(fileName.replace(/\.[^.]+$/, ""));
  return `${safeR2Segment(folder)}/${randomUUID()}-${baseName}.${safeR2Segment(extension)}`;
}

function storageError(error: unknown) {
  const name = error && typeof error === "object" && "name" in error ? String(error.name) : "";
  if (name === "NoSuchBucket") return { status: 502, code: "R2_BUCKET_NOT_FOUND", message: "The configured R2 bucket was not found." };
  if (name === "InvalidAccessKeyId" || name === "SignatureDoesNotMatch" || name === "AccessDenied") {
    return { status: 502, code: "R2_AUTHENTICATION_FAILED", message: "Cloudflare R2 rejected the storage credentials." };
  }
  if (error instanceof Error && error.message.includes("not configured")) {
    return { status: 503, code: "R2_NOT_CONFIGURED", message: error.message };
  }
  return { status: 500, code: "R2_UPLOAD_FAILED", message: error instanceof Error ? error.message : "Cloudflare R2 upload failed." };
}

function jsonError(error: unknown) {
  const result = storageError(error);
  return NextResponse.json({ error: result.message, code: result.code, retryable: result.status >= 500 }, { status: result.status });
}

function requestHeaders(req: NextRequest) {
  return Object.fromEntries(req.headers.entries());
}

async function uploadMultipart(req: NextRequest): Promise<UploadResult> {
  if (!req.body) throw new Error("Upload request body is empty.");

  const contentLength = Number(req.headers.get("content-length") || 0);
  if (contentLength > MAX_UPLOAD_BYTES + MAX_MULTIPART_OVERHEAD) {
    throw Object.assign(new Error("Files must be 5 GB or smaller."), { code: "FILE_TOO_LARGE", status: 413 });
  }

  const contentType = req.headers.get("content-type") || "";
  if (!contentType.toLowerCase().startsWith("multipart/form-data")) {
    throw Object.assign(new Error("Upload requests must use multipart/form-data."), { code: "MULTIPART_REQUIRED", status: 415 });
  }

  const incoming = Readable.fromWeb(req.body as Parameters<typeof Readable.fromWeb>[0]);
  const parser = busboy({
    headers: requestHeaders(req),
    limits: { files: 1, fields: 8, fieldSize: 4096, fileSize: MAX_UPLOAD_BYTES, parts: 12 },
  });
  const fields = new Map<string, string>();
  let fileSeen = false;
  let uploadedSize = 0;
  let uploadedName = "";
  let uploadedContentType = "";
  let uploadPromise: Promise<{ key: string; url: string }> | null = null;
  let activeUpload: ReturnType<typeof startR2StreamUpload> | null = null;
  let failed = false;

  let resolveParser!: () => void;
  let rejectParser!: (error: unknown) => void;
  const parserFinished = new Promise<void>((resolve, reject) => {
    resolveParser = resolve;
    rejectParser = reject;
  });

  const fail = (error: unknown) => {
    if (failed) return;
    failed = true;
    rejectParser(error);
    parser.destroy();
    incoming.destroy(error instanceof Error ? error : new Error("Upload stream failed"));
    if (activeUpload) void activeUpload.upload.abort().catch(() => undefined);
  };

  parser.on("field", (name, value) => {
    fields.set(name, value);
  });

  parser.on("file", (fieldName, file, info) => {
    if (fieldName !== "file" || fileSeen) {
      file.resume();
      fail(new Error("Exactly one file field named file is required."));
      return;
    }

    fileSeen = true;
    const name = String(info.filename || "upload.bin").replace(/[\\/\r\n]+/g, "-").trim() || "upload.bin";
    const type = String(info.mimeType || fields.get("contentType") || "application/octet-stream");
    uploadedName = name;
    uploadedContentType = type;
    const folder = fields.get("folder") || req.nextUrl.searchParams.get("folder") || "uploads";
    const key = createObjectKey(folder, name);
    file.on("data", (chunk: Buffer) => {
      uploadedSize += chunk.length;
    });
    file.on("limit", () => {
      fail(Object.assign(new Error("Files must be 5 GB or smaller."), { code: "FILE_TOO_LARGE", status: 413 }));
    });
    file.on("error", fail);

    try {
      activeUpload = startR2StreamUpload({
        key,
        body: file,
        contentType: type,
        metadata: { originalname: safeR2Segment(name).slice(0, 200) },
      });
      uploadPromise = activeUpload.done;
      uploadPromise.catch(fail);
    } catch (error) {
      fail(error);
    }
  });

  parser.on("filesLimit", () => fail(new Error("Only one file can be uploaded at a time.")));
  parser.on("partsLimit", () => fail(new Error("Upload form contains too many parts.")));
  parser.on("error", fail);
  parser.on("finish", () => {
    if (!failed) resolveParser();
  });
  incoming.on("error", fail);
  req.signal.addEventListener("abort", () => {
    fail(Object.assign(new Error("Upload cancelled by the client."), { code: "UPLOAD_CANCELLED" }));
  }, { once: true });
  incoming.pipe(parser);

  await parserFinished;
  if (!fileSeen || !uploadPromise || !activeUpload) throw new Error("A file field named file is required.");
  const uploaded = await (uploadPromise as Promise<{ key: string; url: string }>);
  return { key: uploaded.key, url: uploaded.url, name: uploadedName, contentType: uploadedContentType, size: uploadedSize };
}

export async function POST(req: NextRequest) {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "Admin authorization required", code: "ADMIN_AUTH_REQUIRED" }, { status: 403 });
  }

  try {
    assertR2Config();
    const result = await uploadMultipart(req);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("Server-side R2 upload error:", error);
    const customStatus = error && typeof error === "object" && "status" in error ? Number(error.status) : 0;
    const customCode = error && typeof error === "object" && "code" in error ? String(error.code) : "";
    if (customStatus) {
      return NextResponse.json({ error: error instanceof Error ? error.message : "Upload failed", code: customCode || "UPLOAD_FAILED", retryable: customStatus >= 500 }, { status: customStatus });
    }
    return jsonError(error);
  }
}
