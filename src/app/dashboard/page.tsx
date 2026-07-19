/* eslint-disable @next/next/no-img-element */
"use client";

import React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { Course } from "@/types";
import { BookOpen, Play, CheckCircle2, Award } from "lucide-react";

export default function StudentDashboardPage() {
  const { profile } = useAuth();
  const enrolledIds = profile?.purchasedCourses || [];

  const { data: courses, isLoading } = useQuery({
    queryKey: ["dashboard-my-courses"],
    queryFn: async () => {
      const res = await fetch("/api/courses?all=true");
      const json = await res.json();
      return (json.courses || []) as Course[];
    },
  });

  const enrolledCourses = courses?.filter((c) => enrolledIds.includes(c.id || "") || profile?.role === "admin") || [];

  return (
    <div className="space-y-8">
      <div className="bg-slate-900 rounded-3xl p-8 sm:p-10 text-white relative shadow-xl overflow-hidden flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="space-y-3 z-10">
          <span className="px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-[11px] font-bold uppercase tracking-wider">
            Academic Status: Active
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Welcome Back, {profile?.displayName || "Scholar"}!
          </h1>
          <p className="text-slate-300 text-sm max-w-xl">
            You have unlocked <span className="text-blue-400 font-bold">{enrolledCourses.length}</span> professional academic courses. Continue your progression towards engineering excellence.
          </p>
        </div>

        <div className="flex sm:flex-col gap-4 z-10 w-full sm:w-auto">
          <Link
            href="/courses"
            className="px-6 py-3.5 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] text-white font-bold text-xs text-center shadow transition-all whitespace-nowrap"
          >
            Explore More Courses
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <div className="p-3.5 bg-blue-50 text-[#1D4ED8] rounded-2xl">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase">Enrolled Programs</p>
            <h4 className="text-2xl font-extrabold text-slate-900">{enrolledCourses.length}</h4>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <div className="p-3.5 bg-emerald-50 text-emerald-600 rounded-2xl">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase">Learning Access</p>
            <h4 className="text-2xl font-extrabold text-slate-900">Lifetime</h4>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <div className="p-3.5 bg-amber-50 text-amber-600 rounded-2xl">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase">Certifications</p>
            <h4 className="text-2xl font-extrabold text-slate-900">Available</h4>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">My Classroom Enrolled Courses</h2>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2].map((i) => (
              <div key={i} className="h-80 bg-slate-100 rounded-3xl animate-pulse" />
            ))}
          </div>
        ) : enrolledCourses.length === 0 ? (
          <div className="bg-white rounded-3xl p-16 border border-slate-200 text-center space-y-4">
            <div className="w-16 h-16 bg-blue-50 text-[#1D4ED8] rounded-2xl flex items-center justify-center mx-auto">
              <BookOpen className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-bold text-slate-800">No Enrolled Courses</h3>
            <p className="text-slate-500 text-sm max-w-md mx-auto">
              You haven&apos;t enrolled in any educational programs yet. Browse our commercial catalog to start learning.
            </p>
            <div className="pt-2">
              <Link
                href="/courses"
                className="px-6 py-3 rounded-xl bg-[#1D4ED8] text-white font-bold text-xs"
              >
                Browse Course Catalog
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {enrolledCourses.map((course) => (
              <div key={course.id} className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between group">
                <div className="relative aspect-video bg-slate-100">
                  {course.thumbnailUrl && (
                    <img src={course.thumbnailUrl} alt={course.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent flex items-end p-6">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-blue-300 bg-blue-900/60 backdrop-blur-md px-2 py-0.5 rounded">
                        {course.categoryName}
                      </span>
                      <h3 className="text-xl font-bold text-white mt-1 line-clamp-1">{course.title}</h3>
                    </div>
                  </div>
                </div>

                <div className="p-6 space-y-6 flex-1 flex flex-col justify-between">
                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                    {course.subtitle || course.description}
                  </p>

                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full flex items-center">
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Unlocked Access
                    </span>

                    <Link
                      href={`/dashboard/learn/${course.id}`}
                      className="px-5 py-2.5 rounded-xl bg-[#1D4ED8] hover:bg-blue-800 text-white font-bold text-xs flex items-center space-x-1.5 shadow transition-all"
                    >
                      <Play className="w-3.5 h-3.5 fill-white" />
                      <span>Continue Learning</span>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
