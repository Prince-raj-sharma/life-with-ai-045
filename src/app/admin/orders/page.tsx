"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Order } from "@/types";
import { formatCurrency, formatDate } from "@/utils";
import { ShoppingCart, CheckCircle2 } from "lucide-react";

export default function AdminOrdersPage() {
  const { data: orders, isLoading } = useQuery({
    queryKey: ["admin-orders-list"],
    queryFn: async () => {
      const res = await fetch("/api/stats");
      const json = await res.json();
      return (json.stats?.recentPayments || []) as Order[];
    },
  });

  const allOrders = orders || [];

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="pb-4 border-b border-slate-200">
        <h1 className="text-3xl font-extrabold text-slate-900">Orders & Transaction Ledger</h1>
        <p className="text-sm text-slate-600">Review official Razorpay payment logs and generated invoices</p>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm p-6 sm:p-8">
        {isLoading ? (
          <div className="h-64 bg-slate-100 animate-pulse rounded-2xl" />
        ) : allOrders.length === 0 ? (
          <div className="text-center py-12 space-y-3">
            <ShoppingCart className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="font-bold text-lg text-slate-700">No Orders Recorded</h3>
            <p className="text-xs text-slate-400">Transactions appear here automatically upon student purchase.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-bold uppercase text-slate-500 bg-slate-50">
                  <th className="p-4">Invoice #</th>
                  <th className="p-4">Course Program</th>
                  <th className="p-4">Scholar Details</th>
                  <th className="p-4">Amount</th>
                  <th className="p-4">Date</th>
                  <th className="p-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm font-medium">
                {allOrders.map((o) => (
                  <tr key={o.id || o.razorpayOrderId} className="hover:bg-slate-50">
                    <td className="p-4 font-mono text-xs text-slate-500">{o.invoiceNumber || o.razorpayOrderId}</td>
                    <td className="p-4 font-bold text-slate-900">{o.courseTitle}</td>
                    <td className="p-4">
                      <p className="text-slate-900 font-semibold">{o.userName}</p>
                      <p className="text-xs text-slate-500">{o.userEmail}</p>
                    </td>
                    <td className="p-4 font-extrabold text-slate-900">{formatCurrency(o.amount)}</td>
                    <td className="p-4 text-xs text-slate-500">{formatDate(o.createdAt)}</td>
                    <td className="p-4 text-right">
                      <span className="text-[10px] font-bold uppercase px-2 py-1 rounded bg-emerald-100 text-emerald-800 inline-flex items-center">
                        <CheckCircle2 className="w-3 h-3 mr-1" /> {o.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
