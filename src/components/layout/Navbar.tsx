"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import { GraduationCap, Menu, X, User as UserIcon, LogOut, LayoutDashboard, ShieldCheck, BookOpen } from "lucide-react";

export default function Navbar() {
  const { user, profile, isAdmin, logout, loading } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  const navLinks = [
    { label: "Home", href: "/" },
    { label: "Courses", href: "/courses" },
    { label: "PDF Store", href: "/pdf-store" },
    { label: "About", href: "/about" },
    { label: "FAQ", href: "/faq" },
    { label: "Contact", href: "/contact" },
  ];

  const isActive = (path: string) => {
    if (path === "/" && pathname !== "/") return false;
    return pathname.startsWith(path);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-slate-200 shadow-sm transition-all w-full min-w-0">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="flex items-center justify-between h-20 w-full min-w-0">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center space-x-3 group min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[#1D4ED8] flex items-center justify-center text-white shadow-md group-hover:bg-blue-800 transition-colors flex-shrink-0">
              <GraduationCap className="w-6 h-6 flex-shrink-0 self-center" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-xl tracking-tight text-slate-900 leading-none truncate">
                LIFE WITH <span className="text-[#1D4ED8]">AI</span>
              </span>
              <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 mt-1 truncate">
                EdTech Platform
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1 lg:space-x-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-2 rounded-lg font-medium text-sm transition-colors ${
                  isActive(link.href)
                    ? "text-[#1D4ED8] bg-blue-50 font-semibold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Auth & Actions */}
          <div className="hidden md:flex items-center space-x-4">
            {loading ? (
              <div className="w-20 h-9 bg-slate-100 animate-pulse rounded-lg" />
            ) : user ? (
              <div className="flex items-center space-x-3">
                {isAdmin && (
                  <Link
                    href="/admin"
                    className="flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-semibold text-xs border border-indigo-200 transition-colors"
                  >
                    <ShieldCheck className="w-4 h-4 flex-shrink-0 self-center" />
                    <span>Admin Panel</span>
                  </Link>
                )}
                <Link
                  href="/dashboard"
                  className="flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 font-semibold text-xs transition-colors"
                >
                  <LayoutDashboard className="w-4 h-4 flex-shrink-0 self-center" />
                  <span>Dashboard</span>
                </Link>

                <div className="relative group/dropdown">
                  <button className="flex items-center space-x-2 p-1.5 rounded-full border border-slate-200 hover:border-slate-300 transition-colors bg-slate-50">
                    <div className="w-8 h-8 rounded-full bg-[#1D4ED8] text-white font-bold text-sm flex items-center justify-center uppercase">
                      {profile?.displayName?.charAt(0) || user.email?.charAt(0) || "U"}
                    </div>
                  </button>
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-100 py-2 hidden group-hover/dropdown:block group-focus-within/dropdown:block z-50">
                    <div className="px-4 py-2 border-b border-slate-100 mb-1">
                      <p className="text-sm font-semibold text-slate-900 truncate">
                        {profile?.displayName || "Student"}
                      </p>
                      <p className="text-xs text-slate-500 truncate">{user.email}</p>
                      <span className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-[#1D4ED8] uppercase tracking-wider">
                        {profile?.role || "Student"}
                      </span>
                    </div>
                    <Link
                      href="/dashboard/profile"
                      className="flex items-center px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      <UserIcon className="w-4 h-4 mr-2 text-slate-400 flex-shrink-0 self-center" />
                      My Profile
                    </Link>
                    <Link
                      href="/dashboard"
                      className="flex items-center px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      <BookOpen className="w-4 h-4 mr-2 text-slate-400 flex-shrink-0 self-center" />
                      My Courses
                    </Link>
                    <button
                      onClick={logout}
                      className="w-full text-left flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 border-t border-slate-100 mt-1"
                    >
                      <LogOut className="w-4 h-4 mr-2 flex-shrink-0 self-center" />
                      Sign Out
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <Link
                  href="/login"
                  className="px-4 py-2 rounded-lg font-medium text-sm text-slate-700 hover:text-[#1D4ED8] hover:bg-slate-50 transition-colors"
                >
                  Log In
                </Link>
                <Link
                  href="/register"
                  className="px-5 py-2.5 rounded-lg font-semibold text-sm bg-[#F59E0B] text-white hover:bg-[#D97706] shadow-sm hover:shadow transition-all duration-200"
                >
                  Register Now
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center space-x-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:outline-none"
              aria-label="Toggle Menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6 flex-shrink-0 self-center" /> : <Menu className="w-6 h-6 flex-shrink-0 self-center" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-slate-200 px-4 pt-2 pb-6 space-y-3 shadow-lg w-full min-w-0">
          <nav className="flex flex-col space-y-1 w-full min-w-0">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`px-4 py-3 rounded-lg font-medium text-base transition-colors w-full min-w-0 block truncate ${
                  isActive(link.href)
                    ? "text-[#1D4ED8] bg-blue-50 font-semibold"
                    : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="pt-4 border-t border-slate-200 flex flex-col space-y-3 w-full min-w-0">
            {user ? (
              <>
                <div className="flex items-center space-x-3 px-2 py-1 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-[#1D4ED8] text-white font-bold text-base flex items-center justify-center uppercase flex-shrink-0">
                    {profile?.displayName?.charAt(0) || user.email?.charAt(0) || "U"}
                  </div>
                  <div className="min-w-0 flex-1 overflow-hidden">
                    <p className="font-semibold text-slate-900 truncate">{profile?.displayName || "Student"}</p>
                    <p className="text-xs text-slate-500 truncate">{user.email}</p>
                  </div>
                </div>
                {isAdmin && (
                  <Link
                    href="/admin"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full flex items-center justify-center space-x-2 py-3 rounded-lg bg-indigo-50 text-indigo-700 font-semibold text-sm border border-indigo-200"
                  >
                    <ShieldCheck className="w-4 h-4 flex-shrink-0 self-center" />
                    <span>Admin Dashboard</span>
                  </Link>
                )}
                <Link
                  href="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full flex items-center justify-center space-x-2 py-3 rounded-lg bg-slate-100 text-slate-800 font-semibold text-sm"
                >
                  <LayoutDashboard className="w-4 h-4 flex-shrink-0 self-center" />
                  <span>Student Dashboard</span>
                </Link>
                <button
                  onClick={() => {
                    logout();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center justify-center space-x-2 py-3 rounded-lg bg-red-50 text-red-600 font-semibold text-sm"
                >
                  <LogOut className="w-4 h-4 flex-shrink-0 self-center" />
                  <span>Sign Out</span>
                </button>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-3 pt-2 w-full">
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-3 rounded-lg font-semibold text-center border border-slate-300 text-slate-700 hover:bg-slate-50 block"
                >
                  Log In
                </Link>
                <Link
                  href="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-3 rounded-lg font-semibold text-center bg-[#F59E0B] text-white hover:bg-[#D97706] block"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
