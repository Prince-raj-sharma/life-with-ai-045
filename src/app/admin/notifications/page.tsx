"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/providers/ToastProvider";
import { Notification } from "@/types";
import { formatDate } from "@/utils";
import { Bell, Send } from "lucide-react";

export default function AdminNotificationsPage() {
  const { toast } = useToast();
  const [targetId, setTargetId] = useState("all");
  const [title, setTitle] = useState("");
  const [msg, setMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { data: notifs, refetch, isLoading } = useQuery({
    queryKey: ["admin-notifs-all"],
    queryFn: async () => {
      const res = await fetch("/api/notifications?userId=all");
      const json = await res.json();
      return (json.notifications || []) as Notification[];
    },
  });

  const notifications = notifs || [];

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !msg) return;
    setSubmitting(true);
    try {
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: targetId, title, message: msg, type: "system" }),
      });
      setTitle("");
      setMsg("");
      refetch();
      toast({ title: "Sent", message: "System notification dispatched", type: "success" });
    } catch {
      toast({ message: "Error", type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-5xl">
      <div className="pb-4 border-b border-slate-200">
        <h1 className="text-3xl font-extrabold text-slate-900">Push Notifications Dispatcher</h1>
        <p className="text-sm text-slate-600">Send direct system notifications to students</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <form onSubmit={handleSend} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4 md:col-span-1 h-max">
          <h3 className="font-bold text-base flex items-center">
            <Bell className="w-4 h-4 mr-2 text-[#1D4ED8]" /> Send Notification
          </h3>
          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Target Scholar ID</label>
            <input value={targetId} onChange={(e) => setTargetId(e.target.value)} required placeholder="e.g. 'all' or specific User UID" className="w-full p-3 rounded-xl border border-slate-300 text-sm font-semibold" />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="e.g. New Module Unlocked" className="w-full p-3 rounded-xl border border-slate-300 text-sm font-semibold" />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Message</label>
            <textarea value={msg} onChange={(e) => setMsg(e.target.value)} required rows={4} placeholder="Notification body" className="w-full p-3 rounded-xl border border-slate-300 text-sm" />
          </div>
          <button type="submit" disabled={submitting} className="w-full py-3 rounded-xl bg-[#1D4ED8] hover:bg-blue-800 text-white font-bold text-xs shadow flex items-center justify-center space-x-1.5">
            <Send className="w-3.5 h-3.5" />
            <span>{submitting ? "Sending..." : "Dispatch Notification"}</span>
          </button>
        </form>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm md:col-span-2 space-y-4">
          <h3 className="font-bold text-lg">Dispatched Notifications Log ({notifications.length})</h3>
          {isLoading ? (
            <div className="h-48 bg-slate-100 animate-pulse rounded-2xl" />
          ) : notifications.length === 0 ? (
            <p className="text-sm text-slate-400 italic">No notifications recorded.</p>
          ) : (
            <div className="space-y-3">
              {notifications.map((n) => (
                <div key={n.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50 flex justify-between items-center">
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">{n.title}</h4>
                    <p className="text-xs text-slate-600">{n.message}</p>
                  </div>
                  <span className="text-[10px] text-slate-400">{formatDate(n.createdAt)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
