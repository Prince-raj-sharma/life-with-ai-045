"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/providers/AuthProvider";
import { Certificate } from "@/lib/types";
import CertificateTemplate from "@/components/shared/CertificateTemplate";
import { Award, Eye, Calendar, ShieldCheck } from "lucide-react";
import { formatDate } from "@/lib/utils";

export default function CertificatesPage() {
  const { user } = useAuth();
  const [selectedCert, setSelectedCert] = useState<Certificate | null>(null);

  const { data: certs, isLoading } = useQuery({
    queryKey: ["dashboard-my-certs", user?.uid],
    queryFn: async () => {
      if (!user) return [];
      const res = await fetch(`/api/certificates?userId=${user.uid}`);
      const json = await res.json();
      return (json.certificates || []) as Certificate[];
    },
    enabled: !!user,
  });

  const certificates = certs || [];

  return (
    <div className="space-y-8">
      <div className="flex items-center space-x-3 pb-4 border-b border-slate-200">
        <div className="p-3 bg-amber-50 text-[#D97706] rounded-xl">
          <Award className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Academic Certificates</h1>
          <p className="text-xs text-slate-500">Official verified credentials issued by LIFE WITH AI Academic Board</p>
        </div>
      </div>

      {selectedCert ? (
        <div className="space-y-6 animate-fade-in">
          <button
            onClick={() => setSelectedCert(null)}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
          >
            ← Return to Certificate Vault
          </button>
          <CertificateTemplate certificate={selectedCert} />
        </div>
      ) : isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <div key={i} className="h-48 bg-slate-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : certificates.length === 0 ? (
        <div className="bg-white rounded-3xl p-16 border border-slate-200 text-center space-y-4">
          <Award className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-xl font-bold text-slate-800">No Issued Certificates</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
            Certificates are issued automatically once you complete 100% of the lessons in any enrolled course. Finish your instructional modules inside the classroom to unlock your first credential.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {certificates.map((cert) => (
            <div key={cert.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-4 hover:border-[#1D4ED8] transition-all">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                    <Award className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded flex items-center w-max">
                      <ShieldCheck className="w-3 h-3 mr-1" /> Verified
                    </span>
                    <h4 className="font-bold text-base text-slate-900 mt-1">{cert.courseTitle}</h4>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span className="flex items-center">
                  <Calendar className="w-3.5 h-3.5 mr-1 text-slate-400" />
                  Issued {formatDate(cert.issueDate)}
                </span>
                <button
                  onClick={() => setSelectedCert(cert)}
                  className="px-4 py-2 rounded-xl bg-[#1D4ED8] hover:bg-blue-800 text-white font-bold flex items-center transition-all shadow-sm"
                >
                  <Eye className="w-3.5 h-3.5 mr-1.5" /> View Certificate
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
