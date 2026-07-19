"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Course } from "@/lib/types";
import { useAuth } from "@/providers/AuthProvider";
import PdfViewerModal from "@/components/shared/PdfViewerModal";
import { FileText, Download, Eye, Lock } from "lucide-react";

export default function PdfStorePage() {
  const { profile } = useAuth();
  const [activePdfUrl, setActivePdfUrl] = useState<string | null>(null);
  const [activeTitle, setActiveTitle] = useState("");

  const { data: courses, isLoading } = useQuery({
    queryKey: ["pdf-store-courses"],
    queryFn: async () => {
      const res = await fetch("/api/courses?all=true");
      const json = await res.json();
      return (json.courses || []) as Course[];
    },
  });

  const allCourses = courses?.filter((c) => c.pdfUrls && c.pdfUrls.length > 0) || [];

  return (
    <div className="bg-white min-h-screen pb-24">
      <div className="bg-[#F8FAFC] py-16 border-b border-slate-200 text-center">
        <div className="max-w-[1280px] mx-auto px-4 space-y-4">
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Academic Study Materials & Ebooks</h1>
          <p className="text-slate-600 text-base max-w-2xl mx-auto">
            Access downloadable course PDF notes, reference guides, and comprehensive study manuals hosted securely on Cloudflare R2.
          </p>
        </div>
      </div>

      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 mt-12">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-64 bg-slate-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : allCourses.length === 0 ? (
          <div className="bg-[#FAFAFA] rounded-3xl p-16 border border-slate-200 text-center max-w-xl mx-auto space-y-4 my-8">
            <div className="w-16 h-16 bg-blue-50 text-[#1D4ED8] rounded-2xl flex items-center justify-center mx-auto">
              <FileText className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-bold text-slate-800">No PDFs Available</h3>
            <p className="text-slate-500 text-sm">
              There are currently no uploaded PDF study manuals in the Firestore database. Instructors attach PDF materials when publishing courses.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {allCourses.map((course) => {
              const hasAccess = profile?.purchasedCourses?.includes(course.id || "") || profile?.role === "admin";
              return (
                <div key={course.id} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between space-y-6">
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <div className="p-3 rounded-xl bg-blue-50 text-[#1D4ED8]">
                        <FileText className="w-6 h-6" />
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-[#1D4ED8] bg-blue-50 px-2 py-0.5 rounded">
                          {course.categoryName}
                        </span>
                        <h3 className="font-bold text-lg text-slate-900 line-clamp-1 mt-1">{course.title} Notes</h3>
                      </div>
                    </div>
                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      Official instructional handbook accompanying the {course.title} curriculum.
                    </p>
                  </div>

                  <div className="pt-4 border-t border-slate-100 space-y-3">
                    {course.pdfUrls.map((pdf, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                        <span className="text-xs font-semibold text-slate-700 truncate max-w-[150px]">
                          Manual Part {idx + 1}.pdf
                        </span>
                        
                        {hasAccess ? (
                          <div className="flex items-center space-x-1.5">
                            <button
                              onClick={() => {
                                setActivePdfUrl(pdf);
                                setActiveTitle(`${course.title} - Part ${idx + 1}`);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-[#1D4ED8] text-white text-[11px] font-bold flex items-center"
                            >
                              <Eye className="w-3 h-3 mr-1" /> View
                            </button>
                            <a
                              href={pdf}
                              download
                              target="_blank"
                              rel="noreferrer"
                              className="p-1 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700"
                              title="Download PDF"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        ) : (
                          <Link
                            href={`/courses/${course.id}`}
                            className="px-2.5 py-1 rounded-lg bg-[#F59E0B] text-white text-[11px] font-bold flex items-center"
                          >
                            <Lock className="w-3 h-3 mr-1" /> Enroll to Unlock
                          </Link>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {activePdfUrl && (
        <PdfViewerModal
          isOpen={!!activePdfUrl}
          onClose={() => setActivePdfUrl(null)}
          pdfUrl={activePdfUrl}
          title={activeTitle}
        />
      )}
    </div>
  );
}
