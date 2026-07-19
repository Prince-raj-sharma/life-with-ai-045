/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Course } from "@/types";
import { formatCurrency } from "@/utils";
import { useToast } from "@/providers/ToastProvider";
import { Plus, Edit, Trash2, Layers, BookOpen, CheckCircle2, AlertCircle } from "lucide-react";

export default function AdminCoursesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: courses, isLoading, refetch } = useQuery({
    queryKey: ["admin-courses-list"],
    queryFn: async () => {
      const res = await fetch("/api/courses?all=true");
      const json = await res.json();
      return (json.courses || []) as Course[];
    },
  });

  const allCourses = courses || [];

  const handlePublishToggle = async (course: Course) => {
    if (!course.id) return;
    const newStatus = !course.isPublished;
    try {
      await fetch(`/api/courses/${course.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublished: newStatus }),
      });
      await refetch();
      queryClient.invalidateQueries({ queryKey: ["admin-courses-list"] });
      queryClient.invalidateQueries({ queryKey: ["courses-home"] });
      queryClient.invalidateQueries({ queryKey: ["courses-catalog"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-my-courses"] });
      toast({
        title: newStatus ? "Course Published!" : "Course Unpublished",
        message: `Status updated to ${newStatus ? "Public" : "Draft"}`,
        type: "success",
      });
    } catch {
      toast({ message: "Could not update status", type: "error" });
    }
  };

  const handleDeleteConfirm = async (id: string) => {
    if (!confirm("Are you certain you want to permanently delete this course and all associated lessons?")) {
      return;
    }
    setDeletingId(id);
    try {
      await fetch(`/api/courses/${id}`, { method: "DELETE" });
      await refetch();
      queryClient.invalidateQueries({ queryKey: ["admin-courses-list"] });
      queryClient.invalidateQueries({ queryKey: ["courses-home"] });
      queryClient.invalidateQueries({ queryKey: ["courses-catalog"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-my-courses"] });
      toast({ title: "Deleted", message: "Course removed instantly", type: "success" });
    } catch {
      toast({ message: "Deletion failed", type: "error" });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in w-full min-w-0 overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight truncate">Course Repository</h1>
          <p className="text-xs sm:text-sm text-slate-600 truncate">Create, edit, publish, and delete academic curriculum</p>
        </div>

        <Link
          href="/admin/courses/new"
          className="px-6 py-3 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] text-white font-bold text-xs inline-flex items-center space-x-2 shadow transition-all w-max flex-shrink-0"
        >
          <Plus className="w-4 h-4 flex-shrink-0 self-center" />
          <span>Add New Course</span>
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-slate-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : allCourses.length === 0 ? (
        <div className="bg-white rounded-3xl p-16 border border-slate-200 text-center space-y-4">
          <BookOpen className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-2xl font-bold text-slate-800">No Courses Uploaded</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            The database currently contains zero courses. Click &quot;Add New Course&quot; above to upload your inaugural program.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm w-full min-w-0">
          <div className="overflow-x-auto w-full min-w-0">
            <table className="w-full text-left border-collapse min-w-[650px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold uppercase text-slate-500">
                  <th className="p-4 sm:p-6">Course Title</th>
                  <th className="p-4 sm:p-6">Category</th>
                  <th className="p-4 sm:p-6">Pricing</th>
                  <th className="p-4 sm:p-6">Status</th>
                  <th className="p-4 sm:p-6 text-right">Admin Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm font-medium text-slate-800">
                {allCourses.map((course) => (
                  <tr key={course.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="p-4 sm:p-6 max-w-[250px]">
                      <div className="flex items-center space-x-4 min-w-0">
                        <div className="w-16 h-10 rounded-lg bg-slate-100 overflow-hidden flex-shrink-0 border border-slate-200">
                          {course.thumbnailUrl ? (
                            <img src={course.thumbnailUrl} alt={course.title} className="w-full h-full object-cover" />
                          ) : (
                            <BookOpen className="w-5 h-5 text-slate-400 m-auto mt-2" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-slate-900 truncate">{course.title}</p>
                          <p className="text-xs text-slate-500 truncate">{course.subtitle || "No subtitle"}</p>
                        </div>
                      </div>
                    </td>

                    <td className="p-4 sm:p-6 whitespace-nowrap">
                      <span className="text-xs font-bold px-2.5 py-1 rounded bg-blue-50 text-[#1D4ED8] uppercase">
                        {course.categoryName}
                      </span>
                    </td>

                    <td className="p-4 sm:p-6 font-bold text-slate-900 whitespace-nowrap">
                      {formatCurrency(course.price)}
                    </td>

                    <td className="p-4 sm:p-6 whitespace-nowrap">
                      <button
                        onClick={() => handlePublishToggle(course)}
                        className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider inline-flex items-center space-x-1 transition-all ${
                          course.isPublished
                            ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                            : "bg-amber-100 text-amber-800 hover:bg-amber-200"
                        }`}
                      >
                        {course.isPublished ? <CheckCircle2 className="w-3.5 h-3.5 mr-1 flex-shrink-0 self-center" /> : <AlertCircle className="w-3.5 h-3.5 mr-1 flex-shrink-0 self-center" />}
                        <span>{course.isPublished ? "Published" : "Draft"}</span>
                      </button>
                    </td>

                    <td className="p-4 sm:p-6 text-right space-x-2 whitespace-nowrap">
                      <Link
                        href={`/admin/courses/${course.id}/lessons`}
                        className="p-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 inline-block transition-colors"
                        title="Manage Syllabus & Video Modules"
                      >
                        <Layers className="w-4 h-4 flex-shrink-0" />
                      </Link>
                      <Link
                        href={`/admin/courses/${course.id}/edit`}
                        className="p-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#1D4ED8] inline-block transition-colors"
                        title="Edit Course Details"
                      >
                        <Edit className="w-4 h-4 flex-shrink-0" />
                      </Link>
                      <button
                        onClick={() => handleDeleteConfirm(course.id!)}
                        disabled={deletingId === course.id}
                        className="p-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 transition-colors disabled:opacity-50"
                        title="Delete Course"
                      >
                        <Trash2 className="w-4 h-4 flex-shrink-0" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
