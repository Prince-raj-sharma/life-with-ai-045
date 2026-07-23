export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

import { NextRequest, NextResponse } from "next/server";
import { ensureFolderHierarchy, folderMapKey, type CourseFolderRecord } from "@/lib/course-folder-hierarchy";
import { adminDb } from "@/lib/firebase-admin";
import { deleteR2Objects, safeR2Segment } from "@/lib/r2";
import { isAdminRequest } from "@/lib/server-auth";

const MAX_FILE_BYTES = 5 * 1024 * 1024 * 1024;

type LocalFolderFile = {
  name: string;
  mimeType: string;
  size: number;
  folderSegments: string[];
};

type LocalFolderImportBody = {
  courseId?: unknown;
  folderId?: unknown;
  folderSegments?: unknown;
  fileName?: unknown;
  contentType?: unknown;
  size?: unknown;
  storageKey?: unknown;
  url?: unknown;
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

async function verifyFolder(courseId: string, folderId: string) {
  const folder = await adminDb.collection("courseFolders").doc(folderId).get();
  return folder.exists && folder.data()?.courseId === courseId;
}

async function prepareImport(courseId: string, destinationFolderId: string, file: LocalFolderFile) {
  const [existingItems, folderSnapshot] = await Promise.all([
    adminDb.collection("courseItems").where("courseId", "==", courseId).get(),
    adminDb.collection("courseFolders").where("courseId", "==", courseId).get(),
  ]);
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

  return {
    itemFolderId,
    folderPath,
    parentFolder: file.folderSegments[file.folderSegments.length - 1] || "",
    type: itemTypeFor(file.mimeType, file.name),
    mimeType: file.mimeType,
    order: nextOrderByFolder.get(itemFolderId) || 0,
  };
}

function isHiddenMacFile(name: string) {
  return name === ".DS_Store" || name.startsWith("._");
}

function folderSegmentsFromBody(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((segment): segment is string => typeof segment === "string")
    .map((segment) => segment.trim())
    .filter(Boolean);
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function numberValue(value: unknown) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isSafeInteger(number) && number >= 0 ? number : 0;
}

function expectedR2Prefix(courseId: string, folderSegments: string[]) {
  return ["courses", safeR2Segment(courseId), ...folderSegments.map(safeR2Segment)].join("/");
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
    if (!req.body) throw Object.assign(new Error("Import metadata is required."), { status: 400, code: "IMPORT_INPUT_REQUIRED" });
    let body: LocalFolderImportBody;
    try {
      body = await req.json() as LocalFolderImportBody;
    } catch {
      throw Object.assign(new Error("Import metadata must be valid JSON."), { status: 400, code: "INVALID_JSON" });
    }

    const courseId = stringValue(body.courseId);
    const destinationFolderId = stringValue(body.folderId);
    const name = stringValue(body.fileName).replace(/[\\/\r\n]+/g, "-") || "upload.bin";
    const mimeType = stringValue(body.contentType) || fallbackMimeType(name);
    const size = numberValue(body.size);
    const folderSegments = folderSegmentsFromBody(body.folderSegments);
    const storageKey = stringValue(body.storageKey);
    const url = stringValue(body.url);

    if (!courseId || !destinationFolderId || !storageKey || !url) {
      throw Object.assign(new Error("Course, destination folder and uploaded R2 metadata are required."), { status: 400, code: "IMPORT_INPUT_REQUIRED" });
    }
    if (isHiddenMacFile(name)) return NextResponse.json({ success: true, skipped: true, items: [] });
    if (!size || size > MAX_FILE_BYTES) throw Object.assign(new Error("Files must be 5 GB or smaller."), { status: 413, code: "FILE_TOO_LARGE" });
    if (!isSupportedFile(name, mimeType)) throw Object.assign(new Error(`${name} has an unsupported file type.`), { status: 400, code: "UNSUPPORTED_FILE_TYPE" });
    if (!storageKey.startsWith(`${expectedR2Prefix(courseId, folderSegments)}/`)) {
      throw Object.assign(new Error("Uploaded file does not match the selected course folder."), { status: 400, code: "INVALID_STORAGE_KEY" });
    }
    if (!(await verifyFolder(courseId, destinationFolderId))) throw Object.assign(new Error("Destination folder not found"), { status: 404, code: "FOLDER_NOT_FOUND" });

    importedKey = storageKey;
    const file: LocalFolderFile = { name, mimeType, size, folderSegments };
    const prepared = await prepareImport(courseId, destinationFolderId, file);
    const now = new Date().toISOString();
    const itemData = {
      courseId,
      folderId: prepared.itemFolderId,
      type: prepared.type,
      title: file.name,
      name: file.name,
      url,
      ...(prepared.type === "video" ? { videoUrl: url } : prepared.type === "pdf" ? { pdfUrl: url } : { imageUrl: url }),
      thumbnail: "",
      duration: 0,
      size,
      order: prepared.order,
      createdAt: now,
      updatedAt: now,
      storageKey,
      r2Key: storageKey,
      r2Url: url,
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
    const code = error && typeof error === "object" && "code" in error ? String(error.code) : "LOCAL_FOLDER_IMPORT_FAILED";
    return NextResponse.json({ error: result.message, code, retryable: status >= 500 }, { status });
  }
}
