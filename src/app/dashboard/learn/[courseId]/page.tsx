"use client";

import React, { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/providers/ToastProvider";
import { Course, CourseContentResponse, CourseItem, CourseProgress } from "@/types";
import VideoPlayer from "@/components/shared/VideoPlayer";
import PdfViewerModal from "@/components/shared/PdfViewerModal";
import { CheckCircle2, Circle, FileText, FileVideo, Folder, Image as ImageIcon, Award, ArrowLeft, ChevronDown, ChevronRight } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export default function ClassroomPage() {
  const params = useParams();
  const courseId = params?.courseId as string;
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [activePdf, setActivePdf] = useState<string | null>(null);
  const [localCompletedIds, setLocalCompletedIds] = useState<string[]>([]);
  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>({});
  const [generatingCert, setGeneratingCert] = useState(false);

  const hasAccess = profile?.purchasedCourses?.includes(courseId) || profile?.role === "admin";

  const { data: course, isLoading: cLoading } = useQuery({
    queryKey: ["classroom-course", courseId],
    queryFn: async () => {
      const res = await fetch(`/api/courses/${courseId}`);
      if (!res.ok) throw new Error("Course not found");
      return (await res.json()).course as Course;
    },
    enabled: !!courseId,
  });

  const { data: content, isLoading: lLoading } = useQuery({
    queryKey: ["classroom-content", courseId, user?.uid, hasAccess],
    queryFn: async () => {
      const token = await user?.getIdToken();
      const res = await fetch(`/api/course-content?courseId=${encodeURIComponent(courseId)}`, token ? { headers: { Authorization: `Bearer ${token}` } } : undefined);
      if (!res.ok) throw new Error("Unable to load course content");
      return (await res.json()) as CourseContentResponse;
    },
    enabled: !!courseId,
  });

  const { data: progressData } = useQuery({
    queryKey: ["classroom-progress", user?.uid, courseId],
    queryFn: async () => {
      if (!user) return null;
      const res = await fetch(`/api/progress?userId=${user.uid}&courseId=${courseId}`);
      const json = await res.json();
      return json.progress as CourseProgress;
    },
    enabled: !!user && !!courseId,
  });

  const folders = useMemo(() => content?.folders || [], [content?.folders]);
  const contentItems = content?.items;
  const items = useMemo(() => contentItems || [], [contentItems]);
  const videoItems = useMemo(() => items.filter((item) => item.type === "video"), [items]);
  const childFolders = useMemo(() => {
    const result = new Map<string, typeof folders>();
    folders.forEach((folder) => {
      const parentId = folder.parentFolderId || folder.parentId || "";
      result.set(parentId, [...(result.get(parentId) || []), folder].sort((a, b) => a.order - b.order || a.name.localeCompare(b.name)));
    });
    return result;
  }, [folders]);
  const completedItemIds = useMemo(() => Array.from(new Set([...(progressData?.completedLessonIds || []), ...localCompletedIds])), [progressData, localCompletedIds]);
  const activeItem = useMemo(() => {
    if (selectedItemId) return items.find((item) => item.id === selectedItemId) || videoItems[0] || null;
    if (progressData?.lastAccessedLessonId) return items.find((item) => item.id === progressData.lastAccessedLessonId) || videoItems[0] || null;
    return videoItems[0] || items[0] || null;
  }, [items, selectedItemId, progressData, videoItems]);

  if (cLoading || lLoading || !course) {
    return <div className="w-full min-w-0 animate-pulse space-y-8"><div className="h-12 w-1/3 rounded-xl bg-slate-200" /><div className="aspect-video w-full rounded-3xl bg-slate-200" /><div className="h-64 w-full rounded-3xl bg-slate-200" /></div>;
  }

  if (!hasAccess && items.length === 0) {
    return (
      <div className="mx-auto my-12 w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-600 sm:p-16">This curriculum will be available after purchase.</div>
    );
  }

  const handleItemSelect = (item: CourseItem) => {
    setSelectedItemId(item.id || null);
    if (item.type === "pdf") setActivePdf(item.url || item.pdfUrl || null);
  };

  const handleItemCheck = async (itemId: string) => {
    if (!user) return;
    const isCompleted = completedItemIds.includes(itemId);
    setLocalCompletedIds((previous) => isCompleted ? previous.filter((id) => id !== itemId) : [...previous, itemId]);
    try {
      await fetch("/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.uid, courseId, lessonId: itemId, isCompleted: !isCompleted }),
      });
      toast({ message: isCompleted ? "Marked incomplete" : "File completed! Progress saved.", type: "success" });
    } catch {
      toast({ message: "Progress updated locally", type: "info" });
    }
  };

  const handleIssueCert = async () => {
    if (!user || !profile) return;
    setGeneratingCert(true);
    try {
      const res = await fetch("/api/certificates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.uid, userName: profile.displayName || user.email?.split("@")[0], courseId, courseTitle: course.title }),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: "Certificate Earned! 🏆", message: "Your certificate is ready!", type: "success" });
        router.push("/dashboard/certificates");
      }
    } catch {
      toast({ message: "Could not generate certificate", type: "error" });
    } finally {
      setGeneratingCert(false);
    }
  };

  const allCompleted = hasAccess && videoItems.length > 0 && videoItems.every((item) => item.id && completedItemIds.includes(item.id));

  return (
    <div className="flex w-full min-w-0 flex-col space-y-8 overflow-hidden">
      <div className="flex flex-col justify-between gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-center">
        <Link href="/dashboard" className="inline-flex w-max items-center text-xs font-bold text-slate-500 transition-colors hover:text-[#1D4ED8]"><ArrowLeft className="mr-1.5 h-4 w-4" />Return to Enrolled Courses</Link>
        <span className="w-max rounded-full bg-blue-100 px-3 py-1 text-xs font-extrabold uppercase text-[#1D4ED8]">Cloudflare R2 Classroom</span>
      </div>

      <div className="space-y-2"><span className="block truncate text-xs font-bold uppercase tracking-wider text-[#1D4ED8]">{activeItem ? folders.find((folder) => folder.id === activeItem.folderId)?.name : "Course files"}</span><h1 className="break-words text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">{activeItem?.title || course.title}</h1></div>

      <div className="w-full min-w-0 overflow-hidden rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        {activeItem?.type === "video" && (activeItem.url || activeItem.videoUrl) ? (
          <div className="relative aspect-video min-w-0 overflow-hidden rounded-2xl bg-slate-950"><VideoPlayer key={activeItem.url || activeItem.videoUrl} src={activeItem.url || activeItem.videoUrl || ""} poster={activeItem.thumbnail || course.bannerUrl || course.thumbnailUrl} autoPlay onEnded={() => { if (activeItem.id && !completedItemIds.includes(activeItem.id)) void handleItemCheck(activeItem.id); }} /></div>
        ) : activeItem?.type === "image" && (activeItem.url || activeItem.imageUrl) ? (
          <div className="flex min-h-64 items-center justify-center rounded-2xl bg-slate-950 p-4"><Image src={activeItem.url || activeItem.imageUrl || ""} alt={activeItem.title} width={1600} height={1000} unoptimized className="max-h-[70vh] max-w-full object-contain" /></div>
        ) : (
          <div className="flex aspect-video items-center justify-center rounded-2xl bg-slate-950 p-6 text-center text-sm text-slate-400">{activeItem?.type === "pdf" ? "PDF opened in the inline viewer below." : "Select a video, PDF or image from the course files."}</div>
        )}
      </div>

      <div className="w-full min-w-0 space-y-6 overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col justify-between gap-4 border-b border-slate-100 pb-6 sm:flex-row sm:items-center">
          <div><h3 className="text-base font-bold text-slate-900">Current file</h3><p className="text-xs text-slate-500">Stream videos and open PDF or image study material inline</p></div>
          <div className="flex flex-wrap gap-3">
            {activeItem?.type === "pdf" && (activeItem.url || activeItem.pdfUrl) && <button onClick={() => setActivePdf(activeItem.url || activeItem.pdfUrl || null)} className="inline-flex items-center rounded-xl bg-blue-50 px-4 py-2.5 text-xs font-bold text-[#1D4ED8] hover:bg-blue-100"><FileText className="mr-2 h-4 w-4" />View PDF</button>}
            {activeItem?.type === "video" && activeItem.id && <button onClick={() => void handleItemCheck(activeItem.id!)} className={`inline-flex items-center rounded-xl px-4 py-2.5 text-xs font-bold shadow-sm transition ${completedItemIds.includes(activeItem.id) ? "bg-emerald-600 text-white hover:bg-emerald-700" : "bg-slate-100 text-slate-800 hover:bg-slate-200"}`}><CheckCircle2 className="mr-2 h-4 w-4" />{completedItemIds.includes(activeItem.id) ? "Video Completed" : "Mark as Complete"}</button>}
          </div>
        </div>
        <p className="whitespace-pre-line text-sm leading-relaxed text-slate-600">{activeItem?.description || "Select any file from the Google Drive-style course structure to continue learning."}</p>
      </div>

      <div className="w-full min-w-0 space-y-6 overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="space-y-3 border-b border-slate-100 pb-4">
          <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center"><div><h3 className="text-xl font-bold tracking-tight text-slate-900">Course files</h3><p className="text-xs text-slate-500">{hasAccess ? "Browse folders like Google Drive" : "Preview lessons"}</p></div>{hasAccess && <span className="w-max rounded-full bg-blue-50 px-3 py-1 text-xs font-extrabold text-[#1D4ED8]">{completedItemIds.filter((id) => videoItems.some((item) => item.id === id)).length} / {videoItems.length} Videos Completed</span>}</div>
          {hasAccess && <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-[#1D4ED8] transition-all duration-500" style={{ width: `${videoItems.length ? (completedItemIds.filter((id) => videoItems.some((item) => item.id === id)).length / videoItems.length) * 100 : 0}%` }} /></div>}
        </div>

        {allCompleted && <div className="flex flex-col items-center justify-between gap-4 rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-6 sm:flex-row"><div className="flex items-center gap-4"><div className="flex-shrink-0 rounded-xl bg-amber-100 p-3 text-[#D97706]"><Award className="h-8 w-8" /></div><div><h4 className="text-base font-extrabold text-slate-900">Congratulations! 🎉</h4><p className="text-xs text-slate-600 sm:text-sm">You have completed all course videos.</p></div></div><button onClick={handleIssueCert} disabled={generatingCert} className="w-full rounded-xl bg-[#F59E0B] px-6 py-3 text-xs font-extrabold text-white shadow hover:bg-[#D97706] disabled:opacity-50 sm:w-auto">{generatingCert ? "Verifying..." : "Claim Official Certificate"}</button></div>}

        <div className="space-y-3">
          {folders.length === 0 ? <div className="space-y-1">{items.map((item) => <button type="button" key={item.id} onClick={() => handleItemSelect(item)} className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition ${activeItem?.id === item.id ? "bg-blue-50" : "hover:bg-slate-50"}`}><div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${item.type === "video" ? "bg-blue-50 text-blue-600" : item.type === "image" ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"}`}>{item.type === "video" ? <FileVideo className="h-4 w-4" /> : item.type === "image" ? <ImageIcon className="h-4 w-4" /> : <FileText className="h-4 w-4" />}</div><span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-800">{item.title}</span></button>)}</div> : (childFolders.get("") || []).map((folder) => {
            const renderFolder = (currentFolder: typeof folder, depth = 0): React.ReactNode => {
              const folderItems = items.filter((item) => item.folderId === currentFolder.id).sort((a, b) => a.order - b.order);
              const children = childFolders.get(currentFolder.id || "") || [];
              const isOpen = openFolders[currentFolder.id || ""] ?? true;
              return <div key={currentFolder.id} className="overflow-hidden rounded-2xl border border-slate-200" style={{ marginLeft: depth * 12 }}><button type="button" onClick={() => setOpenFolders((current) => ({ ...current, [currentFolder.id || ""]: !isOpen }))} className="flex w-full items-center gap-2 bg-slate-50 px-4 py-3 text-left hover:bg-slate-100"><span className="text-slate-500">{isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</span><Folder className="h-4 w-4 fill-blue-100 text-[#1D4ED8]" /><span className="text-sm font-bold text-slate-900">{currentFolder.name}</span><span className="ml-auto text-[11px] font-semibold text-slate-400">{folderItems.length} files{children.length ? ` · ${children.length} folders` : ""}</span></button>{isOpen && <div className="divide-y divide-slate-100">{folderItems.map((item) => { const isActive = activeItem?.id === item.id; const isCompleted = item.id ? completedItemIds.includes(item.id) : false; const isImage = item.type === "image" || item.mimeType?.startsWith("image/"); return <button type="button" key={item.id} onClick={() => handleItemSelect(item)} className={`flex w-full items-center gap-3 px-4 py-3 text-left transition ${isActive ? "bg-blue-50" : "hover:bg-slate-50"}`}><div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${item.type === "video" ? "bg-blue-50 text-blue-600" : isImage ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"}`}>{item.type === "video" ? <FileVideo className="h-4 w-4" /> : isImage ? <ImageIcon className="h-4 w-4" /> : <FileText className="h-4 w-4" />}</div><span className={`min-w-0 flex-1 truncate text-sm font-semibold ${isActive ? "text-[#1D4ED8]" : "text-slate-800"}`}>{item.title}</span>{item.type === "video" && (isCompleted ? <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-emerald-600" /> : <Circle className="h-4 w-4 flex-shrink-0 text-slate-300" />)}{item.type === "pdf" && <span className="text-[11px] font-bold text-amber-600">PDF</span>}{isImage && <span className="text-[11px] font-bold text-emerald-600">IMAGE</span>}</button>; })}{children.map((child) => renderFolder(child, depth + 1))}</div>}</div>;
            };
            return renderFolder(folder);
          })}
        </div>
      </div>

      {activePdf && <PdfViewerModal isOpen={!!activePdf} onClose={() => setActivePdf(null)} pdfUrl={activePdf} title={activeItem?.title || `${course.title} PDF`} />}
    </div>
  );
}
