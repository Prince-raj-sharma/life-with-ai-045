"use client";

import React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/providers/AuthProvider";
import { Course } from "@/lib/types";
import CourseCard from "@/components/shared/CourseCard";
import { Heart } from "lucide-react";

export default function WishlistPage() {
  const { profile } = useAuth();
  const wishIds = profile?.wishlist || [];

  const { data: courses, isLoading } = useQuery({
    queryKey: ["dashboard-wishlist-courses"],
    queryFn: async () => {
      const res = await fetch("/api/courses?all=true");
      const json = await res.json();
      return (json.courses || []) as Course[];
    },
  });

  const wishlistedCourses = courses?.filter((c) => wishIds.includes(c.id || "")) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3 pb-4 border-b border-slate-200">
        <div className="p-3 bg-red-50 text-red-600 rounded-xl">
          <Heart className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Wishlist</h1>
          <p className="text-xs text-slate-500">Saved educational programs for future purchase</p>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <div key={i} className="h-80 bg-slate-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : wishlistedCourses.length === 0 ? (
        <div className="bg-white rounded-3xl p-16 border border-slate-200 text-center space-y-4 my-6">
          <Heart className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-xl font-bold text-slate-800">Your Wishlist is Empty</h3>
          <p className="text-sm text-slate-500 max-w-sm mx-auto">
            You haven&apos;t bookmarked any courses in your wishlist yet. Browse our catalog to bookmark programs.
          </p>
          <div className="pt-2">
            <Link
              href="/courses"
              className="px-6 py-2.5 rounded-xl bg-[#1D4ED8] text-white text-xs font-bold inline-block"
            >
              Explore Course Catalog
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {wishlistedCourses.map((c) => (
            <CourseCard key={c.id} course={c} />
          ))}
        </div>
      )}
    </div>
  );
}
