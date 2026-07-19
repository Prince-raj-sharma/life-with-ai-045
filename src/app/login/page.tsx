"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  signOut,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { auth, googleProvider } from "@/lib/firebase";
import { syncAuthProfile } from "@/lib/auth-client";
import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/providers/ToastProvider";
import { GraduationCap, Lock, Mail, ArrowRight } from "lucide-react";

function getSafeRedirectTarget() {
  if (typeof window === "undefined") return null;

  const target = new URLSearchParams(window.location.search).get("redirect");
  return target?.startsWith("/") && !target.startsWith("//") ? target : null;
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { user, isAdmin, loading: authLoading } = useAuth();
  const { toast } = useToast();

  React.useEffect(() => {
    if (authLoading || !user) return;

    router.replace(getSafeRedirectTarget() || (isAdmin ? "/admin" : "/dashboard"));
  }, [authLoading, user, isAdmin, router]);

  if (authLoading || user) {
    return (
      <div className="min-h-[85vh] flex items-center justify-center bg-[#F8FAFC]">
        <div className="w-8 h-8 rounded-full border-4 border-[#1D4ED8] border-t-transparent animate-spin" />
      </div>
    );
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({ message: "Please enter email and password", type: "error" });
      return;
    }

    setLoading(true);
    try {
      await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence);
      
      const credential = await signInWithEmailAndPassword(auth, email, password);

      const userRef = doc(db, "users", credential.user.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists() && userSnap.data().blocked) {
        await signOut(auth);

        toast({
          title: "Account Blocked",
          message: "Your account has been blocked. Please contact the administrator.",
          type: "error",
        });

        setLoading(false);
      return;
    }
      
      await syncAuthProfile(credential.user, { displayName: credential.user.displayName });

      toast({ title: "Welcome back!", message: "Logged in successfully", type: "success" });

      const destination = getSafeRedirectTarget() ||
        (credential.user.email?.toLowerCase() === "princerajpiyush84@gmail.com" ? "/admin" : "/");
      router.push(destination);
    } catch (err: unknown) {
      console.error("Login error:", err);
      toast({
        title: "Authentication Error",
        message: "Invalid email or password (make sure real Firebase credentials are in .env.local)",
        type: "error"
      });
    } finally {
      setLoading(false);
    }
  };
  const handleGoogleLogin = async () => {
    try {
      await setPersistence(auth, browserLocalPersistence);
      const result = await signInWithPopup(auth, googleProvider);
      await syncAuthProfile(result.user, {
        displayName: result.user.displayName,
        photoURL: result.user.photoURL,
      });
      toast({
        title: "Welcome!",
        message: "Google login successful.",
        type: "success",
      });
      const destination = getSafeRedirectTarget() ||
        (result.user.email?.toLowerCase() === "princerajpiyush84@gmail.com" ? "/admin" : "/");
      router.push(destination);
      router.refresh();

    } catch (error: unknown) {
      console.error(error);
      toast({
        title: "Google Login Failed",
        message: error instanceof Error ? error.message : "Google sign-in failed. Please try again.",
        type: "error",
      });
    }
  };
  return (
    <div className="min-h-[85vh] flex items-center justify-center bg-[#F8FAFC] py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-slate-200 p-8 sm:p-10 space-y-8">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 bg-[#1D4ED8] text-white rounded-2xl flex items-center justify-center mx-auto shadow-md">
            <GraduationCap className="w-7 h-7" />
          </div>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Sign In to Portal</h2>
          <p className="text-sm text-slate-600">
            Access your university learning environment and active enrollments.
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <button
            type="button"
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 border border-slate-300 rounded-xl py-3 font-semibold hover:bg-slate-50 transition"
          >
            <Image
              src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
              alt="Google"
              width={20}
              height={20}
              unoptimized
              className="h-5 w-5"
            />
              Continue with Google
            </button>

            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-300"></div>
              </div>
              <div className="relative flex justify-center">
                <span className="bg-white px-3 text-xs text-slate-500">
                  OR
                </span>
              </div>
            </div>
          <div className="space-y-4">
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
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-300 focus:border-[#1D4ED8] focus:ring-1 focus:ring-[#1D4ED8] outline-none text-sm font-medium transition-all bg-slate-50 focus:bg-white"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold uppercase text-slate-700">Password</label>
                <Link href="/forgot-password" className="text-xs font-semibold text-[#1D4ED8] hover:underline">
                  Forgot Password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="w-5 h-5 absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-300 focus:border-[#1D4ED8] focus:ring-1 focus:ring-[#1D4ED8] outline-none text-sm font-medium transition-all bg-slate-50 focus:bg-white"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center space-x-2 text-sm text-slate-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="w-4 h-4 rounded text-[#1D4ED8] focus:ring-[#1D4ED8] border-slate-300"
              />
              <span className="font-medium">Remember this session</span>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-[#1D4ED8] hover:bg-blue-800 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            <span>{loading ? "Authenticating..." : "Sign In"}</span>
            {!loading && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>

        <div className="pt-6 border-t border-slate-100 text-center space-y-4">
          <p className="text-sm text-slate-600">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="font-bold text-[#1D4ED8] hover:underline">
              Register Now
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
