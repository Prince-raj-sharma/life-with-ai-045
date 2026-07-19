"use client";

import React, { useState } from "react";
import Link from "next/link";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useToast } from "@/providers/ToastProvider";
import { Mail, ArrowLeft, CheckCircle2 } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { toast } = useToast();

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setSent(true);
      toast({ title: "Email Sent!", message: "Check your inbox for password reset instructions", type: "success" });
    } catch {
      toast({ message: "Could not send reset link. Ensure credentials are valid.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-[#F8FAFC] py-16 px-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-slate-200 p-8 sm:p-10 space-y-6 text-center">
        {sent ? (
          <div className="space-y-6 py-4">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900">Recovery Email Sent</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              We have dispatched a secure password reset link to <span className="font-bold text-slate-900">{email}</span>. Please click the link inside your email to create a new password.
            </p>
            <div className="pt-4">
              <Link
                href="/login"
                className="inline-flex items-center text-sm font-bold text-[#1D4ED8] hover:underline"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Return to Sign In
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleReset} className="space-y-6 text-left">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-extrabold text-slate-900">Reset Your Password</h2>
              <p className="text-xs text-slate-500">
                Enter your registered university account email address.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-2">Email Address</label>
              <div className="relative">
                <Mail className="w-5 h-5 absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@university.edu"
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-300 focus:border-[#1D4ED8] outline-none text-sm font-medium bg-slate-50 focus:bg-white transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-[#1D4ED8] hover:bg-blue-800 text-white font-bold text-sm shadow transition-all disabled:opacity-50"
            >
              {loading ? "Sending..." : "Send Reset Link"}
            </button>

            <div className="text-center pt-2">
              <Link href="/login" className="text-xs font-semibold text-slate-500 hover:text-slate-900">
                Cancel and return to Login
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
