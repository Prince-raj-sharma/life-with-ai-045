import { adminDb } from "@/lib/firebase-admin";

export type CourseFolderRecord = {
  id: string;
  courseId: string;
  name: string;
  order: number;
  parentFolderId?: string;
  parentId?: string | null;
  path?: string;
  depth?: number;
};

export function folderMapKey(parentFolderId: string, name: string) {
  return `${parentFolderId}::${name.trim().toLowerCase()}`;
}

export function folderPathFor(folderId: string, folders: Map<string, CourseFolderRecord>) {
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

export async function ensureFolderHierarchy({
  courseId,
  destinationFolderId,
  folderSegments,
  folderIds,
  folders,
  foldersByKey,
  source = "google-drive",
}: {
  courseId: string;
  destinationFolderId: string;
  folderSegments: string[];
  folderIds?: string[];
  folders: Map<string, CourseFolderRecord>;
  foldersByKey: Map<string, CourseFolderRecord>;
  source?: "google-drive" | "manual";
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
      const data: CourseFolderRecord = {
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
        source,
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
