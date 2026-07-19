"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/providers/ToastProvider";
import { Announcement } from "@/types";
import { formatDate } from "@/utils";
import { Megaphone, Send } from "lucide-react";

export default function AdminAnnouncementsPage() {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { data: anns, refetch, isLoading } = useQuery({
    queryKey: ["admin-anns-all"],
    queryFn: async () => {
      const res = await fetch("/api/announcements");
      const json = await res.json();
      return (json.announcements || []) as Announcement[];
    },
  });

  const announcements = anns || [];

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !content) return;
    setSubmitting(true);
    try {
      await fetch("/api/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content, target: "all", createdBy: "Super Admin" }),
      });
      setTitle("");
      setContent("");
      refetch();
      toast({ title: "Broadcasted", message: "Announcement sent to all students", type: "success" });
    } catch {
      toast({ message: "Failed", type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-5xl">
      <div className="pb-4 border-b border-slate-200">
        <h1 className="text-3xl font-extrabold text-slate-900">Broadcast Announcements</h1>
        <p className="text-sm text-slate-600">Publish urgent global alerts to student dashboards</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <form onSubmit={handlePost} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4 md:col-span-1 h-max">
          <h3 className="font-bold text-base flex items-center">
            <Megaphone className="w-4 h-4 mr-2 text-[#1D4ED8]" /> Broadcast Alert
          </h3>
          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Alert Headline</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="e.g. Server Maintenance Notice" className="w-full p-3 rounded-xl border border-slate-300 text-sm font-semibold" />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Announcement Body</label>
            <textarea value={content} onChange={(e) => setContent(e.target.value)} required rows={5} placeholder="Full message details..." className="w-full p-3 rounded-xl border border-slate-300 text-sm" />
          </div>
          <button type="submit" disabled={submitting} className="w-full py-3 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] text-white font-bold text-xs shadow flex items-center justify-center space-x-1.5">
            <Send className="w-3.5 h-3.5" />
            <span>{submitting ? "Broadcasting..." : "Send Announcement"}</span>
          </button>
        </form>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm md:col-span-2 space-y-4">
          <h3 className="font-bold text-lg">Broadcast History ({announcements.length})</h3>
          {isLoading ? (
            <div className="h-48 bg-slate-100 animate-pulse rounded-2xl" />
          ) : announcements.length === 0 ? (
            <p className="text-sm text-slate-400 italic">No global announcements posted.</p>
          ) : (
            <div className="space-y-3">
              {announcements.map((a) => (
                <div key={a.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-1">
                  <div className="flex justify-between items-center">
                    <h4 className="font-bold text-sm text-slate-900">{a.title}</h4>
                    <span className="text-[10px] text-slate-400">{formatDate(a.createdAt)}</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">{a.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
