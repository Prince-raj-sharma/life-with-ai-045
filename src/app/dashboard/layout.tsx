"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import { BookOpen, Heart, Bookmark, Award, Clock, Bell, User as UserIcon, LogOut } from "lucide-react";

export default function StudentDashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, profile, loading, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  React.useEffect(() => {
    if (!loading && !user) {
      const redirectTarget = pathname || "/dashboard";
      router.replace(`/login?redirect=${encodeURIComponent(redirectTarget)}`);
    }
  }, [loading, user, pathname, router]);

  if (loading) {
    return (
      <div className="max-w-[1280px] mx-auto px-4 py-20 flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 rounded-full border-4 border-[#1D4ED8] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  const sidebarLinks = [
    { label: "Enrolled Courses", href: "/dashboard", icon: BookOpen },
    { label: "My Wishlist", href: "/dashboard/wishlist", icon: Heart },
    { label: "Bookmarks", href: "/dashboard/bookmarks", icon: Bookmark },
    { label: "Certificates", href: "/dashboard/certificates", icon: Award },
    { label: "Payment History", href: "/dashboard/history", icon: Clock },
    { label: "Notifications", href: "/dashboard/notifications", icon: Bell },
    { label: "Profile Settings", href: "/dashboard/profile", icon: UserIcon },
  ];

  const isActive = (path: string) => {
    if (path === "/dashboard" && pathname !== "/dashboard") return false;
    return pathname.startsWith(path);
  };

  return (
    <div className="bg-[#F8FAFC] min-h-[90vh] pb-24 overflow-x-hidden">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start w-full">
          
          {/* Dashboard Sidebar (Column 1) */}
          <aside className="lg:col-span-1 bg-white rounded-3xl border border-slate-200 p-6 shadow-sm static lg:sticky lg:top-24 space-y-6 w-full min-w-0 z-20">
            <div className="flex items-center space-x-3.5 pb-6 border-b border-slate-100 px-2">
              <div className="w-12 h-12 rounded-2xl bg-[#1D4ED8] text-white font-extrabold text-lg flex items-center justify-center uppercase shadow-md flex-shrink-0">
                {profile?.displayName?.charAt(0) || user.email?.charAt(0) || "S"}
              </div>
              <div className="min-w-0 flex-1 overflow-hidden">
                <h3 className="font-bold text-base text-slate-900 truncate">{profile?.displayName || "Student"}</h3>
                <p className="text-xs text-slate-500 truncate">{user.email}</p>
                <span className="inline-block mt-1 text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-blue-100 text-[#1D4ED8]">
                  {profile?.role || "Student"} Scholar
                </span>
              </div>
            </div>

            <nav className="space-y-1 w-full">
              {sidebarLinks.map((link) => {
                const Icon = link.icon;
                const active = isActive(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center space-x-3 px-4 py-3 rounded-xl font-semibold text-xs sm:text-sm transition-all w-full min-w-0 ${
                      active
                        ? "bg-[#1D4ED8] text-white shadow-sm"
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
                <span>Sign Out of Portal</span>
              </button>
            </div>
          </aside>

          {/* Dashboard Content Panel (Columns 2-4) */}
          <main className="lg:col-span-3 space-y-8 w-full min-w-0 overflow-hidden">
            {children}
          </main>

        </div>
      </div>
    </div>
  );
}
