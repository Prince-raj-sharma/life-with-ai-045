"use client";

import React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { formatCurrency, formatDate } from "@/utils";
import { Order, UserProfile } from "@/types";
import { BarChart3, Users, ShoppingCart, BookOpen, ArrowUpRight, Plus } from "lucide-react";

export default function AdminAnalyticsPage() {
  const { data: statsData, isLoading } = useQuery({
    queryKey: ["admin-analytics-stats"],
    queryFn: async () => {
      const res = await fetch("/api/stats");
      const json = await res.json();
      return json.stats;
    },
  });

  if (isLoading || !statsData) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-12 bg-slate-200 rounded-xl w-1/3" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-slate-200 rounded-3xl" />
          ))}
        </div>
        <div className="h-80 bg-slate-200 rounded-3xl" />
      </div>
    );
  }

  const {
    totalRevenue = 0,
    totalOrders = 0,
    totalStudents = 0,
    totalCourses = 0,
    publishedCourses = 0,
    draftCourses = 0,
    recentPayments = [],
    recentRegistrations = [],
    chartData = [],
  } = statsData;

  const maxMonthRev = Math.max(...chartData.map((d: { revenue: number }) => d.revenue), 1000);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Commercial Analytics Overview</h1>
          <p className="text-sm text-slate-600">Real-time metrics calculated dynamically from Firestore repository</p>
        </div>

        <div className="flex items-center space-x-3">
          <Link
            href="/admin/courses/new"
            className="px-5 py-2.5 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] text-white font-bold text-xs flex items-center space-x-2 shadow transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Publish New Course</span>
          </Link>
        </div>
      </div>

      {/* Top Stat KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-slate-400">Total Revenue</span>
            <div className="p-2.5 bg-blue-50 text-[#1D4ED8] rounded-xl">
              <BarChart3 className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-slate-900">{formatCurrency(totalRevenue)}</div>
          <div className="flex items-center text-xs font-semibold text-emerald-600">
            <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" /> 100% Verified Sales
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-slate-400">Enrolled Students</span>
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-slate-900">{totalStudents}</div>
          <div className="flex items-center text-xs font-semibold text-slate-500">
            <span>Active Scholars</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-slate-400">Paid Orders</span>
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
              <ShoppingCart className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-slate-900">{totalOrders}</div>
          <div className="flex items-center text-xs font-semibold text-slate-500">
            <span>Razorpay Invoices</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-slate-400">Total Courses</span>
            <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
              <BookOpen className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-slate-900">{totalCourses}</div>
          <div className="flex items-center space-x-2 text-[11px] font-bold">
            <span className="text-emerald-600">{publishedCourses} Published</span>
            <span className="text-slate-300">•</span>
            <span className="text-amber-600">{draftCourses} Drafts</span>
          </div>
        </div>
      </div>

      {/* Monthly Revenue Graph */}
      <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-xl text-slate-900">Monthly Revenue Graph ({new Date().getFullYear()})</h3>
            <p className="text-xs text-slate-500">Commercial earnings performance across Vercel deployment</p>
          </div>
          <span className="text-xs font-extrabold uppercase px-3 py-1 rounded-full bg-blue-50 text-[#1D4ED8]">
            INR Currency
          </span>
        </div>

        <div className="h-64 flex items-end justify-between gap-2 pt-8 pb-2 border-b border-slate-100">
          {chartData.map((item: { name: string; revenue: number }, idx: number) => {
            const heightPct = maxMonthRev > 0 ? (item.revenue / maxMonthRev) * 100 : 0;
            return (
              <div key={idx} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
                <div className="text-[10px] font-bold text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  {formatCurrency(item.revenue)}
                </div>
                <div
                  className="w-full max-w-[40px] bg-[#1D4ED8] group-hover:bg-blue-800 rounded-t-xl transition-all duration-500 min-h-[4px]"
                  style={{ height: `${Math.max(heightPct, 3)}%` }}
                />
                <span className="text-xs font-semibold text-slate-600 mt-1">{item.name}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Activity Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Payments */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="font-bold text-lg text-slate-900">Recent Payments & Orders</h3>
              <Link href="/admin/orders" className="text-xs font-bold text-[#1D4ED8] hover:underline">
                View All Orders →
              </Link>
            </div>

            {recentPayments.length === 0 ? (
              <p className="text-xs text-slate-400 italic text-center py-6">No recent transactions recorded in database.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {recentPayments.map((order: Order) => (
                  <div key={order.id || order.razorpayOrderId} className="py-3.5 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-xs sm:text-sm text-slate-900 line-clamp-1">{order.courseTitle}</p>
                      <p className="text-[11px] text-slate-500">{order.userName} ({order.userEmail})</p>
                    </div>
                    <div className="text-right">
                      <span className="font-extrabold text-sm text-slate-900 block">{formatCurrency(order.amount)}</span>
                      <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                        {order.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Registrations */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="font-bold text-lg text-slate-900">Recent Scholar Registrations</h3>
              <Link href="/admin/students" className="text-xs font-bold text-[#1D4ED8] hover:underline">
                Manage Students →
              </Link>
            </div>

            {recentRegistrations.length === 0 ? (
              <p className="text-xs text-slate-400 italic text-center py-6">No newly registered students found.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {recentRegistrations.map((stu: UserProfile) => (
                  <div key={stu.uid} className="py-3.5 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-9 h-9 rounded-full bg-blue-100 text-[#1D4ED8] font-bold text-xs flex items-center justify-center uppercase">
                        {stu.displayName?.charAt(0) || "S"}
                      </div>
                      <div>
                        <p className="font-bold text-xs sm:text-sm text-slate-900">{stu.displayName}</p>
                        <p className="text-[11px] text-slate-500 truncate max-w-[200px]">{stu.email}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block">{formatDate(stu.createdAt)}</span>
                      <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">Student</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
