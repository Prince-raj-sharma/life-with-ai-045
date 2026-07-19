import React from "react";
import { GraduationCap, Award, CheckCircle2, Cpu, BookOpen } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="bg-white pb-24">
      {/* Header */}
      <div className="bg-[#F8FAFC] py-20 border-b border-slate-200 text-center">
        <div className="max-w-[1280px] mx-auto px-4 space-y-4">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">About LIFE WITH AI</h1>
          <p className="text-slate-600 text-lg max-w-3xl mx-auto leading-relaxed">
            Pioneering modern university-grade technological education built for commercial deployment and professional mastery.
          </p>
        </div>
      </div>

      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 mt-16 space-y-24">
        {/* Mission */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <h2 className="text-xs uppercase tracking-widest font-bold text-[#1D4ED8]">Our Academic Mission</h2>
            <h3 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Bridge the Gap Between Theory and Industry Systems
            </h3>
            <p className="text-slate-600 text-base leading-relaxed">
              Traditional academic institutions often lag behind rapid technological advancements. LIFE WITH AI was established to deliver rigorous, production-focused programming curriculum backed by enterprise technologies like Next.js, TypeScript, Cloudflare R2 media delivery, and Firebase cloud infrastructure.
            </p>
            <div className="space-y-3 pt-2">
              <div className="flex items-center space-x-3 text-sm font-semibold text-slate-800">
                <CheckCircle2 className="w-5 h-5 text-[#1D4ED8]" />
                <span>100% Dynamic Content Controlled by Administrators</span>
              </div>
              <div className="flex items-center space-x-3 text-sm font-semibold text-slate-800">
                <CheckCircle2 className="w-5 h-5 text-[#1D4ED8]" />
                <span>Verifiable Academic Certificates for Enrolled Scholars</span>
              </div>
              <div className="flex items-center space-x-3 text-sm font-semibold text-slate-800">
                <CheckCircle2 className="w-5 h-5 text-[#1D4ED8]" />
                <span>Zero Placeholder Content or Simulated Business Logic</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 rounded-3xl p-12 text-white relative shadow-2xl overflow-hidden min-h-[350px] flex flex-col justify-between">
            <div className="w-16 h-16 bg-[#1D4ED8] rounded-2xl flex items-center justify-center shadow-lg">
              <GraduationCap className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <span className="text-4xl font-extrabold tracking-tight">University Excellence</span>
              <p className="text-slate-400 text-sm">Engineered for ambitious students and working engineers.</p>
            </div>
          </div>
        </div>

        {/* Stats / Tech Infrastructure */}
        <div className="bg-[#FAFAFA] p-12 rounded-3xl border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
          <div className="space-y-2">
            <Cpu className="w-8 h-8 text-[#1D4ED8] mx-auto mb-2" />
            <h4 className="font-extrabold text-2xl text-slate-900">Cloudflare R2 Media</h4>
            <p className="text-xs text-slate-600">Reliable media storage and delivery</p>
          </div>
          <div className="space-y-2 border-y sm:border-y-0 sm:border-x border-slate-200 py-6 sm:py-0">
            <Award className="w-8 h-8 text-[#1D4ED8] mx-auto mb-2" />
            <h4 className="font-extrabold text-2xl text-slate-900">Rozerpay instant unlock</h4>
            <p className="text-xs text-slate-600">Enterprise checkout & instant course unlock</p>
          </div>
          <div className="space-y-2">
            <BookOpen className="w-8 h-8 text-[#1D4ED8] mx-auto mb-2" />
            <h4 className="font-extrabold text-2xl text-slate-900">Verified Certificate</h4>
            <p className="text-xs text-slate-600">Real-time dynamic document database</p>
          </div>
        </div>
      </div>
    </div>
  );
}
