import React from "react";
import { Shield } from "lucide-react";

export default function PrivacyPolicyPage() {
  return (
    <div className="bg-white pb-24 min-h-screen">
      <div className="bg-[#F8FAFC] py-16 border-b border-slate-200 text-center">
        <div className="max-w-[1280px] mx-auto px-4 space-y-3">
          <Shield className="w-8 h-8 text-[#1D4ED8] mx-auto" />
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Privacy Policy</h1>
          <p className="text-slate-500 text-xs uppercase tracking-widest font-bold">Effective Date: June 2026</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 prose prose-slate text-slate-700 text-sm sm:text-base leading-relaxed space-y-8">
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900">1. Information Collection</h2>
          <p>
            LIFE WITH AI collects personal data necessary to operate our commercial university platform, including full name, email address, and authentication identifiers processed securely through Google Firebase Authentication.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900">2. Financial Transactions</h2>
          <p>
            All financial transactions and course purchases are processed through official Razorpay Payment Gateways. LIFE WITH AI does not store sensitive banking numbers, credit card CVVs, or UPI PINs on our servers.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900">3. Cloud Media Infrastructure</h2>
          <p>
            Video lectures and PDF study materials are stored in Cloudflare R2 and delivered through the configured public R2 endpoint. Cloudflare may process standard request telemetry required to deliver those files.
          </p>
        </section>
      </div>
    </div>
  );
}
