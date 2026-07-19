export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { Readable } from "node:stream";
import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { deleteR2Objects, putR2Object, safeR2Segment } from "@/lib/r2";
import { isAdminRequest } from "@/lib/server-auth";

const MAX_FILE_BYTES = 5 * 1024 * 1024 * 1024;
const MAX_RESOLVED_FILES = 500;
const DRIVE_API = "https://www.googleapis.com/drive/v3/files";
const DRIVE_FOLDER_MIME = "application/vnd.google-apps.folder";

type PickerFile = {
  id?: string;
  name?: string;
  mimeType?: string;
  size?: string;
  folderPath?: string;
  parentFolder?: string;
  folderSegments?: string[];
  folderIds?: string[];
  rootFolderId?: string;
  createdTime?: string;
};

type DriveFile = {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  trashed?: boolean;
  parents?: string[];
  createdTime?: string;
};

type ResolvedDriveFile = Omit<PickerFile, "id" | "name" | "mimeType"> & {
  id: string;
  name: string;
  mimeType: string;
};

type FolderRecord = {
  id: string;
  courseId: string;
  name: string;
  order: number;
  parentFolderId?: string;
  parentId?: string | null;
  path?: string;
  depth?: number;
};

function extensionFor(name: string, mimeType: string) {
  const existing = name.match(/\.([a-z0-9]{1,8})$/i)?.[1];
  if (existing) return existing.toLowerCase();
  if (mimeType === "application/pdf") return "pdf";
  if (mimeType.startsWith("video/")) return mimeType.slice("video/".length).replace(/[^a-z0-9]/gi, "") || "mp4";
  if (mimeType.startsWith("image/")) return mimeType.slice("image/".length).replace(/[^a-z0-9]/gi, "") || "img";
  return "bin";
}

function isFolder(file: PickerFile | DriveFile) {
  return file.mimeType === DRIVE_FOLDER_MIME;
}

function isSupportedFile(file: PickerFile | DriveFile) {
  const mimeType = file.mimeType || "";
  if (mimeType === "application/pdf" || mimeType.startsWith("video/") || mimeType.startsWith("image/")) return true;
  const extension = (file.name || "").match(/\.([a-z0-9]{1,8})$/i)?.[1]?.toLowerCase();
  return Boolean(extension && ["pdf", "mp4", "mkv", "mov", "avi", "webm", "jpeg", "jpg", "png", "webp"].includes(extension));
}

function itemTypeFor(mimeType: string, name: string) {
  if (mimeType === "application/pdf" || extensionFor(name, mimeType) === "pdf") return "pdf" as const;
  if (mimeType.startsWith("image/") || ["jpeg", "jpg", "png", "webp"].includes(extensionFor(name, mimeType))) return "image" as const;
  return "video" as const;
}

function escapeDriveQueryValue(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

async function driveFetch(url: string, accessToken: string, init?: RequestInit) {
  let lastError = "Google Drive request failed";
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(url, {
        ...init,
        headers: { ...(init?.headers || {}), Authorization: `Bearer ${accessToken}` },
        signal: init?.signal || AbortSignal.timeout(15 * 60 * 1000),
      });
      if (response.ok) return response;
      if (response.status === 401 || response.status === 403) throw new Error("Google Drive permission denied. Re-authorize Drive access and try again.");
      if (response.status === 404) throw new Error("The selected Google Drive file or folder no longer exists.");
      lastError = `Google Drive returned HTTP ${response.status}`;
    } catch (error) {
      if (error instanceof Error && error.message.includes("permission denied")) throw error;
      lastError = error instanceof Error ? error.message : lastError;
    }
    await new Promise((resolve) => setTimeout(resolve, 500 * 2 ** attempt));
  }
  throw new Error(lastError);
}

async function listFolderChildren(folderId: string, accessToken: string) {
  const files: DriveFile[] = [];
  let pageToken = "";
  do {
    const params = new URLSearchParams({
      q: `'${escapeDriveQueryValue(folderId)}' in parents and trashed = false`,
      fields: "nextPageToken,files(id,name,mimeType,size,trashed,parents,createdTime)",
      pageSize: "1000",
      orderBy: "name_natural",
    });
    if (pageToken) params.set("pageToken", pageToken);
    const response = await driveFetch(`${DRIVE_API}?${params.toString()}`, accessToken);
    const data = await response.json() as { files?: DriveFile[]; nextPageToken?: string };
    files.push(...(data.files || []));
    pageToken = data.nextPageToken || "";
  } while (pageToken);
  return files;
}

async function getDriveFolderPath(parentIds: string[] | undefined, accessToken: string) {
  const segments: string[] = [];
  const visited = new Set<string>();
  let parentId = parentIds?.[0] || "";

  while (parentId && parentId !== "root" && !visited.has(parentId)) {
    visited.add(parentId);
    const response = await driveFetch(`${DRIVE_API}/${encodeURIComponent(parentId)}?fields=id,name,mimeType,parents,trashed`, accessToken);
    const folder = await response.json() as DriveFile;
    if (folder.trashed) break;
    if (isFolder(folder) && folder.name) segments.unshift(folder.name);
    parentId = folder.parents?.[0] || "";
  }

  return segments;
}

async function resolveSelectedFiles(selected: PickerFile[], accessToken: string) {
  const resolved = new Map<string, ResolvedDriveFile>();
  const visitedFolders = new Set<string>();

  const visit = async (file: PickerFile | DriveFile, folderSegments: string[] = [], folderIds: string[] = [], rootFolderId?: string) => {
    if (!file.id) return;
    if (isFolder(file)) {
      if (visitedFolders.has(file.id)) return;
      visitedFolders.add(file.id);
      const nextFolderSegments = file.name ? [...folderSegments, file.name] : folderSegments;
      const nextFolderIds = [...folderIds, file.id];
      for (const child of await listFolderChildren(file.id, accessToken)) {
        if (resolved.size >= MAX_RESOLVED_FILES) throw new Error(`Select up to ${MAX_RESOLVED_FILES} Drive files at a time.`);
        await visit(child, nextFolderSegments, nextFolderIds, rootFolderId || file.id);
      }
      return;
    }
    if (!isSupportedFile(file)) return;

    const name = file.name || "Imported file";
    const path = folderSegments.join("/");
    resolved.set(file.id, {
      id: file.id,
      name,
      mimeType: file.mimeType || "application/octet-stream",
      ...(file.size ? { size: file.size } : {}),
      ...(path ? { folderPath: path, parentFolder: folderSegments[folderSegments.length - 1], folderSegments } : {}),
      ...(folderIds.length ? { folderIds, rootFolderId: rootFolderId || folderIds[0] } : {}),
      ...(file.createdTime ? { createdTime: file.createdTime } : {}),
    });
  };

  for (const file of selected) await visit(file);
  return [...resolved.values()];
}

function folderMapKey(parentFolderId: string, name: string) {
  return `${parentFolderId}::${name.trim().toLowerCase()}`;
}

function folderPathFor(folderId: string, folders: Map<string, FolderRecord>) {
  const segments: string[] = [];
  const visited = new Set<string>();
  let currentId = folderId;
  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);
    const folder = folders.get(currentId);
    if (!folder) break;
    segments.unshift(folder.name);
    currentId = folder.parentFolderId || folder.parentId || "";
  }
  return segments;
}

async function ensureFolderHierarchy({
  courseId,
  destinationFolderId,
  folderSegments,
  folderIds,
  folders,
  foldersByKey,
}: {
  courseId: string;
  destinationFolderId: string;
  folderSegments: string[];
  folderIds?: string[];
  folders: Map<string, FolderRecord>;
  foldersByKey: Map<string, FolderRecord>;
}) {
  let parentFolderId = destinationFolderId;
  const destinationPath = folderPathFor(destinationFolderId, folders);

  for (let index = 0; index < folderSegments.length; index += 1) {
    const name = folderSegments[index].trim();
    if (!name) continue;
    const key = folderMapKey(parentFolderId, name);
    let folder = foldersByKey.get(key);
    if (!folder) {
      const siblings = [...folders.values()].filter((candidate) => (candidate.parentFolderId || candidate.parentId || "") === parentFolderId);
      const now = new Date().toISOString();
      const ref = adminDb.collection("courseFolders").doc();
      const data: FolderRecord = {
        id: ref.id,
        courseId,
        name,
        order: siblings.length,
        parentId: parentFolderId,
        parentFolderId,
        path: [...destinationPath, ...folderSegments.slice(0, index + 1)].join("/"),
        depth: destinationPath.length + index,
      };
      await ref.set({
        ...data,
        createdAt: now,
        updatedAt: now,
        source: "google-drive",
        ...(folderIds?.[index] ? { sourceDriveFolderId: folderIds[index] } : {}),
      });
      folder = data;
      folders.set(folder.id, folder);
      foldersByKey.set(key, folder);
    }
    parentFolderId = folder.id;
  }

  return parentFolderId;
}

async function verifyFolder(courseId: string, folderId: string) {
  const folder = await adminDb.collection("courseFolders").doc(folderId).get();
  return folder.exists && folder.data()?.courseId === courseId;
}

export async function POST(req: NextRequest) {
  if (!(await isAdminRequest(req))) return NextResponse.json({ error: "Admin authorization required", code: "ADMIN_AUTH_REQUIRED" }, { status: 403 });
  const importedKeys: string[] = [];
  const importedRefs: FirebaseFirestore.DocumentReference[] = [];

  try {
    const body = await req.json() as { action?: string; courseId?: string; folderId?: string; accessToken?: string; files?: PickerFile[] };
    const courseId = body.courseId || "";
    const folderId = body.folderId || "";
    const accessToken = body.accessToken || "";
    const files = Array.isArray(body.files) ? body.files : [];
    if (!courseId || !folderId || !accessToken || files.length === 0) return NextResponse.json({ error: "Course, destination folder, Google access token and selected files are required", code: "IMPORT_INPUT_REQUIRED" }, { status: 400 });
    if (!(await verifyFolder(courseId, folderId))) return NextResponse.json({ error: "Destination folder not found", code: "FOLDER_NOT_FOUND" }, { status: 404 });

    if (body.action === "resolve") {
      const resolved = await resolveSelectedFiles(files, accessToken);
      return NextResponse.json({ success: true, files: resolved, skippedUnsupported: files.length - resolved.length });
    }

    const [existingItems, folderSnapshot] = await Promise.all([
      adminDb.collection("courseItems").where("courseId", "==", courseId).get(),
      adminDb.collection("courseFolders").where("courseId", "==", courseId).get(),
    ]);
    const existingDriveIds = new Set(existingItems.docs.map((doc) => doc.data().sourceDriveFileId).filter(Boolean).map(String));
    const existingStorageKeys = new Set(existingItems.docs.map((doc) => String(doc.data().storageKey || doc.data().r2Key || "")).filter(Boolean));
    const nextOrderByFolder = new Map<string, number>();
    existingItems.docs.forEach((doc) => {
      const itemFolderId = String(doc.data().folderId || "");
      nextOrderByFolder.set(itemFolderId, Math.max(nextOrderByFolder.get(itemFolderId) || 0, Number(doc.data().order || 0) + 1));
    });
    const folders = new Map<string, FolderRecord>();
    const foldersByKey = new Map<string, FolderRecord>();
    folderSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      const parentId = String(data.parentId || data.parentFolderId || "");
      const folder: FolderRecord = {
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

    const importedItems: Array<Record<string, unknown>> = [];
    const skipped: string[] = [];

    for (const selectedFile of files) {
      if (!selectedFile.id || isFolder(selectedFile)) continue;
      if (existingDriveIds.has(selectedFile.id)) {
        skipped.push(selectedFile.name || selectedFile.id);
        continue;
      }

      const metadataResponse = await driveFetch(`${DRIVE_API}/${encodeURIComponent(selectedFile.id)}?fields=id,name,mimeType,size,trashed,parents,createdTime`, accessToken);
      const metadata = await metadataResponse.json() as DriveFile;
      const name = metadata.name || selectedFile.name || "Imported file";
      const mimeType = metadata.mimeType || selectedFile.mimeType || "application/octet-stream";
      const size = metadata.size ? Number(metadata.size) : Number(selectedFile.size || 0) || undefined;
      if (metadata.trashed) throw new Error(`${name} is in the Google Drive trash.`);
      if (!isSupportedFile({ name, mimeType, id: metadata.id })) throw new Error(`${name} has an unsupported file type.`);
      if (size && size > MAX_FILE_BYTES) throw new Error(`${name} is larger than 5 GB.`);

      let folderSegments = Array.isArray(selectedFile.folderSegments) ? selectedFile.folderSegments.filter(Boolean) : [];
      let folderIds = Array.isArray(selectedFile.folderIds) ? selectedFile.folderIds.filter(Boolean) : [];
      if (!folderSegments.length) {
        folderSegments = await getDriveFolderPath(metadata.parents, accessToken);
        folderIds = [];
      }
      const itemFolderId = await ensureFolderHierarchy({ courseId, destinationFolderId: folderId, folderSegments, folderIds, folders, foldersByKey });
      const folderPath = folderSegments.join("/");
      const parentFolder = folderSegments[folderSegments.length - 1] || "";
      const type = itemTypeFor(mimeType, name);

      const downloadResponse = await driveFetch(`${DRIVE_API}/${encodeURIComponent(selectedFile.id)}?alt=media`, accessToken);
      if (!downloadResponse.body) throw new Error(`Google Drive returned no file stream for ${name}.`);
      const contentLength = Number(downloadResponse.headers.get("content-length") || size || 0) || undefined;
      const extension = extensionFor(name, mimeType);
      const keyParts = ["courses", safeR2Segment(courseId), ...folderSegments.map(safeR2Segment)];
      const safeName = safeR2Segment(name.replace(/\.[^.]+$/, ""));
      let key = [...keyParts, `${safeName}.${extension}`].join("/");
      if (existingStorageKeys.has(key)) key = [...keyParts, `${safeName}-${randomUUID()}.${extension}`].join("/");

      const uploaded = await putR2Object({
        key,
        body: Readable.fromWeb(downloadResponse.body as Parameters<typeof Readable.fromWeb>[0]),
        contentType: mimeType,
        contentLength,
      });
      importedKeys.push(uploaded.key);
      existingStorageKeys.add(uploaded.key);

      const now = new Date().toISOString();
      const itemData = {
        courseId,
        folderId: itemFolderId,
        type,
        title: name,
        name,
        url: uploaded.url,
        ...(type === "video" ? { videoUrl: uploaded.url } : type === "pdf" ? { pdfUrl: uploaded.url } : { imageUrl: uploaded.url }),
        thumbnail: "",
        duration: 0,
        size: contentLength || size || 0,
        order: nextOrderByFolder.get(itemFolderId) || 0,
        createdAt: now,
        updatedAt: now,
        storageKey: uploaded.key,
        r2Key: uploaded.key,
        r2Url: uploaded.url,
        mimeType,
        folderPath,
        parentFolder,
        source: "google-drive",
        sourceDriveFileId: selectedFile.id,
        ...(metadata.createdTime || selectedFile.createdTime ? { driveCreatedAt: metadata.createdTime || selectedFile.createdTime } : {}),
      };
      nextOrderByFolder.set(itemFolderId, (nextOrderByFolder.get(itemFolderId) || 0) + 1);
      const ref = adminDb.collection("courseItems").doc();
      await ref.set(itemData);
      importedRefs.push(ref);
      existingDriveIds.add(selectedFile.id);
      importedItems.push({ id: ref.id, ...itemData });
    }

    return NextResponse.json({ success: true, items: importedItems, skipped });
  } catch (error) {
    console.error("Google Drive import error:", error);
    if (importedRefs.length) {
      try {
        const batch = adminDb.batch();
        importedRefs.forEach((ref) => batch.delete(ref));
        await batch.commit();
      } catch (cleanupError) {
        console.error("Google Drive Firestore cleanup error:", cleanupError);
      }
    }
    if (importedKeys.length) await deleteR2Objects(importedKeys).catch((cleanupError) => console.error("Google Drive R2 cleanup error:", cleanupError));
    const message = error instanceof Error ? error.message : "Google Drive import failed";
    const status = message.includes("permission denied") ? 403 : 500;
    return NextResponse.json({ error: message, code: status === 403 ? "GOOGLE_DRIVE_PERMISSION_DENIED" : "GOOGLE_DRIVE_IMPORT_FAILED", retryable: status >= 500 }, { status });
  }
}
