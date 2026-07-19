"use client";

import React, { useState } from "react";
import { useToast } from "@/providers/ToastProvider";
import { Mail, Phone, MapPin, Send, MessageSquare } from "lucide-react";

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !message) {
      toast({ message: "Please fill in required fields", type: "error" });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, subject, message }),
      });
      const data = await res.json();
      toast({ title: "Message Dispatched", message: data.message, type: "success" });
      setName("");
      setEmail("");
      setSubject("");
      setMessage("");
    } catch {
      toast({ message: "Could not send inquiry", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white pb-24 min-h-screen">
      <div className="bg-[#F8FAFC] py-20 border-b border-slate-200 text-center">
        <div className="max-w-[1280px] mx-auto px-4 space-y-4">
          <div className="w-12 h-12 bg-blue-50 text-[#1D4ED8] rounded-2xl flex items-center justify-center mx-auto">
            <MessageSquare className="w-6 h-6" />
          </div>
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Academic Support & Contact</h1>
          <p className="text-slate-600 text-base max-w-2xl mx-auto">
            Our support engineers and instructional coordinators are available to answer your enrollment inquiries.
          </p>
        </div>
      </div>

      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 mt-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          
          {/* Info */}
          <div className="space-y-8 lg:col-span-1">
            <div className="space-y-4">
              <h3 className="font-extrabold text-2xl text-slate-900">Get in Touch</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Whether you have billing questions regarding Razorpay or need assistance accessing course videos and PDFs, we are ready to assist.
              </p>
            </div>

            <div className="space-y-6 pt-4 border-t border-slate-200 text-sm text-slate-700 font-medium">
              <div className="flex items-center space-x-4">
                <div className="p-3 rounded-xl bg-blue-50 text-[#1D4ED8]">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-bold uppercase">Email Support</p>
                  <p className="font-bold text-slate-900">lifewith60@gmail.com</p>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <div className="p-3 rounded-xl bg-blue-50 text-[#1D4ED8]">
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-bold uppercase">Telegram</p>
                  <p className="font-bold text-slate-900">@Mad_Max_mx</p>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <div className="p-3 rounded-xl bg-blue-50 text-[#1D4ED8]">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-bold uppercase">Headquarters</p>
                  <p className="font-bold text-slate-900">Tech Park, Bangalore, India</p>
                </div>
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="lg:col-span-2 bg-[#FAFAFA] p-8 sm:p-12 rounded-3xl border border-slate-200 shadow-sm">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-2">Your Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter Your Name"
                    className="w-full p-3.5 rounded-xl border border-slate-300 focus:border-[#1D4ED8] outline-none text-sm bg-white font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-2">Email Address</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="scholar@university.edu"
                    className="w-full p-3.5 rounded-xl border border-slate-300 focus:border-[#1D4ED8] outline-none text-sm bg-white font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-2">Inquiry Subject</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Razorpay Payment Receipt / Video Streaming Inquiry"
                  className="w-full p-3.5 rounded-xl border border-slate-300 focus:border-[#1D4ED8] outline-none text-sm bg-white font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-2">Message Content</label>
                <textarea
                  rows={5}
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Please describe your question or technical requirements..."
                  className="w-full p-4 rounded-xl border border-slate-300 focus:border-[#1D4ED8] outline-none text-sm bg-white font-medium"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="px-8 py-4 rounded-xl bg-[#1D4ED8] hover:bg-blue-800 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                <span>{loading ? "Dispatching..." : "Submit Inquiry"}</span>
                {!loading && <Send className="w-4 h-4" />}
              </button>
            </form>
          </div>

        </div>
      </div>
    </div>
  );
}
