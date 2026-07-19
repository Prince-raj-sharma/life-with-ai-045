"use client";

import React from "react";
import { X, Download, ExternalLink, FileText } from "lucide-react";

export default function PdfViewerModal({
  isOpen,
  onClose,
  pdfUrl,
  title = "Course Study Material",
}: {
  isOpen: boolean;
  onClose: () => void;
  pdfUrl: string;
  title?: string;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 sm:p-6 lg:p-8">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 text-[#1D4ED8] rounded-lg">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 line-clamp-1">{title}</h3>
              <p className="text-xs text-slate-500">Inline PDF Document Viewer</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <a
              href={pdfUrl}
              target="_blank"
              rel="noreferrer"
              download
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Download</span>
            </a>
            <a
              href={pdfUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#1D4ED8] hover:bg-blue-800 text-white text-xs font-semibold transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Open New Tab</span>
            </a>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Viewer iframe */}
        <div className="flex-1 bg-slate-100 relative">
          <iframe
            src={`${pdfUrl}#toolbar=1`}
            className="w-full h-full border-0"
            title={title}
          />
        </div>
      </div>
    </div>
  );
}
