"use client";

import React, { useState } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { syncAuthProfile } from "@/lib/auth-client";
import { useToast } from "@/providers/ToastProvider";
import { User as UserIcon, Mail, Save } from "lucide-react";
import { updateProfile } from "firebase/auth";

export default function StudentProfilePage() {
  const { user, profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [name, setName] = useState(profile?.displayName || user?.displayName || "");
  const [loading, setLoading] = useState(false);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !name) return;
    setLoading(true);
    try {
      await updateProfile(user, { displayName: name });
      await syncAuthProfile(user, { displayName: name });
      await refreshProfile();
      toast({ title: "Updated", message: "Profile saved successfully", type: "success" });
    } catch {
      toast({ message: "Could not save profile", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-2xl">
      <div className="flex items-center space-x-3 pb-4 border-b border-slate-200">
        <div className="p-3 bg-blue-50 text-[#1D4ED8] rounded-xl">
          <UserIcon className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Scholar Profile Settings</h1>
          <p className="text-xs text-slate-500">Manage account identity and authentication verification</p>
        </div>
      </div>

      <form onSubmit={handleUpdate} className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
        <div className="flex items-center space-x-4 pb-6 border-b border-slate-100">
          <div className="w-16 h-16 rounded-full bg-[#1D4ED8] text-white font-extrabold text-2xl flex items-center justify-center uppercase shadow">
            {name.charAt(0) || "S"}
          </div>
          <div>
            <h3 className="font-bold text-lg text-slate-900">{name || "Student"}</h3>
            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-blue-100 text-[#1D4ED8]">
              {profile?.role || "Student"} Role
            </span>
          </div>
        </div>

        <div className="space-y-5">
          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 mb-2">Display Name</label>
            <div className="relative">
              <UserIcon className="w-5 h-5 absolute left-3.5 top-3.5 text-slate-400" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-300 focus:border-[#1D4ED8] outline-none text-sm font-semibold"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 mb-2">Email Address (Read-Only)</label>
            <div className="relative">
              <Mail className="w-5 h-5 absolute left-3.5 top-3.5 text-slate-400" />
              <input
                type="email"
                disabled
                value={user?.email || ""}
                className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-100 text-slate-500 text-sm font-medium cursor-not-allowed"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 rounded-xl bg-[#1D4ED8] hover:bg-blue-800 text-white font-bold text-sm shadow flex items-center justify-center space-x-2 disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          <span>{loading ? "Saving..." : "Save Profile Settings"}</span>
        </button>
      </form>
    </div>
  );
}
