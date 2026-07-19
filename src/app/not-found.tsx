import React from "react";
import Link from "next/link";
import { SearchX, ArrowLeft } from "lucide-react";

export default function NotFoundPage() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-white px-4 py-16">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="w-20 h-20 bg-blue-50 text-[#1D4ED8] rounded-3xl flex items-center justify-center mx-auto shadow-sm">
          <SearchX className="w-10 h-10" />
        </div>

        <div className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-widest text-[#1D4ED8]">Error 404</span>
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Page Not Found</h1>
          <p className="text-sm text-slate-600 leading-relaxed max-w-sm mx-auto">
            The requested university resource or classroom route does not exist. It may have been unpublished or moved.
          </p>
        </div>

        <div className="pt-4">
          <Link
            href="/"
            className="inline-flex items-center space-x-2 px-8 py-3.5 rounded-xl bg-[#1D4ED8] hover:bg-blue-800 text-white font-bold text-sm shadow transition-all"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            <span>Return to Portal Home</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
