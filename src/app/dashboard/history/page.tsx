"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/providers/AuthProvider";
import { Order } from "@/types";
import { formatCurrency, formatDate } from "@/utils";
import { Clock, Download } from "lucide-react";

export default function StudentPaymentHistoryPage() {
  const { user } = useAuth();

  const { data: orders, isLoading } = useQuery({
    queryKey: ["dashboard-my-orders", user?.uid],
    queryFn: async () => {
      const res = await fetch(`/api/my-orders?uid=${user?.uid}`);
      const json = await res.json();
      return (json.orders || []) as Order[];
    },
  });

  const myOrders = orders || [];

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center space-x-3 pb-4 border-b border-slate-200">
        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
          <Clock className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Payment History & Invoices</h1>
          <p className="text-xs text-slate-500">Official Razorpay transaction receipts and download logs</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm p-6 sm:p-8">
        {isLoading ? (
          <div className="h-48 bg-slate-100 animate-pulse rounded-2xl" />
        ) : myOrders.length === 0 ? (
          <div className="text-center py-12 space-y-3">
            <Clock className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="font-bold text-lg text-slate-700">No Payment Records</h3>
            <p className="text-xs text-slate-400">Your purchased course receipts will appear here automatically.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-bold uppercase text-slate-500 bg-slate-50">
                  <th className="p-4">Receipt ID</th>
                  <th className="p-4">Program Title</th>
                  <th className="p-4">Amount Paid</th>
                  <th className="p-4">Date</th>
                  <th className="p-4 text-right">Invoice</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm font-medium">
                {myOrders.map((o) => (
                  <tr key={o.id || o.razorpayOrderId} className="hover:bg-slate-50">
                    <td className="p-4 font-mono text-xs text-slate-500">{o.invoiceNumber || o.razorpayOrderId}</td>
                    <td className="p-4 font-bold text-slate-900">{o.courseTitle}</td>
                    <td className="p-4 font-extrabold text-slate-900">{formatCurrency(o.amount)}</td>
                    <td className="p-4 text-xs text-slate-500">{formatDate(o.createdAt)}</td>
                    <td className="p-4 text-right">
                      <button onClick={() => window.print()} className="px-3 py-1.5 rounded-lg bg-blue-50 text-[#1D4ED8] hover:bg-blue-100 font-bold text-xs inline-flex items-center">
                        <Download className="w-3 h-3 mr-1" /> PDF Invoice
                      </button>
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
