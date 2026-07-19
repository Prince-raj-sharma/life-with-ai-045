"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Course, Category } from "@/lib/types";
import CourseCard from "@/components/shared/CourseCard";
import { Search, Filter, BookOpen } from "lucide-react";

export default function CoursesPage() {
  const [selectedCat, setSelectedCat] = useState("all");
  const [selectedLevel, setSelectedLevel] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: courses, isLoading: coursesLoading } = useQuery({
    queryKey: ["courses-catalog", selectedCat, selectedLevel, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedCat !== "all") params.append("category", selectedCat);
      if (selectedLevel !== "all") params.append("level", selectedLevel);
      if (searchQuery.trim() !== "") params.append("search", searchQuery);

      const res = await fetch(`/api/courses?${params.toString()}`);
      const json = await res.json();
      return (json.courses || []) as Course[];
    },
  });

  const { data: categories } = useQuery({
    queryKey: ["categories-catalog"],
    queryFn: async () => {
      const res = await fetch("/api/categories");
      const json = await res.json();
      return (json.categories || []) as Category[];
    },
  });

  const allCourses = courses || [];
  const allCats = categories || [];

  return (
    <div className="bg-white min-h-screen pb-24">
      {/* Page Header */}
      <div className="bg-[#F8FAFC] py-16 border-b border-slate-200">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Academic Course Catalog</h1>
          <p className="text-slate-600 text-base max-w-2xl mx-auto">
            Browse our verified university courses in software engineering, programming, and artificial intelligence.
          </p>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Search Input */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by course title or keyword..."
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:border-[#1D4ED8] outline-none text-sm font-medium bg-slate-50 focus:bg-white transition-all"
            />
          </div>

          {/* Filters */}
          <div className="flex items-center space-x-3 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
            <div className="flex items-center space-x-2 text-xs font-bold uppercase text-slate-500 flex-shrink-0">
              <Filter className="w-3.5 h-3.5" />
              <span>Filters:</span>
            </div>

            <select
              value={selectedCat}
              onChange={(e) => setSelectedCat(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold bg-slate-50 text-slate-800 outline-none focus:border-[#1D4ED8] transition-colors cursor-pointer"
            >
              <option value="all">All Categories</option>
              {allCats.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            <select
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold bg-slate-50 text-slate-800 outline-none focus:border-[#1D4ED8] transition-colors cursor-pointer"
            >
              <option value="all">All Levels</option>
              <option value="Beginner">Beginner</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Advanced">Advanced</option>
            </select>
          </div>
        </div>
      </div>

      {/* Courses Grid */}
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 pt-4">
        {coursesLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-96 rounded-2xl bg-slate-100 animate-pulse" />
            ))}
          </div>
        ) : allCourses.length === 0 ? (
          <div className="bg-[#FAFAFA] rounded-3xl p-16 border border-slate-200 text-center max-w-xl mx-auto space-y-4 my-8">
            <div className="w-16 h-16 bg-blue-50 text-[#1D4ED8] rounded-2xl flex items-center justify-center mx-auto">
              <BookOpen className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-bold text-slate-800">No Courses Available</h3>
            <p className="text-slate-500 text-sm">
              We couldn&apos;t find any published academic courses matching your selected search parameters. Try clearing your filters or check back later.
            </p>
            {(selectedCat !== "all" || selectedLevel !== "all" || searchQuery !== "") && (
              <button
                onClick={() => {
                  setSelectedCat("all");
                  setSelectedLevel("all");
                  setSearchQuery("");
                }}
                className="px-4 py-2 rounded-xl bg-[#1D4ED8] text-white text-xs font-bold"
              >
                Reset Filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {allCourses.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
