"use client";

import React from "react";
import { Certificate } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { GraduationCap, Award, Printer } from "lucide-react";

export default function CertificateTemplate({ certificate }: { certificate: Certificate }) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end print:hidden">
        <button
          onClick={handlePrint}
          className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-[#1D4ED8] hover:bg-blue-800 text-white font-semibold text-sm shadow-sm transition-all"
        >
          <Printer className="w-4 h-4" />
          <span>Print / Download Certificate</span>
        </button>
      </div>

      {/* Certificate Container */}
      <div className="bg-white border-[12px] border-slate-900 rounded-3xl p-8 md:p-16 text-center relative shadow-2xl overflow-hidden max-w-4xl mx-auto print:border-8 print:shadow-none print:w-full print:m-0">
        {/* Decorative inner border */}
        <div className="border-2 border-dashed border-[#1D4ED8]/30 p-8 md:p-12 rounded-2xl flex flex-col items-center justify-between min-h-[550px] relative">
          
          {/* Watermark Logo */}
          <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none select-none">
            <GraduationCap className="w-96 h-96 text-slate-900" />
          </div>

          {/* Header */}
          <div className="space-y-3 relative z-10">
            <div className="flex items-center justify-center space-x-2">
              <div className="w-10 h-10 rounded-xl bg-[#1D4ED8] flex items-center justify-center text-white shadow-md">
                <GraduationCap className="w-6 h-6" />
              </div>
              <span className="font-extrabold text-2xl tracking-tight text-slate-900">
                LIFE WITH <span className="text-[#1D4ED8]">AI</span>
              </span>
            </div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500 font-bold">
              Verified Academic Credential
            </p>
          </div>

          {/* Body */}
          <div className="my-8 space-y-6 relative z-10">
            <h1 className="font-serif text-3xl md:text-5xl font-bold text-slate-900 tracking-wide uppercase">
              Certificate of Completion
            </h1>
            <p className="text-slate-600 text-sm italic">This is proudly presented to</p>
            <div className="py-2 border-b-2 border-slate-900 max-w-lg mx-auto inline-block px-8">
              <h2 className="font-bold text-2xl md:text-4xl text-[#1D4ED8]">
                {certificate.userName}
              </h2>
            </div>
            <p className="text-slate-600 text-sm max-w-xl mx-auto leading-relaxed">
              for successfully mastering the curriculum and meeting all educational outcomes required for the professional certification in
            </p>
            <h3 className="font-extrabold text-xl md:text-2xl text-slate-900 px-4 py-2 bg-slate-50 rounded-xl inline-block border border-slate-200">
              {certificate.courseTitle}
            </h3>
          </div>

          {/* Footer Signatures */}
          <div className="w-full grid grid-cols-2 gap-8 pt-8 border-t border-slate-200 text-xs text-slate-500 relative z-10">
            <div className="text-left space-y-1">
              <p className="font-bold text-slate-900">Issue Date:</p>
              <p>{formatDate(certificate.issueDate)}</p>
              <p className="font-mono text-[10px] text-slate-400 mt-2">ID: {certificate.certificateNumber}</p>
            </div>

            <div className="text-right flex flex-col items-end justify-end space-y-1">
              <div className="flex items-center space-x-1 text-[#1D4ED8]">
                <Award className="w-5 h-5" />
                <span className="font-cursive font-bold text-lg text-slate-900">LIFE WITH AI Academic Board</span>
              </div>
              <div className="w-48 border-b border-slate-400 my-1" />
              <p className="font-semibold text-slate-700">Authorized Program Director</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
