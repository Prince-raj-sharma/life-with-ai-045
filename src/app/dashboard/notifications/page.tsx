"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/providers/AuthProvider";
import { Notification } from "@/types";
import { formatDate } from "@/utils";
import { Bell, Megaphone } from "lucide-react";

export default function StudentNotificationsPage() {
  const { user } = useAuth();

  const { data: notifs, refetch, isLoading } = useQuery({
    queryKey: ["dashboard-my-notifs", user?.uid],
    queryFn: async () => {
      if (!user) return [];
      const res = await fetch(`/api/notifications?userId=${user.uid}`);
      const json = await res.json();
      return (json.notifications || []) as Notification[];
    },
    enabled: !!user,
  });

  const notifications = notifs || [];

  const markRead = async (id: string) => {
    try {
      await fetch("/api/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isRead: true }),
      });
      refetch();
    } catch {}
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center space-x-3 pb-4 border-b border-slate-200">
        <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
          <Bell className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Platform Notifications & Alerts</h1>
          <p className="text-xs text-slate-500">Urgent announcements, course updates, and enrollment logs</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />)}
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-12 space-y-3">
            <Bell className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="font-bold text-lg text-slate-700">No Notifications</h3>
            <p className="text-xs text-slate-400">You&apos;re completely up to date.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 space-y-4">
            {notifications.map((n) => (
              <div key={n.id} onClick={() => markRead(n.id!)} className={`pt-4 flex items-start justify-between p-4 rounded-2xl transition-colors cursor-pointer ${n.isRead ? "bg-white opacity-70" : "bg-blue-50/50 border border-blue-100"}`}>
                <div className="flex items-start space-x-3.5">
                  <div className={`p-2.5 rounded-xl ${n.type === "announcement" ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-[#1D4ED8]"}`}>
                    {n.type === "announcement" ? <Megaphone className="w-5 h-5" /> : <Bell className="w-5 h-5" />}
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-sm text-slate-900">{n.title}</h4>
                    <p className="text-xs text-slate-600 leading-relaxed">{n.message}</p>
                    <span className="text-[10px] text-slate-400 block pt-1">{formatDate(n.createdAt)}</span>
                  </div>
                </div>
                {!n.isRead && <span className="w-2.5 h-2.5 rounded-full bg-[#1D4ED8] mt-2 flex-shrink-0" />}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
