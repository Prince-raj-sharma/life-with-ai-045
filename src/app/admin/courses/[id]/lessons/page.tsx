"use client";

import React, { useCallback, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  CheckCircle2,
  Copy,
  Download,
  Eye,
  FileText,
  FileVideo,
  Folder,
  FolderPlus,
  ChevronDown,
  ChevronRight,
  Image as ImageIcon,
  Loader2,
  Pencil,
  RefreshCw,
  RotateCcw,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useUpload, UploadError, UploadResult } from "@/hooks/useUpload";
import { useToast } from "@/providers/ToastProvider";
import { Course, CourseContentResponse, CourseFolder, CourseItem } from "@/types";
import GoogleDrivePicker from "@/components/admin/GoogleDrivePicker";
import PdfViewerModal from "@/components/shared/PdfViewerModal";
import VideoPlayer from "@/components/shared/VideoPlayer";
import { auth } from "@/lib/firebase";
import { formatDate } from "@/utils";

type UploadTaskStatus = "queued" | "uploading" | "completed" | "failed" | "cancelled";

interface UploadTask {
  id: string;
  file: File;
  status: UploadTaskStatus;
  progress: number;
  error?: string;
}

function isPdfFile(file: File) {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

function isVideoFile(file: File) {
  return file.type.startsWith("video/") || /\.(mp4|webm|mov|m4v|avi|mkv)$/i.test(file.name);
}

function isImageFile(file: File) {
  return file.type.startsWith("image/") || /\.(jpeg|jpg|png|webp)$/i.test(file.name);
}

function isSupportedFile(file: File) {
  return isPdfFile(file) || isVideoFile(file) || isImageFile(file);
}

function formatBytes(bytes?: number) {
  if (!bytes) return "Size unavailable";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(index ? 1 : 0)} ${units[index]}`;
}

function formatDuration(seconds?: number) {
  if (!seconds) return "Duration unavailable";
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.round(seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${remainder}`;
}

function getVideoDuration(file: File) {
  return new Promise<number>((resolve) => {
    const video = document.createElement("video");
    const objectUrl = URL.createObjectURL(file);
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(Number.isFinite(video.duration) ? Math.round(video.duration) : 0);
    };
    video.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(0);
    };
    video.src = objectUrl;
  });
}

function createVideoThumbnail(file: File) {
  return new Promise<File | null>((resolve) => {
    const video = document.createElement("video");
    const objectUrl = URL.createObjectURL(file);
    video.preload = "metadata";
    video.muted = true;
    const finish = (thumbnail: File | null) => {
      URL.revokeObjectURL(objectUrl);
      resolve(thumbnail);
    };
    video.onerror = () => finish(null);
    video.onloadedmetadata = () => {
      video.currentTime = Math.min(1, Math.max(0, video.duration / 2));
    };
    video.onseeked = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 640;
      canvas.height = 360;
      const context = canvas.getContext("2d");
      if (!context) {
        finish(null);
        return;
      }
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => finish(blob ? new File([blob], `${file.name}.jpg`, { type: "image/jpeg" }) : null), "image/jpeg", 0.82);
    };
    video.src = objectUrl;
  });
}

export default function AdminCourseLessonsPage() {
  const params = useParams();
  const courseId = params?.id as string;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { uploadFile, cancelUpload, uploading } = useUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const fileListRef = useRef<HTMLDivElement>(null);
  const queueCancelled = useRef(false);
  const [selectedFolderId, setSelectedFolderId] = useState("");
  const [dragging, setDragging] = useState(false);
  const [busyAction, setBusyAction] = useState(false);
  const [openFolderIds, setOpenFolderIds] = useState<Record<string, boolean>>({});
  const [uploadTasks, setUploadTasks] = useState<UploadTask[]>([]);
  const [replaceItem, setReplaceItem] = useState<CourseItem | null>(null);
  const [previewItem, setPreviewItem] = useState<CourseItem | null>(null);
  const [activePdf, setActivePdf] = useState<string | null>(null);

  const authHeaders = useCallback(async () => {
    const token = await auth.currentUser?.getIdToken();
    if (!token) throw new Error("Admin authentication expired. Sign in again.");
    return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
  }, []);

  const { data: course } = useQuery({
    queryKey: ["admin-content-course", courseId],
    queryFn: async () => {
      const res = await fetch(`/api/courses/${courseId}`);
      if (!res.ok) throw new Error("Course not found");
      return (await res.json()).course as Course;
    },
    enabled: !!courseId,
  });

  const { data: content, refetch, isLoading } = useQuery({
    queryKey: ["admin-course-content", courseId],
    queryFn: async () => {
      const res = await fetch(`/api/course-content?courseId=${encodeURIComponent(courseId)}`, { headers: await authHeaders() });
      if (!res.ok) throw new Error("Unable to load course content");
      return (await res.json()) as CourseContentResponse;
    },
    enabled: !!courseId,
  });

  const folders = useMemo(() => content?.folders || [], [content?.folders]);
  const items = useMemo(() => content?.items || [], [content?.items]);
  const activeFolderId = folders.some((folder) => folder.id === selectedFolderId) ? selectedFolderId : folders.find((folder) => !(folder.parentFolderId || folder.parentId))?.id || folders[0]?.id || "";
  const selectedFolder = folders.find((folder) => folder.id === activeFolderId);
  const selectedItems = useMemo(
    () => items.filter((item) => item.folderId === activeFolderId).sort((a, b) => a.order - b.order),
    [items, activeFolderId],
  );
  const childFolders = useMemo(() => {
    const result = new Map<string, CourseFolder[]>();
    folders.forEach((folder) => {
      const parentId = folder.parentFolderId || folder.parentId || "";
      result.set(parentId, [...(result.get(parentId) || []), folder].sort((a, b) => a.order - b.order || a.name.localeCompare(b.name)));
    });
    return result;
  }, [folders]);
  const folderPaths = useMemo(() => {
    const paths = new Map<string, string>();
    const byId = new Map(folders.map((folder) => [folder.id || "", folder]));
    const getPath = (folder: CourseFolder): string => {
      if (!folder.id) return folder.name;
      const cached = paths.get(folder.id);
      if (cached) return cached;
      const parentId = folder.parentFolderId || folder.parentId || "";
      const parent = parentId ? byId.get(parentId) : undefined;
      const path = parent ? `${getPath(parent)} / ${folder.name}` : folder.name;
      paths.set(folder.id, path);
      return path;
    };
    folders.forEach((folder) => getPath(folder));
    return paths;
  }, [folders]);
  const folderCounts = useMemo(() => {
    const counts = new Map<string, number>();
    items.forEach((item) => counts.set(item.folderId, (counts.get(item.folderId) || 0) + 1));
    return counts;
  }, [items]);
  // TanStack Virtual intentionally returns an object whose methods are stable for this list.
  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualRows = useVirtualizer({
    count: selectedItems.length,
    getScrollElement: () => fileListRef.current,
    estimateSize: () => 92,
    overscan: 8,
  });

  const refresh = useCallback(() => refetch(), [refetch]);

  const addFolderToContentCache = useCallback((folder: CourseFolder) => {
    queryClient.setQueryData<CourseContentResponse>(["admin-course-content", courseId], (current) => current ? { ...current, folders: [...current.folders, folder] } : current);
  }, [courseId, queryClient]);

  const createFolder = async () => {
    const name = window.prompt("Folder name", "Day 1")?.trim();
    if (!name) return;
    setBusyAction(true);
    try {
      const res = await fetch("/api/course-content", { method: "POST", headers: await authHeaders(), body: JSON.stringify({ action: "create-folder", courseId, name }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not create folder");
      setSelectedFolderId(data.folder.id);
      await refresh();
      toast({ message: "Folder created", type: "success" });
    } catch (error) {
      toast({ message: error instanceof Error ? error.message : "Could not create folder", type: "error" });
    } finally {
      setBusyAction(false);
    }
  };

  const createChildFolder = async (parent: CourseFolder) => {
    if (!parent.id || parent.id.startsWith("legacy-")) return toast({ message: "Legacy lessons are read-only.", type: "info" });
    const name = window.prompt(`Create folder inside “${parent.name}”`, "New Folder")?.trim();
    if (!name) return;
    setBusyAction(true);
    try {
      const res = await fetch("/api/course-content", { method: "POST", headers: await authHeaders(), body: JSON.stringify({ action: "create-folder", courseId, name, parentId: parent.id }) });
      const data = await res.json() as { error?: string; folder?: CourseFolder };
      if (!res.ok || !data.folder) throw new Error(data.error || "Could not create child folder");
      addFolderToContentCache(data.folder);
      setOpenFolderIds((current) => ({ ...current, [parent.id!]: true, [data.folder!.id!]: true }));
      setSelectedFolderId(data.folder.id || "");
      toast({ message: "Child folder created", type: "success" });
    } catch (error) {
      toast({ message: error instanceof Error ? error.message : "Could not create child folder", type: "error" });
    } finally {
      setBusyAction(false);
    }
  };

  const renameFolder = async (folder: CourseFolder) => {
    if (!folder.id || folder.id.startsWith("legacy-")) return toast({ message: "Legacy lessons are read-only.", type: "info" });
    const name = window.prompt("Rename folder", folder.name)?.trim();
    if (!name || name === folder.name) return;
    setBusyAction(true);
    try {
      const res = await fetch("/api/course-content", { method: "PATCH", headers: await authHeaders(), body: JSON.stringify({ courseId, folderId: folder.id, name }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not rename folder");
      await refresh();
      toast({ message: "Folder renamed", type: "success" });
    } catch (error) {
      toast({ message: error instanceof Error ? error.message : "Could not rename folder", type: "error" });
    } finally {
      setBusyAction(false);
    }
  };

  const moveFolder = async (folder: CourseFolder, direction: -1 | 1) => {
    if (!folder.id || folder.id.startsWith("legacy-")) return;
    const siblings = childFolders.get(folder.parentFolderId || folder.parentId || "") || [];
    const index = siblings.findIndex((entry) => entry.id === folder.id);
    const next = index + direction;
    if (next < 0 || next >= siblings.length) return;
    setBusyAction(true);
    try {
      const res = await fetch("/api/course-content", { method: "PATCH", headers: await authHeaders(), body: JSON.stringify({ courseId, folderId: folder.id, order: next }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not move folder");
      await refresh();
    } catch (error) {
      toast({ message: error instanceof Error ? error.message : "Could not move folder", type: "error" });
    } finally {
      setBusyAction(false);
    }
  };

  const deleteFolder = async (folder: CourseFolder) => {
    if (!folder.id || folder.id.startsWith("legacy-")) return toast({ message: "Legacy lessons are read-only.", type: "info" });
    if (!window.confirm(`Delete “${folder.name}” and all ${folderCounts.get(folder.id) || 0} file(s) inside it?`)) return;
    setBusyAction(true);
    try {
      const res = await fetch(`/api/course-content?courseId=${encodeURIComponent(courseId)}&folderId=${encodeURIComponent(folder.id)}`, { method: "DELETE", headers: await authHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not delete folder");
      setSelectedFolderId("");
      await refresh();
      toast({ message: "Folder deleted", type: "success" });
    } catch (error) {
      toast({ message: error instanceof Error ? error.message : "Could not delete folder", type: "error" });
    } finally {
      setBusyAction(false);
    }
  };

  const updateTask = (id: string, update: Partial<UploadTask>) => setUploadTasks((current) => current.map((task) => task.id === id ? { ...task, ...update } : task));

  const uploadFiles = async (files: FileList | File[]) => {
    if (!activeFolderId || activeFolderId.startsWith("legacy-")) {
      toast({ message: "Select a new folder before uploading files.", type: "info" });
      return;
    }
    const fileArray = Array.from(files);
    const validFiles = fileArray.filter(isSupportedFile);
    const invalidFiles = fileArray.filter((file) => !isSupportedFile(file));
    if (invalidFiles.length) toast({ message: `${invalidFiles.map((file) => file.name).join(", ")} skipped: only video, PDF and image files are supported.`, type: "error" });
    if (!validFiles.length) return;

    const tasks = validFiles.map((file, index) => ({ id: `${Date.now()}-${index}-${Math.random().toString(36).slice(2)}`, file, status: "queued" as const, progress: 0 }));
    setUploadTasks(tasks);
    setBusyAction(true);
    queueCancelled.current = false;
    let nextIndex = 0;
    const worker = async () => {
      while (!queueCancelled.current && nextIndex < tasks.length) {
        const index = nextIndex;
        nextIndex += 1;
        const task = tasks[index];
        updateTask(task.id, { status: "uploading", error: undefined });
        try {
          const video = isVideoFile(task.file);
          const image = isImageFile(task.file);
          const duration = video ? await getVideoDuration(task.file) : 0;
          const uploaded = await uploadFile(task.file, `course-${courseId}-${activeFolderId}`, {
            uploadId: task.id,
            onProgress: (value) => updateTask(task.id, { progress: value.percentage }),
          });
          let thumbnail: UploadResult | null = null;
          if (video) {
            const thumbnailFile = await createVideoThumbnail(task.file);
            if (thumbnailFile) {
              try {
                thumbnail = await uploadFile(thumbnailFile, `course-${courseId}-${activeFolderId}-thumbnails`, { uploadId: `${task.id}-thumbnail` });
              } catch (thumbnailError) {
                console.warn("Video thumbnail upload skipped:", thumbnailError);
              }
            }
          }
          const response = await fetch("/api/course-content", {
            method: "POST",
            headers: await authHeaders(),
            body: JSON.stringify({
              action: "create-item",
              courseId,
              folderId: activeFolderId,
              type: video ? "video" : image ? "image" : "pdf",
              title: task.file.name,
              url: uploaded.url,
              ...(video ? { videoUrl: uploaded.url } : image ? { imageUrl: uploaded.url } : { pdfUrl: uploaded.url }),
              thumbnail: thumbnail?.url || "",
              storageKey: uploaded.key,
              ...(thumbnail?.key ? { thumbnailStorageKey: thumbnail.key } : {}),
              mimeType: uploaded.contentType,
              size: uploaded.size,
              duration,
            }),
          });
          const data = await response.json();
          if (!response.ok) throw new Error(data.error || `Could not save ${task.file.name}`);
          updateTask(task.id, { status: "completed", progress: 100 });
          await refresh();
        } catch (error) {
          const uploadError = error as UploadError;
          updateTask(task.id, { status: uploadError.code === "UPLOAD_CANCELLED" ? "cancelled" : "failed", error: uploadError.message || "Upload failed" });
        }
      }
    };
    try {
      await Promise.all([worker(), worker(), worker()]);
    } finally {
      setBusyAction(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const retryFailedUploads = () => {
    const failed = uploadTasks.filter((task) => task.status === "failed").map((task) => task.file);
    if (failed.length) void uploadFiles(failed);
  };

  const cancelQueue = () => {
    queueCancelled.current = true;
    cancelUpload();
    setUploadTasks((current) => current.map((task) => task.status === "queued" ? { ...task, status: "cancelled", error: "Upload cancelled" } : task));
  };

  const downloadItem = async (item: CourseItem) => {
    if (!item.id) return;
    setBusyAction(true);
    try {
      const response = await fetch(`/api/course-content/download?courseId=${encodeURIComponent(courseId)}&itemId=${encodeURIComponent(item.id)}&mode=url`, { headers: await authHeaders() });
      const data = await response.json() as { error?: string; url?: string; fileName?: string };
      if (!response.ok || !data.url) throw new Error(data.error || "Could not prepare download");
      const anchor = document.createElement("a");
      anchor.href = data.url;
      anchor.download = data.fileName || item.title;
      anchor.target = "_blank";
      anchor.rel = "noreferrer";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
    } catch (error) {
      toast({ message: error instanceof Error ? error.message : "Could not download file", type: "error" });
    } finally {
      setBusyAction(false);
    }
  };

  const deleteItem = async (item: CourseItem) => {
    if (!item.id || item.source === "legacy") return toast({ message: "Legacy lessons are read-only.", type: "info" });
    if (!window.confirm(`Delete “${item.title}”? This also removes the R2 object.`)) return;
    setBusyAction(true);
    try {
      const res = await fetch(`/api/course-content?courseId=${encodeURIComponent(courseId)}&itemId=${encodeURIComponent(item.id)}`, { method: "DELETE", headers: await authHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not delete file");
      await refresh();
      toast({ message: "File deleted", type: "success" });
    } catch (error) {
      toast({ message: error instanceof Error ? error.message : "Could not delete file", type: "error" });
    } finally {
      setBusyAction(false);
    }
  };

  const renameItem = async (item: CourseItem) => {
    if (!item.id || item.source === "legacy") return toast({ message: "Legacy lessons are read-only.", type: "info" });
    const title = window.prompt("Rename file", item.title)?.trim();
    if (!title || title === item.title) return;
    setBusyAction(true);
    try {
      const res = await fetch("/api/course-content", { method: "PATCH", headers: await authHeaders(), body: JSON.stringify({ courseId, itemId: item.id, title }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not rename file");
      await refresh();
      toast({ message: "File renamed", type: "success" });
    } catch (error) {
      toast({ message: error instanceof Error ? error.message : "Could not rename file", type: "error" });
    } finally {
      setBusyAction(false);
    }
  };

  const setDemoLesson = async (item: CourseItem, isFreePreview: boolean) => {
    if (!item.id || item.source === "legacy") return;
    setBusyAction(true);
    try {
      const res = await fetch("/api/course-content", { method: "PATCH", headers: await authHeaders(), body: JSON.stringify({ courseId, itemId: item.id, isFreePreview }) });
      const data = await res.json() as { error?: string };
      if (!res.ok) throw new Error(data.error || "Could not update demo lesson setting");
      queryClient.setQueryData<CourseContentResponse>(["admin-course-content", courseId], (current) => current ? { ...current, items: current.items.map((entry) => entry.id === item.id ? { ...entry, isFreePreview } : entry) } : current);
      toast({ message: isFreePreview ? "Lesson marked as demo" : "Lesson hidden before purchase", type: "success" });
    } catch (error) {
      toast({ message: error instanceof Error ? error.message : "Could not update demo lesson setting", type: "error" });
    } finally {
      setBusyAction(false);
    }
  };

  const moveItem = async (item: CourseItem) => {
    if (!item.id || item.source === "legacy") return toast({ message: "Legacy lessons are read-only.", type: "info" });
    const destination = window.prompt(`Move “${item.title}” to which folder?\n\n${folders.filter((folder) => folder.id !== item.folderId).map((folder) => folderPaths.get(folder.id || "") || folder.name).join("\n")}`)?.trim();
    if (!destination) return;
    const folder = folders.find((entry) => (folderPaths.get(entry.id || "") || entry.name).toLowerCase() === destination.toLowerCase()) || folders.find((entry) => entry.name.toLowerCase() === destination.toLowerCase());
    if (!folder?.id || folder.id === item.folderId) return toast({ message: "Destination folder not found.", type: "error" });
    setBusyAction(true);
    try {
      const res = await fetch("/api/course-content", { method: "PATCH", headers: await authHeaders(), body: JSON.stringify({ courseId, itemId: item.id, folderId: folder.id }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not move file");
      await refresh();
      toast({ message: "File moved", type: "success" });
    } catch (error) {
      toast({ message: error instanceof Error ? error.message : "Could not move file", type: "error" });
    } finally {
      setBusyAction(false);
    }
  };

  const copyUrl = async (item: CourseItem) => {
    const url = item.url || item.videoUrl || item.pdfUrl || item.imageUrl;
    if (!url) return toast({ message: "File URL is missing.", type: "error" });
    try {
      await navigator.clipboard.writeText(url);
      toast({ message: "R2 URL copied", type: "success" });
    } catch {
      toast({ message: "Clipboard access was blocked by the browser.", type: "error" });
    }
  };

  const replaceFile = async (file: File) => {
    if (!replaceItem?.id || replaceItem.source === "legacy") return;
    const sameType = replaceItem.type === "pdf" ? isPdfFile(file) : replaceItem.type === "image" ? isImageFile(file) : isVideoFile(file);
    if (!sameType) {
      toast({ message: `Replacement must be a ${replaceItem.type === "pdf" ? "PDF" : replaceItem.type === "image" ? "image" : "video"}.`, type: "error" });
      return;
    }
    setBusyAction(true);
    try {
      const video = replaceItem.type === "video";
      const image = replaceItem.type === "image";
      const duration = video ? await getVideoDuration(file) : 0;
      const uploaded = await uploadFile(file, `course-${courseId}-${replaceItem.folderId}`, { uploadId: `replace-${replaceItem.id}`, onProgress: () => undefined });
      let thumbnail: UploadResult | null = null;
      if (video) {
        const thumbnailFile = await createVideoThumbnail(file);
        if (thumbnailFile) {
          try {
            thumbnail = await uploadFile(thumbnailFile, `course-${courseId}-${replaceItem.folderId}-thumbnails`, { uploadId: `replace-${replaceItem.id}-thumbnail` });
          } catch (thumbnailError) {
            console.warn("Replacement thumbnail upload skipped:", thumbnailError);
          }
        }
      }
      const response = await fetch("/api/course-content", {
        method: "PATCH",
        headers: await authHeaders(),
        body: JSON.stringify({
          courseId,
          itemId: replaceItem.id,
          title: file.name,
          url: uploaded.url,
          ...(image ? { imageUrl: uploaded.url } : {}),
          storageKey: uploaded.key,
          previousStorageKey: replaceItem.storageKey,
          mimeType: uploaded.contentType,
          size: uploaded.size,
          duration,
          ...(thumbnail ? { thumbnail: thumbnail.url, thumbnailStorageKey: thumbnail.key } : {}),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not replace file");
      await refresh();
      toast({ message: "File replaced", type: "success" });
    } catch (error) {
      toast({ message: error instanceof Error ? error.message : "Could not replace file", type: "error" });
    } finally {
      setReplaceItem(null);
      if (replaceInputRef.current) replaceInputRef.current.value = "";
      setBusyAction(false);
    }
  };

  const itemUrl = (item: CourseItem) => item.url || item.videoUrl || item.pdfUrl || item.imageUrl || "";
  const activeUploadTasks = uploadTasks.filter((task) => task.status === "queued" || task.status === "uploading");
  const failedUploadTasks = uploadTasks.filter((task) => task.status === "failed");

  const toggleFolder = (folderId: string) => setOpenFolderIds((current) => ({ ...current, [folderId]: !(current[folderId] ?? true) }));

  const renderFolder = (folder: CourseFolder, depth = 0): React.ReactNode => {
    const folderId = folder.id || "";
    const children = childFolders.get(folderId) || [];
    const isOpen = openFolderIds[folderId] ?? true;
    const siblingFolders = childFolders.get(folder.parentFolderId || folder.parentId || "") || [];
    const siblingIndex = siblingFolders.findIndex((entry) => entry.id === folder.id);
    return (
      <React.Fragment key={folder.id}>
        <div className={`group rounded-2xl border p-3 transition ${activeFolderId === folder.id ? "border-blue-200 bg-blue-50" : "border-slate-100 hover:border-slate-200 hover:bg-slate-50"}`} style={{ marginLeft: depth * 14 }}>
          <div className="flex items-center gap-1">
            {children.length > 0 ? <button type="button" onClick={() => toggleFolder(folderId)} className="rounded p-1 text-slate-400 hover:bg-white hover:text-blue-600" aria-label={`${isOpen ? "Collapse" : "Expand"} ${folder.name}`}>{isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</button> : <span className="w-6" />}
            <button type="button" onClick={() => setSelectedFolderId(folderId)} className="flex min-w-0 flex-1 items-center gap-2 text-left"><Folder className={`h-5 w-5 flex-shrink-0 ${activeFolderId === folder.id ? "fill-blue-100 text-[#1D4ED8]" : "text-slate-400"}`} /><span className="truncate text-sm font-bold text-slate-800">{folder.name}</span></button>
            <span className="text-[11px] font-bold text-slate-400">{folder.id ? folderCounts.get(folder.id) || 0 : 0}</span>
          </div>
          <div className="mt-2 flex items-center justify-between gap-1 pl-7"><span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{children.length ? `${children.length} subfolder${children.length === 1 ? "" : "s"}` : "Folder"}</span>{folder.id && !folder.id.startsWith("legacy-") && <div className="flex gap-1"><button type="button" onClick={() => void moveFolder(folder, -1)} disabled={siblingIndex <= 0 || busyAction} className="rounded p-1 text-slate-400 hover:bg-white hover:text-blue-600 disabled:opacity-30" aria-label={`Move ${folder.name} up`}><ArrowUp className="h-3.5 w-3.5" /></button><button type="button" onClick={() => void moveFolder(folder, 1)} disabled={siblingIndex < 0 || siblingIndex >= siblingFolders.length - 1 || busyAction} className="rounded p-1 text-slate-400 hover:bg-white hover:text-blue-600 disabled:opacity-30" aria-label={`Move ${folder.name} down`}><ArrowDown className="h-3.5 w-3.5" /></button><button type="button" onClick={() => void createChildFolder(folder)} disabled={busyAction} className="rounded p-1 text-slate-400 hover:bg-white hover:text-emerald-600 disabled:opacity-30" aria-label={`Create folder inside ${folder.name}`} title="New folder"><FolderPlus className="h-3.5 w-3.5" /></button><button type="button" onClick={() => void renameFolder(folder)} className="rounded p-1 text-slate-400 hover:bg-white hover:text-blue-600" aria-label={`Rename ${folder.name}`}><Pencil className="h-3.5 w-3.5" /></button><button type="button" onClick={() => void deleteFolder(folder)} className="rounded p-1 text-slate-400 hover:bg-white hover:text-red-600" aria-label={`Delete ${folder.name}`}><Trash2 className="h-3.5 w-3.5" /></button></div>}</div>
        </div>
        {isOpen && children.map((child) => renderFolder(child, depth + 1))}
      </React.Fragment>
    );
  };

  return (
    <div className="w-full min-w-0 space-y-6 pb-24 animate-fade-in">
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <Link href="/admin/courses" className="flex-shrink-0 rounded-xl bg-slate-100 p-2 text-slate-700 hover:bg-slate-200"><ArrowLeft className="h-5 w-5" /></Link>
          <div className="min-w-0"><h1 className="truncate text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">{course?.title || "Course files"}</h1><p className="truncate text-xs text-slate-600 sm:text-sm">Drive-style folders, files, R2 streaming and metadata</p></div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={createFolder} disabled={busyAction} className="inline-flex items-center gap-2 rounded-xl bg-[#1D4ED8] px-4 py-2.5 text-xs font-bold text-white shadow transition hover:bg-blue-800 disabled:opacity-50"><FolderPlus className="h-4 w-4" /> Create Folder</button>
          {activeFolderId && !activeFolderId.startsWith("legacy-") && <GoogleDrivePicker courseId={courseId} folderId={activeFolderId} onImported={refresh} />}
        </div>
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between px-2"><h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Folders</h2><span className="text-xs font-bold text-slate-400">{folders.length}</span></div>
          <div className="space-y-2">
            {isLoading ? [1, 2, 3].map((id) => <div key={id} className="h-16 animate-pulse rounded-2xl bg-slate-100" />) : folders.length === 0 ? <p className="px-2 py-5 text-center text-xs italic text-slate-400">Create your first folder.</p> : (childFolders.get("") || []).map((folder) => renderFolder(folder))}
          </div>
        </aside>

        <section className={`min-w-0 rounded-3xl border bg-white p-5 shadow-sm sm:p-7 ${dragging ? "border-blue-500 bg-blue-50/30" : "border-slate-200"}`} onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); void uploadFiles(event.dataTransfer.files); }}>
          <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex min-w-0 items-center gap-3"><Folder className="h-6 w-6 flex-shrink-0 fill-blue-100 text-[#1D4ED8]" /><div className="min-w-0"><h2 className="truncate text-xl font-extrabold text-slate-900">{selectedFolder?.name || "Select a folder"}</h2><p className="text-xs text-slate-500">{selectedItems.length} file(s) · drag videos, PDFs or images here</p></div></div>{activeFolderId && !activeFolderId.startsWith("legacy-") && <><input ref={fileInputRef} type="file" multiple accept="video/*,application/pdf,image/*" className="hidden" onChange={(event) => { if (event.target.files) void uploadFiles(event.target.files); }} /><button type="button" onClick={() => fileInputRef.current?.click()} disabled={busyAction} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-slate-700 disabled:opacity-50"><Upload className="h-4 w-4" /> Upload files</button></>}</div>

          {uploadTasks.length > 0 && <div className="mt-5 space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-xs font-extrabold uppercase tracking-wide text-slate-600">Upload queue</h3><div className="flex gap-2">{activeUploadTasks.length > 0 && <button type="button" onClick={cancelQueue} className="rounded-lg bg-white px-3 py-1.5 text-[11px] font-bold text-red-600 shadow-sm hover:bg-red-50">Cancel queue</button>}{failedUploadTasks.length > 0 && <button type="button" onClick={retryFailedUploads} className="rounded-lg bg-white px-3 py-1.5 text-[11px] font-bold text-blue-600 shadow-sm hover:bg-blue-50"><RotateCcw className="mr-1 inline h-3 w-3" />Retry failed</button>}</div></div>{uploadTasks.map((task) => <div key={task.id} className="rounded-xl bg-white p-3 shadow-sm"><div className="flex items-center gap-2"><span className="min-w-0 flex-1 truncate text-xs font-bold text-slate-700">{task.file.name}</span><span className={`text-[10px] font-extrabold uppercase ${task.status === "failed" ? "text-red-600" : task.status === "completed" ? "text-emerald-600" : task.status === "cancelled" ? "text-slate-400" : "text-blue-600"}`}>{task.status}</span>{task.status === "completed" && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}</div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className={`h-full transition-all ${task.status === "failed" ? "bg-red-500" : task.status === "completed" ? "bg-emerald-500" : "bg-blue-600"}`} style={{ width: `${task.progress}%` }} /></div>{task.error && <p className="mt-1 text-[10px] text-red-600">{task.error}</p>}</div>)}</div>}

          {uploading && <div className="mt-4 flex items-center gap-2 rounded-xl bg-blue-50 px-4 py-3 text-xs font-bold text-blue-700"><Loader2 className="h-4 w-4 animate-spin" /> Secure server upload in progress. The browser is sending the file only to this application.</div>}

          <div ref={fileListRef} className="mt-5 max-h-[680px] overflow-auto rounded-2xl border border-slate-100">{selectedItems.length === 0 ? <div className="flex min-h-64 flex-col items-center justify-center gap-3 p-8 text-center"><div className="rounded-2xl bg-blue-50 p-4 text-[#1D4ED8]"><Upload className="h-7 w-7" /></div><p className="text-sm font-bold text-slate-700">This folder is empty</p><p className="max-w-sm text-xs leading-relaxed text-slate-400">Upload videos, PDFs or images, import from Google Drive, or drag files into this area.</p></div> : <div className="relative" style={{ height: `${virtualRows.getTotalSize()}px` }}>{virtualRows.getVirtualItems().map((virtualRow) => { const item = selectedItems[virtualRow.index]; const url = itemUrl(item); const isImage = item.type === "image" || item.mimeType?.startsWith("image/"); const icon = item.type === "video" ? <FileVideo className="h-5 w-5" /> : isImage ? <ImageIcon className="h-5 w-5" /> : <FileText className="h-5 w-5" />; const typeLabel = item.type === "video" ? "Video" : isImage ? "Image" : "PDF"; return <div key={item.id} className="absolute left-0 top-0 w-full border-b border-slate-100" style={{ height: `${virtualRow.size}px`, transform: `translateY(${virtualRow.start}px)` }}><div className="flex min-w-0 items-center gap-3 p-3 sm:p-4"><div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl ${item.type === "video" ? "bg-blue-50 text-blue-600" : isImage ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"}`} style={item.thumbnail ? { backgroundImage: `url(${item.thumbnail})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}>{!item.thumbnail && icon}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-slate-900">{item.title}</p><p className="truncate text-[11px] text-slate-500">{typeLabel} · {formatBytes(item.size)} · {formatDate(item.createdAt)}{item.type === "video" ? ` · ${formatDuration(item.duration)}` : ""}{item.source === "google-drive" ? " · Google Drive" : item.source === "legacy" ? " · legacy" : ""}</p></div>{item.source !== "legacy" && item.id && <label className="inline-flex flex-shrink-0 items-center gap-1.5 text-[11px] font-bold text-slate-500"><input type="checkbox" checked={Boolean(item.isFreePreview)} disabled={busyAction} onChange={(event) => void setDemoLesson(item, event.target.checked)} className="h-4 w-4 rounded border-slate-300 text-[#1D4ED8] focus:ring-[#1D4ED8]" />Demo Lesson</label>}<div className="flex flex-wrap items-center justify-end gap-1"><button type="button" onClick={() => item.type === "pdf" ? setActivePdf(url) : setPreviewItem(item)} className="rounded-lg p-2 text-slate-400 hover:bg-blue-50 hover:text-blue-600" title="Preview"><Eye className="h-4 w-4" /></button>{item.source !== "legacy" && item.id && <><button type="button" onClick={() => void downloadItem(item)} className="rounded-lg p-2 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600" title="Download"><Download className="h-4 w-4" /></button><button type="button" onClick={() => void copyUrl(item)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700" title="Copy URL"><Copy className="h-4 w-4" /></button><button type="button" onClick={() => void renameItem(item)} className="rounded-lg p-2 text-slate-400 hover:bg-blue-50 hover:text-blue-600" title="Rename"><Pencil className="h-4 w-4" /></button><button type="button" onClick={() => void moveItem(item)} className="rounded-lg p-2 text-slate-400 hover:bg-blue-50 hover:text-blue-600" title="Move to folder"><Folder className="h-4 w-4" /></button><button type="button" onClick={() => { setReplaceItem(item); replaceInputRef.current?.click(); }} className="rounded-lg p-2 text-slate-400 hover:bg-amber-50 hover:text-amber-600" title="Replace file"><RefreshCw className="h-4 w-4" /></button><button type="button" onClick={() => void deleteItem(item)} className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600" title="Delete"><Trash2 className="h-4 w-4" /></button></>}</div></div></div>; })}</div>}</div>
        </section>
      </div>

      <input ref={replaceInputRef} type="file" accept="video/*,application/pdf,image/*" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void replaceFile(file); }} />

      {previewItem?.type === "video" && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4"><div className="w-full max-w-4xl rounded-3xl bg-white p-4 shadow-2xl"><div className="mb-3 flex items-center justify-between gap-3"><h2 className="truncate text-sm font-bold text-slate-900">{previewItem.title}</h2><button type="button" onClick={() => setPreviewItem(null)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button></div><VideoPlayer src={previewItem.url || previewItem.videoUrl || ""} poster={previewItem.thumbnail} /></div></div>}
      {previewItem?.type === "image" && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4"><div className="w-full max-w-4xl rounded-3xl bg-white p-4 shadow-2xl"><div className="mb-3 flex items-center justify-between gap-3"><h2 className="truncate text-sm font-bold text-slate-900">{previewItem.title}</h2><button type="button" onClick={() => setPreviewItem(null)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button></div><Image src={itemUrl(previewItem)} alt={previewItem.title} width={1600} height={1000} unoptimized className="max-h-[75vh] w-full object-contain" /></div></div>}
      {activePdf && <PdfViewerModal isOpen={!!activePdf} onClose={() => setActivePdf(null)} pdfUrl={activePdf} title="Course PDF preview" />}
    </div>
  );
}
