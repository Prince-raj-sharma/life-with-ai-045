export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

import { randomUUID } from "node:crypto";
import { Readable } from "node:stream";
import busboy from "busboy";
import { NextRequest, NextResponse } from "next/server";
import { ensureFolderHierarchy, folderMapKey, type CourseFolderRecord } from "@/lib/course-folder-hierarchy";
import { adminDb } from "@/lib/firebase-admin";
import { deleteR2Objects, putR2Object, safeR2Segment } from "@/lib/r2";
import { isAdminRequest } from "@/lib/server-auth";

const MAX_FILE_BYTES = 5 * 1024 * 1024 * 1024;
const MAX_MULTIPART_OVERHEAD = 2 * 1024 * 1024;

type LocalFolderFile = {
  name: string;
  mimeType: string;
  size: number;
  folderSegments: string[];
};

function extensionFor(name: string, mimeType: string) {
  const existing = name.match(/\.([a-z0-9]{1,8})$/i)?.[1];
  if (existing) return existing.toLowerCase();
  if (mimeType === "application/pdf") return "pdf";
  if (mimeType.startsWith("video/")) return mimeType.slice("video/".length).replace(/[^a-z0-9]/gi, "") || "mp4";
  if (mimeType.startsWith("image/")) return mimeType.slice("image/".length).replace(/[^a-z0-9]/gi, "") || "img";
  return "bin";
}

function isSupportedFile(name: string, mimeType: string) {
  if (mimeType === "application/pdf" || mimeType.startsWith("video/") || mimeType.startsWith("image/")) return true;
  const extension = name.match(/\.([a-z0-9]{1,8})$/i)?.[1]?.toLowerCase();
  return Boolean(extension && ["pdf", "mp4", "mkv", "mov", "avi", "webm", "jpeg", "jpg", "png", "webp"].includes(extension));
}

function itemTypeFor(mimeType: string, name: string) {
  if (mimeType === "application/pdf" || extensionFor(name, mimeType) === "pdf") return "pdf" as const;
  if (mimeType.startsWith("image/") || ["jpeg", "jpg", "png", "webp"].includes(extensionFor(name, mimeType))) return "image" as const;
  return "video" as const;
}

function fallbackMimeType(name: string) {
  const extension = extensionFor(name, "");
  if (extension === "pdf") return "application/pdf";
  if (["jpeg", "jpg", "png", "webp"].includes(extension)) return `image/${extension === "jpg" ? "jpeg" : extension}`;
  if (["mp4", "mkv", "mov", "avi", "webm"].includes(extension)) return `video/${extension}`;
  return "application/octet-stream";
}

function parseFolderSegments(value: string | undefined) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((segment): segment is string => typeof segment === "string").map((segment) => segment.trim()).filter(Boolean);
  } catch {
    return [];
  }
}

function requestHeaders(req: NextRequest) {
  return Object.fromEntries(req.headers.entries());
}

async function verifyFolder(courseId: string, folderId: string) {
  const folder = await adminDb.collection("courseFolders").doc(folderId).get();
  return folder.exists && folder.data()?.courseId === courseId;
}

async function prepareImport(courseId: string, destinationFolderId: string, file: LocalFolderFile) {
  const [existingItems, folderSnapshot] = await Promise.all([
    adminDb.collection("courseItems").where("courseId", "==", courseId).get(),
    adminDb.collection("courseFolders").where("courseId", "==", courseId).get(),
  ]);
  const existingStorageKeys = new Set(existingItems.docs.map((doc) => String(doc.data().storageKey || doc.data().r2Key || "")).filter(Boolean));
  const nextOrderByFolder = new Map<string, number>();
  existingItems.docs.forEach((doc) => {
    const itemFolderId = String(doc.data().folderId || "");
    nextOrderByFolder.set(itemFolderId, Math.max(nextOrderByFolder.get(itemFolderId) || 0, Number(doc.data().order || 0) + 1));
  });

  const folders = new Map<string, CourseFolderRecord>();
  const foldersByKey = new Map<string, CourseFolderRecord>();
  folderSnapshot.docs.forEach((doc) => {
    const data = doc.data();
    const parentId = String(data.parentId || data.parentFolderId || "");
    const folder: CourseFolderRecord = {
      id: doc.id,
      courseId,
      name: String(data.name || "Untitled folder"),
      order: Number(data.order || 0),
      ...(parentId ? { parentFolderId: parentId, parentId } : { parentId: null }),
      ...(data.path ? { path: String(data.path) } : {}),
      depth: Number(data.depth || 0),
    };
    folders.set(folder.id, folder);
    foldersByKey.set(folderMapKey(folder.parentFolderId || folder.parentId || "", folder.name), folder);
  });

  const itemFolderId = await ensureFolderHierarchy({
    courseId,
    destinationFolderId,
    folderSegments: file.folderSegments,
    folders,
    foldersByKey,
    source: "manual",
  });
  const folderPath = file.folderSegments.join("/");
  const keyParts = ["courses", safeR2Segment(courseId), ...file.folderSegments.map(safeR2Segment)];
  const safeName = safeR2Segment(file.name.replace(/\.[^.]+$/, ""));
  const extension = extensionFor(file.name, file.mimeType);
  let key = [...keyParts, `${safeName}.${extension}`].join("/");
  if (existingStorageKeys.has(key)) key = [...keyParts, `${safeName}-${randomUUID()}.${extension}`].join("/");

  return {
    itemFolderId,
    folderPath,
    parentFolder: file.folderSegments[file.folderSegments.length - 1] || "",
    type: itemTypeFor(file.mimeType, file.name),
    mimeType: file.mimeType,
    key,
    order: nextOrderByFolder.get(itemFolderId) || 0,
  };
}

function storageError(error: unknown) {
  const name = error && typeof error === "object" && "name" in error ? String(error.name) : "";
  if (name === "NoSuchBucket") return { status: 502, message: "The configured R2 bucket was not found." };
  if (name === "InvalidAccessKeyId" || name === "SignatureDoesNotMatch" || name === "AccessDenied") return { status: 502, message: "Cloudflare R2 rejected the storage credentials." };
  return { status: 500, message: error instanceof Error ? error.message : "Local folder import failed" };
}

export async function POST(req: NextRequest) {
  if (!(await isAdminRequest(req))) return NextResponse.json({ error: "Admin authorization required", code: "ADMIN_AUTH_REQUIRED" }, { status: 403 });

  let importedKey = "";
  let importedRef: FirebaseFirestore.DocumentReference | null = null;
  try {
    if (!req.body) return NextResponse.json({ error: "Upload request body is empty." }, { status: 400 });
    const contentLength = Number(req.headers.get("content-length") || 0);
    if (contentLength > MAX_FILE_BYTES + MAX_MULTIPART_OVERHEAD) return NextResponse.json({ error: "Files must be 5 GB or smaller.", code: "FILE_TOO_LARGE" }, { status: 413 });
    const contentType = req.headers.get("content-type") || "";
    if (!contentType.toLowerCase().startsWith("multipart/form-data")) return NextResponse.json({ error: "Upload requests must use multipart/form-data.", code: "MULTIPART_REQUIRED" }, { status: 415 });

    const incoming = Readable.fromWeb(req.body as Parameters<typeof Readable.fromWeb>[0]);
    const parser = busboy({
      headers: requestHeaders(req),
      limits: { files: 1, fields: 8, fieldSize: 4096, fileSize: MAX_FILE_BYTES, parts: 12 },
    });
    const fields = new Map<string, string>();
    let fileSeen = false;
    let uploadedSize = 0;
    type LocalImportResult = { file: LocalFolderFile; prepared: Awaited<ReturnType<typeof prepareImport>>; uploaded: { key: string; url: string } };
    let fileProcessing: Promise<LocalImportResult> | null = null;
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
      incoming.destroy(error instanceof Error ? error : new Error("Local folder import failed"));
    };

    parser.on("field", (name, value) => fields.set(name, value));
    parser.on("file", (fieldName, file, info) => {
      if (fieldName !== "file" || fileSeen) {
        file.resume();
        fail(new Error("Exactly one file field named file is required."));
        return;
      }
      fileSeen = true;
      file.pause();
      const name = String(info.filename || fields.get("fileName") || "upload.bin").replace(/[\\/\r\n]+/g, "-").trim() || "upload.bin";
      const mimeType = String(fields.get("contentType") || info.mimeType || fallbackMimeType(name));
      const folderSegments = parseFolderSegments(fields.get("folderSegments"));
      const courseId = fields.get("courseId") || "";
      const destinationFolderId = fields.get("folderId") || "";
      if (!courseId || !destinationFolderId || !isSupportedFile(name, mimeType)) {
        file.resume();
        fail(!courseId || !destinationFolderId ? new Error("Course and destination folder are required") : new Error(`${name} has an unsupported file type.`));
        return;
      }

      file.on("data", (chunk: Buffer) => { uploadedSize += chunk.length; });
      file.on("limit", () => fail(Object.assign(new Error("Files must be 5 GB or smaller."), { status: 413, code: "FILE_TOO_LARGE" })));
      file.on("error", fail);
      fileProcessing = (async () => {
        const localFile = { name, mimeType, size: 0, folderSegments };
        if (!(await verifyFolder(courseId, destinationFolderId))) throw new Error("Destination folder not found");
        const prepared = await prepareImport(courseId, destinationFolderId, localFile);
        const uploadPromise = putR2Object({ key: prepared.key, body: file, contentType: mimeType });
        file.resume();
        const uploaded = await uploadPromise;
        importedKey = uploaded.key;
        return { file: localFile, prepared, uploaded };
      })();
      fileProcessing.catch(fail);
    });
    parser.on("filesLimit", () => fail(new Error("Only one file can be uploaded at a time.")));
    parser.on("partsLimit", () => fail(new Error("Upload form contains too many parts.")));
    parser.on("error", fail);
    parser.on("finish", () => { if (!failed) resolveParser(); });
    incoming.on("error", fail);
    req.signal.addEventListener("abort", () => fail(Object.assign(new Error("Upload cancelled by the client."), { code: "UPLOAD_CANCELLED" })), { once: true });
    incoming.pipe(parser);

    await parserFinished;
    const processing = fileProcessing as Promise<LocalImportResult> | null;
    const imported = processing ? await processing : null;
    if (!imported || !fileSeen) throw new Error("A file field named file is required.");
    const courseId = fields.get("courseId") || "";

    const { file, prepared, uploaded } = imported;
    const now = new Date().toISOString();
    const itemData = {
      courseId,
      folderId: prepared.itemFolderId,
      type: prepared.type,
      title: file.name,
      name: file.name,
      url: uploaded.url,
      ...(prepared.type === "video" ? { videoUrl: uploaded.url } : prepared.type === "pdf" ? { pdfUrl: uploaded.url } : { imageUrl: uploaded.url }),
      thumbnail: "",
      duration: 0,
      size: uploadedSize,
      order: prepared.order,
      createdAt: now,
      updatedAt: now,
      storageKey: uploaded.key,
      r2Key: uploaded.key,
      r2Url: uploaded.url,
      mimeType: file.mimeType,
      folderPath: prepared.folderPath,
      parentFolder: prepared.parentFolder,
      source: "r2",
    };
    const ref = adminDb.collection("courseItems").doc();
    await ref.set(itemData);
    importedRef = ref;
    return NextResponse.json({ success: true, items: [{ id: ref.id, ...itemData }] });
  } catch (error) {
    console.error("Local folder import error:", error);
    if (importedRef) await importedRef.delete().catch((cleanupError) => console.error("Local folder Firestore cleanup error:", cleanupError));
    if (importedKey) await deleteR2Objects([importedKey]).catch((cleanupError) => console.error("Local folder R2 cleanup error:", cleanupError));
    const result = storageError(error);
    const status = error && typeof error === "object" && "status" in error ? Number(error.status) : result.status;
    return NextResponse.json({ error: result.message, code: "LOCAL_FOLDER_IMPORT_FAILED", retryable: status >= 500 }, { status });
  }
}
