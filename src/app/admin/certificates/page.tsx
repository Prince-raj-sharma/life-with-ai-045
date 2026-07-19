"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Certificate } from "@/types";
import { formatDate } from "@/utils";
import { Award, ShieldCheck } from "lucide-react";

export default function AdminCertificatesPage() {
  const { data: certs, isLoading } = useQuery({
    queryKey: ["admin-certs-all"],
    queryFn: async () => {
      const res = await fetch("/api/certificates?all=true");
      const json = await res.json();
      return (json.certificates || []) as Certificate[];
    },
  });

  const certificates = certs || [];

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="pb-4 border-b border-slate-200">
        <h1 className="text-3xl font-extrabold text-slate-900">Certificate Credentials Vault</h1>
        <p className="text-sm text-slate-600">Audit verified certificates issued to graduating students</p>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm p-6 sm:p-8">
        {isLoading ? (
          <div className="h-64 bg-slate-100 animate-pulse rounded-2xl" />
        ) : certificates.length === 0 ? (
          <div className="text-center py-12 space-y-3">
            <Award className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="font-bold text-lg text-slate-700">No Certificates Issued</h3>
            <p className="text-xs text-slate-400">Credentials appear here upon student completion.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {certificates.map((c) => (
              <div key={c.id} className="p-5 rounded-2xl border border-slate-200 bg-slate-50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-[#1D4ED8]">{c.certificateNumber}</span>
                  <span className="text-[10px] uppercase font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded flex items-center">
                    <ShieldCheck className="w-3 h-3 mr-1" /> Valid
                  </span>
                </div>
                <h4 className="font-bold text-base text-slate-900">{c.userName}</h4>
                <p className="text-xs text-slate-600">{c.courseTitle}</p>
                <span className="text-[10px] text-slate-400 block pt-1">Issued {formatDate(c.issueDate)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
