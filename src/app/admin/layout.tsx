"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import { BarChart3, BookOpen, PlusCircle, Layers, Users, ShoppingCart, Star, Award, Megaphone, Bell, ShieldCheck, LogOut, ExternalLink } from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, loading, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  React.useEffect(() => {
    if (!loading && !user) {
      router.replace("/login?redirect=/admin");
    } else if (!loading && user && !isAdmin) {
      router.replace("/dashboard?error=unauthorized_admin");
    }
  }, [loading, user, isAdmin, router]);

  if (loading) {
    return (
      <div className="max-w-[1280px] mx-auto px-4 py-24 flex flex-col items-center justify-center min-h-[70vh] space-y-4">
        <div className="w-10 h-10 rounded-full border-4 border-[#1D4ED8] border-t-transparent animate-spin" />
        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Verifying Admin Credentials...</p>
      </div>
    );
  }

  if (!user || !isAdmin) return null;

  const adminNav = [
    { label: "Dashboard Analytics", href: "/admin", icon: BarChart3 },
    { label: "Course Management", href: "/admin/courses", icon: BookOpen },
    { label: "Add New Course", href: "/admin/courses/new", icon: PlusCircle },
    { label: "Manage Categories", href: "/admin/categories", icon: Layers },
    { label: "Enrolled Students", href: "/admin/students", icon: Users },
    { label: "Orders & Payments", href: "/admin/orders", icon: ShoppingCart },
    { label: "Student Reviews", href: "/admin/reviews", icon: Star },
    { label: "Certificates Vault", href: "/admin/certificates", icon: Award },
    { label: "Broadcast Announcements", href: "/admin/announcements", icon: Megaphone },
    { label: "System Notifications", href: "/admin/notifications", icon: Bell },
  ];

  const isActive = (path: string) => {
    if (path === "/admin" && pathname !== "/admin") return false;
    if (path === "/admin/courses" && pathname === "/admin/courses/new") return false;
    return pathname.startsWith(path);
  };

  return (
    <div className="bg-[#F8FAFC] min-h-screen pb-24 text-slate-900 overflow-x-hidden">
      {/* Top Banner */}
      <div className="bg-indigo-900 text-white py-3 px-4 border-b border-indigo-800 text-xs font-semibold w-full">
        <div className="max-w-[1280px] mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div className="flex items-center space-x-2 min-w-0">
            <ShieldCheck className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span className="truncate">LIFE WITH AI Commercial Admin Portal • Account: {user.email}</span>
          </div>
          <Link href="/" target="_blank" className="flex items-center text-blue-200 hover:text-white transition-colors flex-shrink-0">
            <span>Live Public Site</span>
            <ExternalLink className="w-3.5 h-3.5 ml-1 flex-shrink-0" />
          </Link>
        </div>
      </div>

      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start w-full">
          
          {/* Admin Sidebar */}
          <aside className="lg:col-span-1 bg-white rounded-3xl border border-slate-200 p-6 shadow-sm static lg:sticky lg:top-24 space-y-6 w-full min-w-0 z-20">
            <div className="flex items-center space-x-3 pb-6 border-b border-slate-100 px-2">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white font-extrabold text-lg flex items-center justify-center uppercase shadow-md flex-shrink-0">
                A
              </div>
              <div className="min-w-0 flex-1 overflow-hidden">
                <h3 className="font-bold text-base text-slate-900 truncate">Prince Raj</h3>
                <p className="text-xs text-slate-500 truncate">Super Administrator</p>
                <span className="inline-block mt-1 text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-800">
                  Full Control
                </span>
              </div>
            </div>

            <nav className="space-y-1 w-full">
              {adminNav.map((link) => {
                const Icon = link.icon;
                const active = isActive(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center space-x-3 px-4 py-3 rounded-xl font-semibold text-xs sm:text-sm transition-all w-full min-w-0 ${
                      active
                        ? "bg-[#1D4ED8] text-white shadow"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                    }`}
                  >
                    <Icon className={`w-4 h-4 flex-shrink-0 self-center ${active ? "text-white" : "text-slate-400"}`} />
                    <span className="truncate">{link.label}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="pt-4 border-t border-slate-100 w-full">
              <button
                onClick={logout}
                className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-bold text-xs text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="w-4 h-4 flex-shrink-0 self-center" />
                <span>Exit Admin Console</span>
              </button>
            </div>
          </aside>

          {/* Admin Main View */}
          <main className="lg:col-span-3 space-y-8 w-full min-w-0 overflow-hidden">
            {children}
          </main>

        </div>
      </div>
    </div>
  );
}
