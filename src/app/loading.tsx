import React from "react";
import { GraduationCap } from "lucide-react";

export default function GlobalLoading() {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center bg-white p-6 text-center space-y-6">
      <div className="w-16 h-16 rounded-2xl bg-[#1D4ED8] text-white flex items-center justify-center shadow-lg animate-bounce">
        <GraduationCap className="w-10 h-10" />
      </div>
      <div className="space-y-2">
        <div className="w-48 h-2 bg-slate-100 rounded-full overflow-hidden mx-auto">
          <div className="bg-[#1D4ED8] h-full w-1/2 animate-pulse rounded-full" />
        </div>
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Loading LIFE WITH AI Portal...</p>
      </div>
    </div>
  );
}
