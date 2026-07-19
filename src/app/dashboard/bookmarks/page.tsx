"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/providers/AuthProvider";
import { Course } from "@/lib/types";
import CourseCard from "@/components/shared/CourseCard";
import { Bookmark } from "lucide-react";

export default function BookmarksPage() {
  const { profile } = useAuth();
  const bmIds = profile?.bookmarks || [];

  const { data: courses, isLoading } = useQuery({
    queryKey: ["dashboard-bookmarks-courses"],
    queryFn: async () => {
      const res = await fetch("/api/courses?all=true");
      const json = await res.json();
      return (json.courses || []) as Course[];
    },
  });

  const bookmarkedCourses = courses?.filter((c) => bmIds.includes(c.id || "")) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3 pb-4 border-b border-slate-200">
        <div className="p-3 bg-blue-50 text-[#1D4ED8] rounded-xl">
          <Bookmark className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Saved Bookmarks</h1>
          <p className="text-xs text-slate-500">Quick links to your reference study paths</p>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <div key={i} className="h-80 bg-slate-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : bookmarkedCourses.length === 0 ? (
        <div className="bg-white rounded-3xl p-16 border border-slate-200 text-center space-y-4 my-6">
          <Bookmark className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-xl font-bold text-slate-800">No Bookmarks Found</h3>
          <p className="text-sm text-slate-500 max-w-sm mx-auto">
            You have no saved course bookmarks.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {bookmarkedCourses.map((c) => (
            <CourseCard key={c.id} course={c} />
          ))}
        </div>
      )}
    </div>
  );
}
