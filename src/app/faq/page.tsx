"use client";

import React, { useState } from "react";
import { ChevronDown, HelpCircle } from "lucide-react";

export default function FaqPage() {
  const faqs = [
    {
      cat: "Enrollment & Payments",
      items: [
        { q: "How do I purchase a course on LIFE WITH AI?", a: "Simply navigate to any course details page and click 'Enroll Now with Razorpay'. Our checkout integrates with official Razorpay APIs supporting cards, UPI, net banking, and wallets." },
        { q: "Is duplicate purchasing prevented?", a: "Yes. Our checkout engine verifies your active enrollments before initializing transaction orders. If you already own a program, duplicate payments are blocked automatically." },
        { q: "Where can I download my purchase receipts?", a: "All order invoices and transaction receipts are permanently stored and downloadable inside your Student Dashboard under Payment History." }
      ]
    },
    {
      cat: "Curriculum & Certificates",
      items: [
        { q: "Are the video lectures streamed in HD?", a: "Yes. Video files are delivered from Cloudflare R2 and the browser video player adapts playback to the available connection." },
        { q: "Can I download course PDFs?", a: "Yes. Instructors attach comprehensive study manuals and notes which can be viewed inline or downloaded directly to your computer." },
        { q: "How does the certificate verification work?", a: "Upon completing all instructional modules, an official certificate is generated with a unique credential ID that employers or universities can independently verify." }
      ]
    }
  ];

  const [openItem, setOpenItem] = useState<string | null>("0-0");

  return (
    <div className="bg-white pb-24 min-h-screen">
      <div className="bg-[#F8FAFC] py-20 border-b border-slate-200 text-center">
        <div className="max-w-[1280px] mx-auto px-4 space-y-4">
          <div className="w-12 h-12 bg-blue-50 text-[#1D4ED8] rounded-2xl flex items-center justify-center mx-auto">
            <HelpCircle className="w-6 h-6" />
          </div>
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Frequently Asked Questions</h1>
          <p className="text-slate-600 text-base max-w-2xl mx-auto">
            Find immediate answers regarding platform access, course purchasing, and certification policies.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 space-y-12">
        {faqs.map((section, sIdx) => (
          <div key={sIdx} className="space-y-4">
            <h2 className="font-bold text-xl text-slate-900 px-2 border-l-4 border-[#1D4ED8]">{section.cat}</h2>
            <div className="space-y-3">
              {section.items.map((item, iIdx) => {
                const key = `${sIdx}-${iIdx}`;
                const isOpen = openItem === key;
                return (
                  <div key={key} className="border border-slate-200 rounded-2xl overflow-hidden transition-all bg-[#FAFAFA]">
                    <button
                      onClick={() => setOpenItem(isOpen ? null : key)}
                      className="w-full px-6 py-5 text-left font-bold text-sm sm:text-base text-slate-900 flex items-center justify-between focus:outline-none"
                    >
                      <span>{item.q}</span>
                      <ChevronDown className={`w-5 h-5 text-slate-500 transition-transform duration-300 flex-shrink-0 ml-2 ${isOpen ? "transform rotate-180 text-[#1D4ED8]" : ""}`} />
                    </button>
                    {isOpen && (
                      <div className="px-6 pb-5 pt-1 text-sm text-slate-600 leading-relaxed border-t border-slate-100 bg-white">
                        {item.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
