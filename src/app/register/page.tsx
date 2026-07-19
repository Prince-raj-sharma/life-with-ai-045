"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { FirebaseError } from "firebase/app";

import { auth, googleProvider } from "@/lib/firebase";
import { syncAuthProfile } from "@/lib/auth-client";
import { useToast } from "@/providers/ToastProvider";
import { GraduationCap, Lock, Mail, Phone, User as UserIcon, ArrowRight } from "lucide-react";
import {
  createUserWithEmailAndPassword,
  updateProfile,
  signInWithPopup,
} from "firebase/auth";

function normalizeIndianMobile(value: string) {
  const trimmed = value.trim();
  if (!trimmed || !/^[+\d\s()-]+$/.test(trimmed)) return null;

  const digits = trimmed.replace(/\D/g, "");
  const nationalNumber =
    digits.length === 10
      ? digits
      : digits.length === 11 && digits.startsWith("0")
        ? digits.slice(1)
        : digits.length === 12 && digits.startsWith("91")
          ? digits.slice(2)
          : null;

  if (!nationalNumber || !/^[6-9]\d{9}$/.test(nationalNumber)) return null;
  return `+91${nationalNumber}`;
}

const firebaseAuthErrorMessages: Record<string, string> = {
  "auth/email-already-in-use": "An account with this email already exists. Please sign in instead or reset your password.",
  "auth/invalid-email": "Please enter a valid email address.",
  "auth/weak-password": "Password must be at least 6 characters.",
  "auth/network-request-failed": "A network error occurred. Check your connection and try again.",
  "auth/too-many-requests": "Too many attempts. Please wait a moment and try again.",
};

function getFirebaseAuthErrorCode(error: unknown) {
  return error instanceof FirebaseError ? error.code : "";
}

function getFirebaseAuthErrorMessage(error: unknown, fallback: string) {
  const code = getFirebaseAuthErrorCode(error);
  return firebaseAuthErrorMessages[code] || fallback;
}

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [registrationError, setRegistrationError] = useState<{ code: string; message: string } | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  const handleGoogleRegister = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      await syncAuthProfile(result.user, { displayName: result.user.displayName });

      toast({
        title: "Welcome!",
        message: "Google account connected successfully.",
        type: "success",
      });

      if (result.user.email?.toLowerCase() === "princerajpiyush84@gmail.com") {
        router.push("/admin");
      } else {
        router.push("/");
        router.refresh();
      }
    } catch (error: unknown) {
      console.error(error);

      toast({
        title: "Google Sign Up Failed",
        message: getFirebaseAuthErrorMessage(error, "Google sign-up failed. Please try again."),
        type: "error",
      });
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedMobile = normalizeIndianMobile(mobile);

    if (!trimmedName) {
      toast({ message: "Name is required", type: "error" });
      return;
    }
    if (!normalizedEmail) {
      toast({ message: "Email is required", type: "error" });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      toast({ message: "Please enter a valid email address", type: "error" });
      return;
    }
    if (!normalizedMobile) {
      toast({ message: "Please enter a valid Indian mobile number", type: "error" });
      return;
    }
    if (!password) {
      toast({ message: "Password is required", type: "error" });
      return;
    }
    if (password !== confirmPassword) {
      toast({ message: "Passwords do not match", type: "error" });
      return;
    }
    if (password.length < 6) {
      toast({ message: "Password must be at least 6 characters", type: "error" });
      return;
    }

    setLoading(true);
    setRegistrationError(null);
    try {
      const credential = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
      await updateProfile(credential.user, { displayName: trimmedName });
      await syncAuthProfile(credential.user, {
        displayName: trimmedName,
        mobile: normalizedMobile,
      });

      router.push("/dashboard");
      router.refresh();
    } catch (err: unknown) {
      console.error("Register error:", err);
      const code = getFirebaseAuthErrorCode(err);
      const message = getFirebaseAuthErrorMessage(err, "Could not create your account. Please try again.");
      setRegistrationError({ code, message });

      if (code !== "auth/email-already-in-use") {
        toast({
          title: "Registration Failed",
          message,
          type: "error",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center bg-[#F8FAFC] py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-slate-200 p-8 sm:p-10 space-y-8">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 bg-[#1D4ED8] text-white rounded-2xl flex items-center justify-center mx-auto shadow-md">
            <GraduationCap className="w-7 h-7" />
          </div>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Create Account</h2>
          <p className="text-sm text-slate-600">
            Join the commercial academic platform and transform your programming career.
          </p>
        </div>

        {registrationError && (
          <div
            role="alert"
            className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
          >
            <p className="font-semibold">{registrationError.message}</p>
            {registrationError.code === "auth/email-already-in-use" && (
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Link
                  href="/login"
                  className="rounded-xl bg-[#1D4ED8] px-4 py-3 text-center text-sm font-bold text-white transition hover:bg-blue-800"
                >
                  Go to Login
                </Link>
                <Link
                  href="/forgot-password"
                  className="rounded-xl bg-white px-4 py-3 text-center text-sm font-bold text-[#1D4ED8] ring-1 ring-inset ring-blue-200 transition hover:bg-blue-50"
                >
                  Forgot Password
                </Link>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-5">
          <button
            type="button"
            onClick={handleGoogleRegister}
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
          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 mb-2">Full Name</label>
            <div className="relative">
              <UserIcon className="w-5 h-5 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter Your Name"
                className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-300 focus:border-[#1D4ED8] focus:ring-1 focus:ring-[#1D4ED8] outline-none text-sm font-medium bg-slate-50 focus:bg-white transition-all"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 mb-2">
              Email Address
            </label>

            <div className="relative">
              <Mail className="w-5 h-5 absolute left-3.5 top-3 text-slate-400" />

              <input
                type="email"
                required
                autoComplete="off"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter Email Address"
                className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-300 focus:border-[#1D4ED8] outline-none bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 mb-2">Mobile Number</label>
            <div className="relative">
              <Phone className="w-5 h-5 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="tel"
                required
                autoComplete="tel"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder="+91 98765 43210"
                inputMode="tel"
                className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-300 focus:border-[#1D4ED8] focus:ring-1 focus:ring-[#1D4ED8] outline-none text-sm font-medium bg-slate-50 focus:bg-white transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 mb-2">Password</label>
            <div className="relative">
              <Lock className="w-5 h-5 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 6 characters"
                className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-300 focus:border-[#1D4ED8] focus:ring-1 focus:ring-[#1D4ED8] outline-none text-sm font-medium bg-slate-50 focus:bg-white transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 mb-2">Confirm Password</label>
            <div className="relative">
              <Lock className="w-5 h-5 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm password"
                className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-300 focus:border-[#1D4ED8] focus:ring-1 focus:ring-[#1D4ED8] outline-none text-sm font-medium bg-slate-50 focus:bg-white transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] text-white font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center space-x-2 disabled:opacity-50 mt-2"
          >
            <span>{loading ? "Registering..." : "Register Account"}</span>
            {!loading && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>

        <div className="pt-6 border-t border-slate-100 text-center">
          <p className="text-sm text-slate-600">
            Already have an account?{" "}
            <Link href="/login" className="font-bold text-[#1D4ED8] hover:underline">
              Log In
            </Link>
          </p>
        </div>
      </div>

    </div>
  );
}
