"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/providers/ToastProvider";
import { Review } from "@/types";
import { formatDate } from "@/utils";
import { Trash2 } from "lucide-react";

export default function AdminReviewsPage() {
  const { toast } = useToast();

  const { data: revs, refetch, isLoading } = useQuery({
    queryKey: ["admin-reviews-all"],
    queryFn: async () => {
      const res = await fetch("/api/reviews?all=true");
      const json = await res.json();
      return (json.reviews || []) as Review[];
    },
  });

  const reviews = revs || [];

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this student review?")) return;
    try {
      await fetch(`/api/reviews?id=${id}`, { method: "DELETE" });
      refetch();
      toast({ message: "Review deleted", type: "success" });
    } catch {
      toast({ message: "Error", type: "error" });
    }
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-4xl">
      <div className="pb-4 border-b border-slate-200">
        <h1 className="text-3xl font-extrabold text-slate-900">Student Evaluations Manager</h1>
        <p className="text-sm text-slate-600">Moderate course feedback</p>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm">
        {isLoading ? (
          <div className="h-48 bg-slate-100 animate-pulse rounded-2xl" />
        ) : reviews.length === 0 ? (
          <p className="text-center py-12 text-slate-400 italic text-sm">No reviews submitted by scholars.</p>
        ) : (
          <div className="divide-y divide-slate-100 space-y-4">
            {reviews.map((r) => (
              <div key={r.id} className="pt-4 flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-sm text-slate-900">{r.userName}</span>
                    <span className="text-xs text-amber-500 font-bold">★ {r.rating}/5</span>
                    <span className="text-[10px] text-slate-400">• {formatDate(r.createdAt)}</span>
                  </div>
                  <p className="text-sm text-slate-600">&quot;{r.comment}&quot;</p>
                </div>
                <button onClick={() => handleDelete(r.id!)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
