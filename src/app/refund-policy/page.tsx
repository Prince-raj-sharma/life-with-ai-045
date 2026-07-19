import React from "react";
import { RefreshCw } from "lucide-react";

export default function RefundPolicyPage() {
  return (
    <div className="bg-white pb-24 min-h-screen">
      <div className="bg-[#F8FAFC] py-16 border-b border-slate-200 text-center">
        <div className="max-w-[1280px] mx-auto px-4 space-y-3">
          <RefreshCw className="w-8 h-8 text-[#1D4ED8] mx-auto" />
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Refund & Cancellation Policy</h1>
          <p className="text-slate-500 text-xs uppercase tracking-widest font-bold">Commercial Platform Terms</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 prose prose-slate text-slate-700 text-sm sm:text-base leading-relaxed space-y-8">
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900">1. Instant Course Unlock</h2>
          <p>
            Because LIFE WITH AI delivers digital educational content with immediate streaming access and downloadable PDF files upon payment confirmation, refunds are evaluated strictly under academic compliance standards.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900">2. 7-Day Academic Review Window</h2>
          <p>
            Students may request a full refund within 7 days of initial Razorpay purchase provided that less than 20% of the course video curriculum has been streamed and no certificate of completion has been issued.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900">3. Processing Timelines</h2>
          <p>
            Approved refunds are initiated automatically back to the original source banking account or UPI ID via Razorpay API webhooks within 5 to 7 business days.
          </p>
        </section>
      </div>
    </div>
  );
}
