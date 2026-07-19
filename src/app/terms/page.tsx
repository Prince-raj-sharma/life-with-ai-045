import React from "react";
import { FileText } from "lucide-react";

export default function TermsPage() {
  return (
    <div className="bg-white pb-24 min-h-screen">
      <div className="bg-[#F8FAFC] py-16 border-b border-slate-200 text-center">
        <div className="max-w-[1280px] mx-auto px-4 space-y-3">
          <FileText className="w-8 h-8 text-[#1D4ED8] mx-auto" />
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Terms of Service</h1>
          <p className="text-slate-500 text-xs uppercase tracking-widest font-bold">Academic Portal Agreement</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 prose prose-slate text-slate-700 text-sm sm:text-base leading-relaxed space-y-8">
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900">1. Acceptance of Terms</h2>
          <p>
            By accessing or registering an account on LIFE WITH AI, you agree to abide by these academic portal terms and all university honor code policies.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900">2. Intellectual Property</h2>
          <p>
            All video lectures, software architectures, code repositories, and PDF study manuals remain the exclusive proprietary property of LIFE WITH AI. Unauthorized redistribution or commercial pirating is prohibited.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900">3. Role Based Access</h2>
          <p>
            Student accounts are prohibited from attempting unauthorized access to administrative routes or modifying Firestore document permissions.
          </p>
        </section>
      </div>
    </div>
  );
}
