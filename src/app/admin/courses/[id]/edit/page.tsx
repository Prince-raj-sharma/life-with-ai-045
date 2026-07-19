"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/providers/ToastProvider";
import { Course } from "@/types";
import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";

export default function EditCoursePage() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  const { data: course, isLoading } = useQuery({
    queryKey: ["admin-course-edit", id],
    queryFn: async () => {
      const res = await fetch(`/api/courses/${id}`);
      const json = await res.json();
      return json.course as Course;
    },
    enabled: !!id,
  });

  const { register, handleSubmit, reset } = useForm<Course>();

  useEffect(() => {
    if (course) reset(course);
  }, [course, reset]);

  const onSubmit = async (data: Course) => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/courses/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Update failed");
      toast({ title: "Course Updated!", message: "Changes saved to Firestore", type: "success" });
      router.push("/admin/courses");
    } catch {
      toast({ message: "Update failed", type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading || !course) {
    return <div className="h-96 bg-slate-100 animate-pulse rounded-3xl" />;
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-24">
      <div className="flex items-center space-x-4 pb-4 border-b border-slate-200">
        <Link href="/admin/courses" className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-700">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900">Edit Course: {course.title}</h1>
          <p className="text-sm text-slate-600">Update metadata and publication status</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="bg-white p-8 sm:p-12 rounded-3xl border border-slate-200 shadow-sm space-y-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold uppercase text-slate-700 mb-2">Title</label>
            <input {...register("title")} className="w-full p-3.5 rounded-xl border border-slate-300 font-bold text-sm" />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-bold uppercase text-slate-700 mb-2">Subtitle</label>
            <input {...register("subtitle")} className="w-full p-3.5 rounded-xl border border-slate-300 text-sm" />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-bold uppercase text-slate-700 mb-2">Description</label>
            <textarea rows={6} {...register("description")} className="w-full p-4 rounded-xl border border-slate-300 text-sm" />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 mb-2">Price (INR)</label>
            <input type="number" {...register("price")} className="w-full p-3.5 rounded-xl border border-slate-300 font-bold text-sm" />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 mb-2">Discount (%)</label>
            <input type="number" {...register("discount")} className="w-full p-3.5 rounded-xl border border-slate-300 font-bold text-sm" />
          </div>
        </div>

        <div className="pt-6 border-t border-slate-100 flex justify-end">
          <button
            type="submit"
            disabled={submitting}
            className="px-8 py-3.5 rounded-xl bg-[#1D4ED8] hover:bg-blue-800 text-white font-bold text-sm shadow flex items-center space-x-2"
          >
            <Save className="w-4 h-4" />
            <span>{submitting ? "Saving..." : "Update Course"}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
