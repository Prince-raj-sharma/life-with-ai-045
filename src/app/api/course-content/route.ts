export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { deleteR2Objects, getR2PublicUrl, moveR2Object, safeR2Segment } from "@/lib/r2";
import { getAuthenticatedRequestUser, isAdminRequest } from "@/lib/server-auth";
import { CourseFolder, CourseItem, CourseItemType } from "@/types";

type RecordData = Record<string, unknown>;

function asIso(value: unknown) {
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  if (value && typeof value === "object" && "toDate" in value && typeof value.toDate === "function") {
    return (value.toDate() as Date).toISOString();
  }
  return new Date().toISOString();
}

function asNumber(value: unknown, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function getParentId(data: RecordData) {
  return String(data.parentId || data.parentFolderId || "");
}

function normalizeFolder(id: string, data: RecordData): CourseFolder {
  const parentId = getParentId(data);
  return {
    id,
    courseId: String(data.courseId || ""),
    name: String(data.name || "Untitled folder"),
    order: asNumber(data.order),
    createdAt: asIso(data.createdAt),
    ...(data.updatedAt ? { updatedAt: asIso(data.updatedAt) } : {}),
    parentId: parentId || null,
    ...(parentId ? { parentFolderId: parentId } : {}),
    ...(data.path ? { path: String(data.path) } : {}),
    depth: asNumber(data.depth),
    ...(data.source ? { source: data.source as CourseFolder["source"] } : {}),
    ...(data.sourceDriveFolderId ? { sourceDriveFolderId: String(data.sourceDriveFolderId) } : {}),
  };
}

function normalizeItem(id: string, data: RecordData): CourseItem {
  return {
    id,
    courseId: String(data.courseId || ""),
    folderId: String(data.folderId || ""),
    type: data.type === "image" ? "image" : data.type === "pdf" ? "pdf" : "video",
    title: String(data.title || "Untitled file"),
    ...(data.name ? { name: String(data.name) } : {}),
    ...(data.url ? { url: String(data.url) } : {}),
    ...(data.videoUrl ? { videoUrl: String(data.videoUrl) } : {}),
    ...(data.pdfUrl ? { pdfUrl: String(data.pdfUrl) } : {}),
    ...(data.imageUrl ? { imageUrl: String(data.imageUrl) } : {}),
    duration: asNumber(data.duration),
    ...(data.thumbnail ? { thumbnail: String(data.thumbnail) } : {}),
    order: asNumber(data.order),
    createdAt: asIso(data.createdAt),
    ...(data.updatedAt ? { updatedAt: asIso(data.updatedAt) } : {}),
    ...(data.description ? { description: String(data.description) } : {}),
    ...(data.isFreePreview !== undefined ? { isFreePreview: Boolean(data.isFreePreview) } : {}),
    ...(data.storageKey ? { storageKey: String(data.storageKey) } : {}),
    ...(data.thumbnailStorageKey ? { thumbnailStorageKey: String(data.thumbnailStorageKey) } : {}),
    ...(data.mimeType ? { mimeType: String(data.mimeType) } : {}),
    ...(data.size !== undefined ? { size: asNumber(data.size) } : {}),
    ...(data.source ? { source: data.source as CourseItem["source"] } : {}),
    ...(data.sourceDriveFileId ? { sourceDriveFileId: String(data.sourceDriveFileId) } : {}),
    ...(data.folderPath ? { folderPath: String(data.folderPath) } : {}),
    ...(data.parentFolder ? { parentFolder: String(data.parentFolder) } : {}),
    ...(data.r2Key ? { r2Key: String(data.r2Key) } : {}),
    ...(data.r2Url ? { r2Url: String(data.r2Url) } : {}),
    ...(data.driveCreatedAt ? { driveCreatedAt: asIso(data.driveCreatedAt) } : {}),
  };
}

function sanitizeDemoItem(item: CourseItem): Record<string, unknown> {
  const url = item.url || item.videoUrl || item.pdfUrl || item.imageUrl;
  return {
    ...(item.id ? { id: item.id } : {}),
    type: item.type,
    title: item.title,
    ...(url ? { url } : {}),
    ...(item.type === "video" && url ? { videoUrl: url } : {}),
    ...(item.type === "pdf" && url ? { pdfUrl: url } : {}),
    ...(item.type === "image" && url ? { imageUrl: url } : {}),
    isFreePreview: true,
  };
}

async function getCourseContent(courseId: string, includePremium: boolean) {
  const [folderSnapshot, itemSnapshot, legacySnapshot] = await Promise.all([
    adminDb.collection("courseFolders").where("courseId", "==", courseId).get(),
    adminDb.collection("courseItems").where("courseId", "==", courseId).get(),
    adminDb.collection("lessons").where("courseId", "==", courseId).get(),
  ]);

  const folders = folderSnapshot.docs.map((doc) => normalizeFolder(doc.id, doc.data() as RecordData));
  const items = itemSnapshot.docs.map((doc) => normalizeItem(doc.id, doc.data() as RecordData));
  const folderByName = new Map(folders.map((folder) => [folder.name.trim().toLowerCase(), folder]));
  const legacyFolderByName = new Map<string, CourseFolder>();

  const legacyLessons = legacySnapshot.docs
    .map((doc) => ({ id: doc.id, data: doc.data() as RecordData }))
    .sort((a, b) => asNumber(a.data.order) - asNumber(b.data.order));

  for (const lesson of legacyLessons) {
    const name = String(lesson.data.moduleTitle || "Module 1").trim() || "Module 1";
    const normalizedName = name.toLowerCase();
    if (!folderByName.has(normalizedName) && !legacyFolderByName.has(normalizedName)) {
      legacyFolderByName.set(normalizedName, {
        id: `legacy-folder-${lesson.id}`,
        courseId,
        name,
        order: folders.length + legacyFolderByName.size,
        createdAt: asIso(lesson.data.createdAt),
      });
    }
  }

  const allFolders = [...folders, ...legacyFolderByName.values()].sort((a, b) => a.order - b.order);
  const legacyItems: CourseItem[] = [];
  for (const lesson of legacyLessons) {
    const moduleName = String(lesson.data.moduleTitle || "Module 1").trim() || "Module 1";
    const existingFolder = folderByName.get(moduleName.toLowerCase());
    const folder = existingFolder || legacyFolderByName.get(moduleName.toLowerCase());
    const common = {
      courseId,
      folderId: folder?.id || `legacy-folder-${lesson.id}`,
      order: asNumber(lesson.data.order),
      createdAt: asIso(lesson.data.createdAt),
      duration: asNumber(lesson.data.durationMinutes),
      description: String(lesson.data.description || ""),
      isFreePreview: Boolean(lesson.data.isFreePreview),
      source: "legacy" as const,
    };

    if (lesson.data.videoUrl) {
      legacyItems.push({
        id: lesson.id,
        ...common,
        type: "video",
        title: String(lesson.data.title || "Untitled video"),
        url: String(lesson.data.videoUrl),
        videoUrl: String(lesson.data.videoUrl),
      });
    }
    if (lesson.data.pdfUrl) {
      legacyItems.push({
        id: `${lesson.id}-pdf`,
        ...common,
        type: "pdf",
        title: `${String(lesson.data.title || "Lesson")} PDF`,
        url: String(lesson.data.pdfUrl),
        pdfUrl: String(lesson.data.pdfUrl),
      });
    }
  }

  const fullContent = {
    folders: allFolders,
    items: [...items, ...legacyItems].sort((a, b) => {
      const folderA = allFolders.findIndex((folder) => folder.id === a.folderId);
      const folderB = allFolders.findIndex((folder) => folder.id === b.folderId);
      return folderA - folderB || a.order - b.order || a.title.localeCompare(b.title);
    }),
  };

  if (includePremium) return fullContent;
  return { folders: [], items: fullContent.items.filter((item) => item.isFreePreview).map(sanitizeDemoItem) };
}

async function folderBelongsToCourse(folderId: string, courseId: string) {
  const folder = await adminDb.collection("courseFolders").doc(folderId).get();
  return folder.exists && folder.data()?.courseId === courseId;
}

type StoredFolder = { id: string; name: string; parentFolderId?: string; order?: number; path?: string; depth?: number };

async function getStoredFolders(courseId: string) {
  const snapshot = await adminDb.collection("courseFolders").where("courseId", "==", courseId).get();
  return new Map(snapshot.docs.map((doc) => {
    const data = doc.data();
    const parentId = getParentId(data);
    return [doc.id, {
      id: doc.id,
      name: String(data.name || "Untitled folder"),
      ...(parentId ? { parentFolderId: parentId } : {}),
      ...(data.order !== undefined ? { order: asNumber(data.order) } : {}),
      ...(data.path ? { path: String(data.path) } : {}),
      depth: asNumber(data.depth),
    } satisfies StoredFolder];
  }));
}

function getStoredFolderPath(folderId: string, folders: Map<string, StoredFolder>) {
  const path: string[] = [];
  const visited = new Set<string>();
  let currentId = folderId;
  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);
    const folder = folders.get(currentId);
    if (!folder) break;
    path.unshift(folder.name);
    currentId = folder.parentFolderId || "";
  }
  return path;
}

async function updateDescendantFolderPaths(courseId: string, folderId: string) {
  const folders = await getStoredFolders(courseId);
  const root = folders.get(folderId);
  if (!root) return;
  const updates: Array<{ id: string; path: string; depth: number }> = [];
  const walk = (parentId: string, parentPath: string, parentDepth: number) => {
    folders.forEach((folder) => {
      if (folder.parentFolderId !== parentId) return;
      const path = `${parentPath}/${folder.name}`;
      const depth = parentDepth + 1;
      updates.push({ id: folder.id, path, depth });
      walk(folder.id, path, depth);
    });
  };
  const rootPath = getStoredFolderPath(folderId, folders).join("/");
  walk(folderId, rootPath, asNumber(root.depth, Math.max(0, rootPath.split("/").length - 1)));
  for (let index = 0; index < updates.length; index += 400) {
    const batch = adminDb.batch();
    updates.slice(index, index + 400).forEach((update) => batch.update(adminDb.collection("courseFolders").doc(update.id), { path: update.path, depth: update.depth, updatedAt: new Date().toISOString() }));
    await batch.commit();
  }
}

function storageFileName(title: string, oldKey?: string) {
  const trimmed = title.trim();
  if (/\.[^.]+$/.test(trimmed)) return safeR2Segment(trimmed);
  const oldExtension = oldKey?.split("/").pop()?.match(/\.([a-z0-9]{1,8})$/i)?.[1];
  return safeR2Segment(oldExtension ? `${trimmed}.${oldExtension}` : trimmed);
}

function storageKeyForItem(courseId: string, folderId: string, title: string, folders: Map<string, StoredFolder>, oldKey?: string) {
  return ["courses", safeR2Segment(courseId), ...getStoredFolderPath(folderId, folders).map(safeR2Segment), storageFileName(title, oldKey)].join("/");
}

async function getDescendantFolderIds(courseId: string, folderId: string) {
  const folders = await getStoredFolders(courseId);
  const ids = new Set<string>([folderId]);
  let changed = true;
  while (changed) {
    changed = false;
    folders.forEach((folder) => {
      if (folder.parentFolderId && ids.has(folder.parentFolderId) && !ids.has(folder.id)) {
        ids.add(folder.id);
        changed = true;
      }
    });
  }
  return ids;
}

export async function GET(req: NextRequest) {
  const courseId = new URL(req.url).searchParams.get("courseId");
  if (!courseId) return NextResponse.json({ error: "courseId required" }, { status: 400 });

  try {
    const viewer = await getAuthenticatedRequestUser(req);
    const includePremium = Boolean(viewer?.isAdmin || viewer?.purchasedCourses.includes(courseId));
    return NextResponse.json(await getCourseContent(courseId, includePremium));
  } catch (error) {
    console.error("GET course content error:", error);
    return NextResponse.json({ error: "Unable to load course content" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!(await isAdminRequest(req))) return NextResponse.json({ error: "Admin authorization required" }, { status: 403 });
  try {
    const body = await req.json() as RecordData;
    const action = String(body.action || "");
    const courseId = String(body.courseId || "");
    if (!courseId) return NextResponse.json({ error: "courseId required" }, { status: 400 });

    if (action === "create-folder") {
      const name = String(body.name || "").trim();
      if (!name) return NextResponse.json({ error: "Folder name required" }, { status: 400 });
      if (name.length > 120) return NextResponse.json({ error: "Folder name is too long" }, { status: 400 });

      const parentFolderId = String(body.parentId || body.parentFolderId || "");
      if (parentFolderId && !(await folderBelongsToCourse(parentFolderId, courseId))) {
        return NextResponse.json({ error: "Parent folder does not belong to this course" }, { status: 400 });
      }
      const folders = await adminDb.collection("courseFolders").where("courseId", "==", courseId).get();
      const duplicate = folders.docs.some((folder) => getParentId(folder.data() as RecordData) === parentFolderId && String(folder.data().name || "").trim().toLowerCase() === name.toLowerCase());
      if (duplicate) return NextResponse.json({ error: "A folder with that name already exists" }, { status: 409 });
      const storedFolders = new Map(folders.docs.map((folder) => {
        const data = folder.data();
        const parentId = getParentId(data as RecordData);
        return [folder.id, { id: folder.id, name: String(data.name || "Untitled folder"), ...(parentId ? { parentFolderId: parentId } : {}), depth: asNumber(data.depth) }];
      }));
      const parentPath = parentFolderId ? getStoredFolderPath(parentFolderId, storedFolders) : [];
      const siblingCount = folders.docs.filter((folder) => getParentId(folder.data() as RecordData) === parentFolderId).length;
      const folderData = {
        courseId,
        name,
        order: siblingCount,
        parentId: parentFolderId || null,
        ...(parentFolderId ? { parentFolderId } : {}),
        path: [...parentPath, name].join("/"),
        depth: parentPath.length,
        source: "manual" as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const ref = await adminDb.collection("courseFolders").add(folderData);
      return NextResponse.json({ success: true, folder: { id: ref.id, ...folderData } });
    }

    if (action === "create-item") {
      const folderId = String(body.folderId || "");
      const type = body.type === "pdf" ? "pdf" : body.type === "image" ? "image" : body.type === "video" ? "video" : "";
      const title = String(body.title || "").trim();
      if (!folderId || !type || !title) {
        return NextResponse.json({ error: "courseId, folderId, type and title are required" }, { status: 400 });
      }
      if (!(await folderBelongsToCourse(folderId, courseId))) {
        return NextResponse.json({ error: "Folder does not belong to this course" }, { status: 400 });
      }
      const url = type === "video" ? String(body.videoUrl || body.url || "") : type === "pdf" ? String(body.pdfUrl || body.url || "") : String(body.imageUrl || body.url || "");
      if (!url) return NextResponse.json({ error: `${type} URL required` }, { status: 400 });

      const existingItems = await adminDb.collection("courseItems").where("folderId", "==", folderId).get();
      const itemData = {
        courseId,
        folderId,
        type: type as CourseItemType,
        title,
        name: title,
        url,
        ...(type === "video" ? { videoUrl: url } : type === "pdf" ? { pdfUrl: url } : { imageUrl: url }),
        duration: asNumber(body.duration),
        thumbnail: String(body.thumbnail || ""),
        ...(body.description ? { description: String(body.description) } : {}),
        ...(body.isFreePreview !== undefined ? { isFreePreview: Boolean(body.isFreePreview) } : {}),
        ...(body.storageKey ? { storageKey: String(body.storageKey) } : {}),
        ...(body.thumbnailStorageKey ? { thumbnailStorageKey: String(body.thumbnailStorageKey) } : {}),
        ...(body.mimeType ? { mimeType: String(body.mimeType) } : {}),
        ...(body.folderPath ? { folderPath: String(body.folderPath) } : {}),
        ...(body.parentFolder ? { parentFolder: String(body.parentFolder) } : {}),
        ...(body.r2Key ? { r2Key: String(body.r2Key) } : {}),
        ...(body.r2Url ? { r2Url: String(body.r2Url) } : {}),
        size: asNumber(body.size),
        source: body.source === "google-drive" ? "google-drive" : "r2",
        ...(body.sourceDriveFileId ? { sourceDriveFileId: String(body.sourceDriveFileId) } : {}),
        order: body.order === undefined ? existingItems.size : asNumber(body.order),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const ref = await adminDb.collection("courseItems").add(itemData);
      return NextResponse.json({ success: true, item: { id: ref.id, ...itemData } });
    }

    return NextResponse.json({ error: "Unknown content action" }, { status: 400 });
  } catch (error) {
    console.error("POST course content error:", error);
    return NextResponse.json({ error: "Unable to save course content" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  if (!(await isAdminRequest(req))) return NextResponse.json({ error: "Admin authorization required" }, { status: 403 });
  try {
    const body = await req.json() as RecordData;
    const courseId = String(body.courseId || "");
    const folderId = String(body.folderId || "");
    const itemId = String(body.itemId || "");
    if (!courseId || (!folderId && !itemId)) return NextResponse.json({ error: "courseId and a folderId or itemId are required" }, { status: 400 });

    if (itemId) {
      const itemRef = adminDb.collection("courseItems").doc(itemId);
      const itemSnap = await itemRef.get();
      if (!itemSnap.exists || itemSnap.data()?.courseId !== courseId) return NextResponse.json({ error: "File not found" }, { status: 404 });
      const existing = itemSnap.data() || {};
      const updateData: Record<string, unknown> = { updatedAt: new Date().toISOString() };
      const nextTitle = typeof body.title === "string" && body.title.trim() ? body.title.trim() : String(existing.title || "Untitled file");
      const nextFolderId = body.folderId ? String(body.folderId) : String(existing.folderId || "");
      if (body.folderId && body.folderId !== existing.folderId) {
        if (!(await folderBelongsToCourse(String(body.folderId), courseId))) return NextResponse.json({ error: "Destination folder not found" }, { status: 404 });
        const destinationItems = await adminDb.collection("courseItems").where("folderId", "==", String(body.folderId)).get();
        updateData.folderId = String(body.folderId);
        updateData.order = destinationItems.size;
      }
      if (nextTitle !== String(existing.title || "")) {
        updateData.title = nextTitle;
        updateData.name = nextTitle;
      }
      if (typeof body.url === "string" && body.url) {
        updateData.url = body.url;
        updateData.videoUrl = existing.type === "video" ? body.url : "";
        updateData.pdfUrl = existing.type === "pdf" ? body.url : "";
        updateData.imageUrl = existing.type === "image" ? body.url : "";
      }
      const replacingStorageObject = typeof body.storageKey === "string" && body.storageKey && body.storageKey !== String(existing.storageKey || existing.r2Key || "");
      if (replacingStorageObject) {
        updateData.storageKey = body.storageKey;
        updateData.r2Key = body.storageKey;
        if (typeof body.url === "string" && body.url) {
          updateData.r2Url = body.url;
        } else {
          updateData.r2Url = getR2PublicUrl(String(body.storageKey));
        }
      }
      if (typeof body.thumbnail === "string") updateData.thumbnail = body.thumbnail;
      if (typeof body.thumbnailStorageKey === "string") updateData.thumbnailStorageKey = body.thumbnailStorageKey;
      if (body.duration !== undefined) updateData.duration = asNumber(body.duration);
      if (body.size !== undefined) updateData.size = asNumber(body.size);
      if (typeof body.mimeType === "string") updateData.mimeType = body.mimeType;
      if (body.isFreePreview !== undefined) updateData.isFreePreview = Boolean(body.isFreePreview);

      const currentStorageKey = String(existing.storageKey || existing.r2Key || "");
      const shouldMoveStorageObject = Boolean(currentStorageKey && !replacingStorageObject && (nextTitle !== String(existing.title || "") || nextFolderId !== String(existing.folderId || "")));
      if (shouldMoveStorageObject) {
        const folders = await getStoredFolders(courseId);
        const destinationKey = storageKeyForItem(courseId, nextFolderId, nextTitle, folders, currentStorageKey);
        if (destinationKey !== currentStorageKey) {
          const moved = await moveR2Object({ sourceKey: currentStorageKey, destinationKey, contentType: typeof existing.mimeType === "string" ? existing.mimeType : undefined });
          updateData.storageKey = moved.key;
          updateData.r2Key = moved.key;
          updateData.url = moved.url;
          updateData.r2Url = moved.url;
          if (existing.type === "video") updateData.videoUrl = moved.url;
          if (existing.type === "pdf") updateData.pdfUrl = moved.url;
          if (existing.type === "image") updateData.imageUrl = moved.url;
        }
        const folderPath = getStoredFolderPath(nextFolderId, folders);
        updateData.folderPath = folderPath.join("/");
        updateData.parentFolder = folderPath[folderPath.length - 1] || "";
      }
      await itemRef.update(updateData);
      if (updateData.folderId && updateData.folderId !== existing.folderId) {
        const sourceItems = (await adminDb.collection("courseItems").where("folderId", "==", String(existing.folderId || "")).get()).docs
          .filter((doc) => doc.id !== itemId)
          .sort((a, b) => asNumber(a.data().order) - asNumber(b.data().order));
        for (let index = 0; index < sourceItems.length; index += 400) {
          const batch = adminDb.batch();
          sourceItems.slice(index, index + 400).forEach((doc, offset) => batch.update(doc.ref, { order: index + offset, updatedAt: new Date().toISOString() }));
          await batch.commit();
        }
      }
      const previousKeys = [String(existing.storageKey || existing.r2Key || ""), String(existing.thumbnailStorageKey || "")].filter(Boolean);
      const currentKeys = [String(updateData.storageKey || existing.storageKey || existing.r2Key || ""), String(updateData.thumbnailStorageKey || existing.thumbnailStorageKey || "")].filter(Boolean);
      const replacedKeys = previousKeys.filter((key) => !currentKeys.includes(key));
      if (replacedKeys.length) await deleteR2Objects(replacedKeys);
      return NextResponse.json({ success: true, item: { id: itemId, ...existing, ...updateData } });
    }

    if (!(await folderBelongsToCourse(folderId, courseId))) return NextResponse.json({ error: "Folder not found" }, { status: 404 });
    const folderRef = adminDb.collection("courseFolders").doc(folderId);
    const folderSnap = await folderRef.get();
    const currentFolder = folderSnap.data() || {};
    const currentParentId = getParentId(currentFolder as RecordData);
    const updateData: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    const name = String(body.name || "").trim();
    if (name) {
      const folders = await adminDb.collection("courseFolders").where("courseId", "==", courseId).get();
      const duplicate = folders.docs.some((folder) => folder.id !== folderId && getParentId(folder.data() as RecordData) === currentParentId && String(folder.data().name || "").trim().toLowerCase() === name.toLowerCase());
      if (duplicate) return NextResponse.json({ error: "A folder with that name already exists" }, { status: 409 });
    }
    if (name) {
      updateData.name = name;
      const folders = await getStoredFolders(courseId);
      folders.set(folderId, { id: folderId, name, ...(currentParentId ? { parentFolderId: currentParentId } : {}), ...(currentFolder.order !== undefined ? { order: asNumber(currentFolder.order) } : {}), depth: asNumber(currentFolder.depth) });
      updateData.path = getStoredFolderPath(folderId, folders).join("/");
      updateData.depth = getStoredFolderPath(folderId, folders).length - 1;
    }
    if (body.order !== undefined) updateData.order = asNumber(body.order);
    if (!name && body.order === undefined) return NextResponse.json({ error: "Folder name or order required" }, { status: 400 });
    if (body.order !== undefined) {
      const folders = (await adminDb.collection("courseFolders").where("courseId", "==", courseId).get()).docs
        .map((doc) => ({ id: doc.id, data: doc.data() }))
        .filter((folder) => getParentId(folder.data as RecordData) === currentParentId)
        .sort((a, b) => asNumber(a.data.order) - asNumber(b.data.order));
      const fromIndex = folders.findIndex((folder) => folder.id === folderId);
      if (fromIndex < 0) return NextResponse.json({ error: "Folder not found" }, { status: 404 });
      const toIndex = Math.max(0, Math.min(folders.length - 1, asNumber(body.order)));
      const moved = folders.splice(fromIndex, 1)[0];
      folders.splice(toIndex, 0, moved);
      const batch = adminDb.batch();
      folders.forEach((folder, index) => batch.update(adminDb.collection("courseFolders").doc(folder.id), { order: index, updatedAt: new Date().toISOString() }));
      await batch.commit();
      return NextResponse.json({ success: true });
    }
    await folderRef.update(updateData);
    if (name) await updateDescendantFolderPaths(courseId, folderId);
    return NextResponse.json({ success: true, folder: { id: folderId, ...currentFolder, ...updateData } });
  } catch (error) {
    console.error("PATCH course content error:", error);
    return NextResponse.json({ error: "Unable to update course content" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!(await isAdminRequest(req))) return NextResponse.json({ error: "Admin authorization required" }, { status: 403 });
  try {
    const searchParams = new URL(req.url).searchParams;
    const courseId = searchParams.get("courseId") || "";
    const folderId = searchParams.get("folderId") || "";
    const itemId = searchParams.get("itemId") || "";

    if (itemId && courseId) {
      const ref = adminDb.collection("courseItems").doc(itemId);
      const snap = await ref.get();
      if (!snap.exists || snap.data()?.courseId !== courseId) return NextResponse.json({ error: "Item not found" }, { status: 404 });
      const storageKeys = [snap.data()?.storageKey, snap.data()?.r2Key, snap.data()?.thumbnailStorageKey].filter(Boolean).map(String);
      await ref.delete();
      await deleteR2Objects([...new Set(storageKeys)]);
      return NextResponse.json({ success: true });
    }

    if (!folderId || !courseId) return NextResponse.json({ error: "courseId and folderId required" }, { status: 400 });
    const folderRef = adminDb.collection("courseFolders").doc(folderId);
    const folderSnap = await folderRef.get();
    if (!folderSnap.exists || folderSnap.data()?.courseId !== courseId) return NextResponse.json({ error: "Folder not found" }, { status: 404 });

    const descendantFolderIds = await getDescendantFolderIds(courseId, folderId);
    const itemSnapshot = await adminDb.collection("courseItems").where("courseId", "==", courseId).get();
    const itemsToDelete = itemSnapshot.docs.filter((doc) => descendantFolderIds.has(String(doc.data().folderId || "")));
    const storageKeys = itemsToDelete.flatMap((doc) => [doc.data().storageKey, doc.data().r2Key, doc.data().thumbnailStorageKey]).filter(Boolean).map(String);
    for (let index = 0; index < itemsToDelete.length; index += 400) {
      const batch = adminDb.batch();
      itemsToDelete.slice(index, index + 400).forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
    }
    const folderSnapshot = await adminDb.collection("courseFolders").where("courseId", "==", courseId).get();
    const foldersToDelete = folderSnapshot.docs.filter((doc) => descendantFolderIds.has(doc.id));
    for (let index = 0; index < foldersToDelete.length; index += 400) {
      const batch = adminDb.batch();
      foldersToDelete.slice(index, index + 400).forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
    }
    await deleteR2Objects([...new Set(storageKeys)]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE course content error:", error);
    return NextResponse.json({ error: "Unable to delete course content" }, { status: 500 });
  }
}
