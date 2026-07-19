"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray, Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useUpload } from "@/hooks/useUpload";
import { useToast } from "@/providers/ToastProvider";
import { Category } from "@/types";
import { slugify } from "@/utils";
import { ArrowLeft, Upload, Plus, Trash2 } from "lucide-react";
import Link from "next/link";

const courseSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  subtitle: z.string().min(5, "Subtitle required"),
  description: z.string().min(10, "Detailed description required"),
  categoryId: z.string().min(1, "Select or enter category"),
  language: z.string().min(2, "Language required"),
  level: z.enum(["Beginner", "Intermediate", "Advanced"]),
  price: z.coerce.number().min(0, "Price must be positive number"),
  discount: z.coerce.number().min(0).max(100),
  isPublished: z.boolean().default(false),
  requirements: z.array(z.object({ value: z.string().min(1) })).min(1, "Add at least 1 requirement"),
  learningOutcomes: z.array(z.object({ value: z.string().min(1) })).min(1, "Add at least 1 outcome"),
});

type CourseFormValues = z.infer<typeof courseSchema>;

export default function AddCoursePage() {
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { uploadFile, uploading: mediaUploading, progress: mediaProgress } = useUpload();

  const [thumbFile, setThumbFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [pdfFiles, setPdfFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [isManualCategory, setIsManualCategory] = useState(false);
  const [manualCategoryInput, setManualCategoryInput] = useState("");

  const { data: categories } = useQuery({
    queryKey: ["admin-cats-new"],
    queryFn: async () => {
      const res = await fetch("/api/categories");
      const json = await res.json();
      return (json.categories || []) as Category[];
    },
  });

  const activeCats = categories || [];

  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<CourseFormValues>({
    resolver: zodResolver(courseSchema) as unknown as Resolver<CourseFormValues>,
    defaultValues: {
      title: "",
      subtitle: "",
      description: "",
      categoryId: activeCats[0]?.id || "general",
      language: "English",
      level: "Beginner",
      price: 4999,
      discount: 20,
      isPublished: true,
      requirements: [{ value: "No prior experience required" }],
      learningOutcomes: [{ value: "Master commercial software engineering systems" }],
    },
  });

  const { fields: reqFields, append: appendReq, remove: removeReq } = useFieldArray({
    control,
    name: "requirements",
  });

  const { fields: outFields, append: appendOut, remove: removeOut } = useFieldArray({
    control,
    name: "learningOutcomes",
  });

  const onSubmit = async (data: CourseFormValues) => {
    setSubmitting(true);
    try {
      toast({ title: "Uploading Media...", message: "Transferring assets to Cloudflare R2", type: "info" });

      let thumbUrl = "";
      let bannerUrl = "";
      let videoUrl = "";
      const uploadedPdfUrls: string[] = [];

      if (thumbFile) thumbUrl = (await uploadFile(thumbFile, "thumbnails")).url;
      if (bannerFile) bannerUrl = (await uploadFile(bannerFile, "banners")).url;
      if (videoFile) videoUrl = (await uploadFile(videoFile, "promo_videos")).url;
      for (const pdf of pdfFiles) {
        const u = await uploadFile(pdf, "course_pdfs");
        uploadedPdfUrls.push(u.url);
      }

      let finalCatId = data.categoryId;
      let finalCatName = activeCats.find((c) => c.id === data.categoryId)?.name || "Technology";

      if (isManualCategory || data.categoryId === "manual_custom_input" || activeCats.length === 0) {
        finalCatName = manualCategoryInput.trim() || "General Technology";
        finalCatId = slugify(finalCatName);
        
        // Save newly entered category to Firestore categories collection
        try {
          await fetch("/api/categories", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: finalCatName, description: "Custom created domain" })
          });
        } catch {}
      }

      const payload = {
        title: data.title,
        subtitle: data.subtitle,
        description: data.description,
        categoryId: finalCatId,
        categoryName: finalCatName,
        language: data.language,
        level: data.level,
        price: data.price,
        discount: data.discount,
        thumbnailUrl: thumbUrl || "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=80",
        bannerUrl: bannerUrl || thumbUrl || "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=1200&auto=format&fit=crop&q=80",
        promoVideoUrl: videoUrl || "",
        pdfUrls: uploadedPdfUrls,
        requirements: data.requirements.map((r) => r.value),
        learningOutcomes: data.learningOutcomes.map((o) => o.value),
        isPublished: data.isPublished,
      };

      const res = await fetch("/api/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("API route creation failed");

      // Invalidate all course and category caches
      queryClient.invalidateQueries({ queryKey: ["admin-courses-list"] });
      queryClient.invalidateQueries({ queryKey: ["courses-home"] });
      queryClient.invalidateQueries({ queryKey: ["courses-catalog"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-my-courses"] });
      queryClient.invalidateQueries({ queryKey: ["admin-cats-manage"] });
      queryClient.invalidateQueries({ queryKey: ["categories-home"] });

      toast({ title: "Course Published! 🎉", message: "Curriculum saved to Firestore successfully", type: "success" });
      router.push("/admin/courses");
    } catch (err: unknown) {
      console.error("Create course error:", err);
      toast({ message: "Could not save course", type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-24 w-full min-w-0 overflow-hidden">
      <div className="flex items-center space-x-4 pb-4 border-b border-slate-200">
        <Link href="/admin/courses" className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-700 flex-shrink-0">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight truncate">Create New Course</h1>
          <p className="text-xs sm:text-sm text-slate-600 truncate">Upload media to Cloudflare R2 and define academic syllabus parameters</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="bg-white p-6 sm:p-12 rounded-3xl border border-slate-200 shadow-sm space-y-10 w-full min-w-0 overflow-hidden">
        
        {/* Basic Info */}
        <div className="space-y-6 w-full min-w-0">
          <h3 className="font-bold text-xl text-slate-900 border-l-4 border-[#1D4ED8] pl-3">1. General Information</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full min-w-0">
            <div className="sm:col-span-2 min-w-0">
              <label className="block text-xs font-bold uppercase text-slate-700 mb-2">Course Title</label>
              <input
                {...register("title")}
                placeholder="e.g. Fullstack Software Engineering Bootcamp"
                className="w-full p-3.5 rounded-xl border border-slate-300 focus:border-[#1D4ED8] outline-none text-sm font-semibold min-w-0"
              />
              {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>}
            </div>

            <div className="sm:col-span-2 min-w-0">
              <label className="block text-xs font-bold uppercase text-slate-700 mb-2">Subtitle Summary</label>
              <input
                {...register("subtitle")}
                placeholder="Short persuasive overview line displayed on catalog cards"
                className="w-full p-3.5 rounded-xl border border-slate-300 focus:border-[#1D4ED8] outline-none text-sm font-medium min-w-0"
              />
              {errors.subtitle && <p className="text-red-500 text-xs mt-1">{errors.subtitle.message}</p>}
            </div>

            <div className="sm:col-span-2 min-w-0">
              <label className="block text-xs font-bold uppercase text-slate-700 mb-2">Comprehensive Academic Description</label>
              <textarea
                rows={6}
                {...register("description")}
                placeholder="Full markdown/text syllabus outline and pedagogical approach..."
                className="w-full p-4 rounded-xl border border-slate-300 focus:border-[#1D4ED8] outline-none text-sm min-w-0"
              />
              {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description.message}</p>}
            </div>

            <div className="min-w-0 sm:col-span-2">
              <label className="block text-xs font-bold uppercase text-slate-700 mb-2">Domain Category Selector</label>
              <select
                {...register("categoryId")}
                onChange={(e) => {
                  const val = e.target.value;
                  setValue("categoryId", val);
                  if (val === "manual_custom_input") {
                    setIsManualCategory(true);
                  } else {
                    setIsManualCategory(false);
                  }
                }}
                className="w-full p-3.5 rounded-xl border border-slate-300 font-semibold text-sm bg-white outline-none focus:border-[#1D4ED8]"
              >
                {activeCats.length > 0 && (
                  activeCats.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))
                )}
                <option value="manual_custom_input">+ Enter Manual Category Name (Custom)</option>
              </select>

              {(isManualCategory || activeCats.length === 0) && (
                <div className="mt-3 p-4 rounded-2xl bg-blue-50/60 border border-blue-200 space-y-2 animate-fade-in min-w-0">
                  <label className="block text-[11px] font-extrabold uppercase text-[#1D4ED8]">Manual Category Input</label>
                  <input
                    type="text"
                    required
                    value={manualCategoryInput}
                    onChange={(e) => {
                      setManualCategoryInput(e.target.value);
                      setValue("categoryId", slugify(e.target.value || "general"));
                    }}
                    placeholder="Enter custom specialization e.g. Quantum Computing"
                    className="w-full p-3 rounded-xl border border-slate-300 bg-white text-sm font-semibold outline-none focus:border-[#1D4ED8]"
                  />
                  <p className="text-[10px] text-slate-500">This specialization will be automatically created in Firestore categories collection.</p>
                </div>
              )}
            </div>

            <div className="min-w-0">
              <label className="block text-xs font-bold uppercase text-slate-700 mb-2">Instruction Level</label>
              <select
                {...register("level")}
                className="w-full p-3.5 rounded-xl border border-slate-300 font-semibold text-sm bg-white outline-none focus:border-[#1D4ED8]"
              >
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
              </select>
            </div>

            <div className="min-w-0">
              <label className="block text-xs font-bold uppercase text-slate-700 mb-2">Language</label>
              <input
                {...register("language")}
                className="w-full p-3.5 rounded-xl border border-slate-300 font-semibold text-sm outline-none focus:border-[#1D4ED8]"
              />
            </div>
          </div>
        </div>

        {/* Pricing */}
        <div className="space-y-6 pt-6 border-t border-slate-100 w-full min-w-0">
          <h3 className="font-bold text-xl text-slate-900 border-l-4 border-[#1D4ED8] pl-3">2. Commercial Pricing</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full min-w-0">
            <div className="min-w-0">
              <label className="block text-xs font-bold uppercase text-slate-700 mb-2">Base Price (INR ₹)</label>
              <input
                type="number"
                {...register("price")}
                className="w-full p-3.5 rounded-xl border border-slate-300 font-bold text-sm outline-none focus:border-[#1D4ED8]"
              />
            </div>

            <div className="min-w-0">
              <label className="block text-xs font-bold uppercase text-slate-700 mb-2">Discount (%)</label>
              <input
                type="number"
                {...register("discount")}
                className="w-full p-3.5 rounded-xl border border-slate-300 font-bold text-sm outline-none focus:border-[#1D4ED8]"
              />
            </div>
          </div>
        </div>

        {/* Cloudflare R2 uploads */}
        <div className="space-y-6 pt-6 border-t border-slate-100 w-full min-w-0">
          <h3 className="font-bold text-xl text-slate-900 border-l-4 border-[#1D4ED8] pl-3">3. Cloudflare R2 Media Assets</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full min-w-0">
            <div className="border-2 border-dashed border-slate-300 rounded-2xl p-6 text-center hover:bg-slate-50 transition-colors min-w-0">
              <label className="block text-xs font-bold uppercase text-slate-700 mb-3 cursor-pointer">
                Thumbnail Image (16:9)
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setThumbFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
                <div className="mt-3 p-4 bg-blue-50 text-[#1D4ED8] rounded-xl font-semibold text-xs flex items-center justify-center space-x-2 truncate">
                  <Upload className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{thumbFile ? thumbFile.name : "Choose Thumbnail Image"}</span>
                </div>
              </label>
            </div>

            <div className="border-2 border-dashed border-slate-300 rounded-2xl p-6 text-center hover:bg-slate-50 transition-colors min-w-0">
              <label className="block text-xs font-bold uppercase text-slate-700 mb-3 cursor-pointer">
                Banner Image
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setBannerFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
                <div className="mt-3 p-4 bg-blue-50 text-[#1D4ED8] rounded-xl font-semibold text-xs flex items-center justify-center space-x-2 truncate">
                  <Upload className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{bannerFile ? bannerFile.name : "Choose Banner Image"}</span>
                </div>
              </label>
            </div>

            <div className="border-2 border-dashed border-slate-300 rounded-2xl p-6 text-center hover:bg-slate-50 transition-colors sm:col-span-2 min-w-0">
              <label className="block text-xs font-bold uppercase text-slate-700 mb-3 cursor-pointer">
                Promo Video Lecture (&gt;100MB Signed Cloud Upload Supported)
                <input
                  type="file"
                  accept="video/*"
                  onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
                <div className="mt-3 p-4 bg-indigo-50 text-indigo-700 rounded-xl font-semibold text-xs flex items-center justify-center space-x-2 truncate">
                  <Upload className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{videoFile ? videoFile.name : "Select Streaming Promo MP4 Video"}</span>
                </div>
              </label>
            </div>

            <div className="border-2 border-dashed border-slate-300 rounded-2xl p-6 text-center hover:bg-slate-50 transition-colors sm:col-span-2 min-w-0">
              <label className="block text-xs font-bold uppercase text-slate-700 mb-3 cursor-pointer">
                Attach Course Study Material PDFs
                <input
                  type="file"
                  accept="application/pdf"
                  multiple
                  onChange={(e) => setPdfFiles(Array.from(e.target.files || []))}
                  className="hidden"
                />
                <div className="mt-3 p-4 bg-amber-50 text-amber-800 rounded-xl font-semibold text-xs flex items-center justify-center space-x-2 truncate">
                  <Upload className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{pdfFiles.length > 0 ? `${pdfFiles.length} PDF files selected` : "Select Study PDFs"}</span>
                </div>
              </label>
            </div>
          </div>

          {(mediaUploading || submitting) && (
            <div className="bg-slate-900 text-white p-6 rounded-2xl space-y-3 animate-fade-in">
              <div className="flex justify-between text-xs font-bold">
                <span>Uploading securely to Cloudflare R2...</span>
                <span>{mediaProgress.percentage}%</span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div className="bg-[#F59E0B] h-full transition-all duration-300" style={{ width: `${mediaProgress.percentage}%` }} />
              </div>
            </div>
          )}
        </div>

        {/* Requirements & Outcomes */}
        <div className="space-y-8 pt-6 border-t border-slate-100 w-full min-w-0">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-xl text-slate-900 border-l-4 border-[#1D4ED8] pl-3">4. Prerequisites</h3>
              <button
                type="button"
                onClick={() => appendReq({ value: "" })}
                className="text-xs font-bold text-[#1D4ED8] inline-flex items-center bg-blue-50 px-3 py-1.5 rounded-lg flex-shrink-0"
              >
                <Plus className="w-3.5 h-3.5 mr-1 flex-shrink-0 self-center" /> Add Requirement
              </button>
            </div>

            <div className="space-y-3">
              {reqFields.map((field, index) => (
                <div key={field.id} className="flex items-center space-x-3 min-w-0">
                  <input
                    {...register(`requirements.${index}.value`)}
                    placeholder="e.g. Basic computer operation proficiency"
                    className="flex-1 p-3 rounded-xl border border-slate-300 text-sm font-medium min-w-0"
                  />
                  {reqFields.length > 1 && (
                    <button type="button" onClick={() => removeReq(index)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg flex-shrink-0" aria-label="Remove">
                      <Trash2 className="w-4 h-4 flex-shrink-0" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-xl text-slate-900 border-l-4 border-[#1D4ED8] pl-3">5. Learning Outcomes</h3>
              <button
                type="button"
                onClick={() => appendOut({ value: "" })}
                className="text-xs font-bold text-[#1D4ED8] inline-flex items-center bg-blue-50 px-3 py-1.5 rounded-lg flex-shrink-0"
              >
                <Plus className="w-3.5 h-3.5 mr-1 flex-shrink-0 self-center" /> Add Outcome
              </button>
            </div>

            <div className="space-y-3">
              {outFields.map((field, index) => (
                <div key={field.id} className="flex items-center space-x-3 min-w-0">
                  <input
                    {...register(`learningOutcomes.${index}.value`)}
                    placeholder="e.g. Build enterprise-scale Next.js web applications"
                    className="flex-1 p-3 rounded-xl border border-slate-300 text-sm font-medium min-w-0"
                  />
                  {outFields.length > 1 && (
                    <button type="button" onClick={() => removeOut(index)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg flex-shrink-0" aria-label="Remove">
                      <Trash2 className="w-4 h-4 flex-shrink-0" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Publish Toggle & Save CTA */}
        <div className="pt-8 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-6 w-full min-w-0">
          <label className="flex items-center space-x-3 cursor-pointer select-none bg-slate-50 px-5 py-3 rounded-2xl border border-slate-200 w-full sm:w-auto">
            <input
              type="checkbox"
              {...register("isPublished")}
              className="w-5 h-5 rounded text-[#1D4ED8] focus:ring-[#1D4ED8] flex-shrink-0 self-center"
            />
            <span className="font-bold text-sm text-slate-900">Publish Immediately on Website</span>
          </label>

          <button
            type="submit"
            disabled={submitting || mediaUploading}
            className="w-full sm:w-auto px-10 py-4 rounded-xl bg-[#1D4ED8] hover:bg-blue-800 text-white font-extrabold text-sm shadow-lg transition-all disabled:opacity-50 text-center"
          >
            {submitting ? "Processing Media & Metadata..." : "Save & Create Course"}
          </button>
        </div>

      </form>
    </div>
  );
}
