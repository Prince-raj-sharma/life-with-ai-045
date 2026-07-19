"use client";

import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/providers/ToastProvider";
import { Category } from "@/types";
import { Trash2, Tag } from "lucide-react";

export default function AdminCategoriesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { data: cats, refetch, isLoading } = useQuery({
    queryKey: ["admin-cats-manage"],
    queryFn: async () => {
      const res = await fetch("/api/categories");
      const json = await res.json();
      return (json.categories || []) as Category[];
    },
  });

  const categories = cats || [];

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    setSubmitting(true);
    try {
      await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description: desc }),
      });
      setName("");
      setDesc("");
      await refetch();
      queryClient.invalidateQueries({ queryKey: ["admin-cats-manage"] });
      queryClient.invalidateQueries({ queryKey: ["categories-home"] });
      queryClient.invalidateQueries({ queryKey: ["categories-catalog"] });
      queryClient.invalidateQueries({ queryKey: ["admin-cats-new"] });
      toast({ title: "Created", message: "Category added successfully to Firestore", type: "success" });
    } catch {
      toast({ message: "Failed to create category", type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete category?")) return;
    try {
      await fetch(`/api/categories?id=${id}`, { method: "DELETE" });
      await refetch();
      queryClient.invalidateQueries({ queryKey: ["admin-cats-manage"] });
      queryClient.invalidateQueries({ queryKey: ["categories-home"] });
      queryClient.invalidateQueries({ queryKey: ["categories-catalog"] });
      queryClient.invalidateQueries({ queryKey: ["admin-cats-new"] });
      toast({ message: "Category deleted", type: "success" });
    } catch {
      toast({ message: "Error deleting category", type: "error" });
    }
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-5xl w-full min-w-0 overflow-hidden">
      <div className="pb-4 border-b border-slate-200">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 truncate">Manage Domain Categories</h1>
        <p className="text-xs sm:text-sm text-slate-600 truncate">Organize course specializations dynamically stored in Firestore</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start w-full">
        <form onSubmit={handleAdd} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4 md:col-span-1 h-max w-full min-w-0">
          <h3 className="font-bold text-base text-slate-900">Add New Category</h3>
          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Domain Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Cybersecurity" required className="w-full p-3 rounded-xl border border-slate-300 text-sm font-semibold" />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Description</label>
            <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} placeholder="Short overview" className="w-full p-3 rounded-xl border border-slate-300 text-sm" />
          </div>
          <button type="submit" disabled={submitting} className="w-full py-3 rounded-xl bg-[#1D4ED8] hover:bg-blue-800 text-white font-bold text-xs shadow transition-all disabled:opacity-50">
            {submitting ? "Saving to Firestore..." : "Save Category"}
          </button>
        </form>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm md:col-span-2 space-y-4 w-full min-w-0 overflow-hidden">
          <h3 className="font-bold text-lg text-slate-900">Active Firestore Categories ({categories.length})</h3>
          {isLoading ? (
            <div className="h-40 bg-slate-100 animate-pulse rounded-2xl w-full" />
          ) : categories.length === 0 ? (
            <p className="text-sm text-slate-400 italic py-6 text-center">No categories created yet. Create one on the left.</p>
          ) : (
            <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl overflow-hidden w-full min-w-0">
              {categories.map((c) => (
                <div key={c.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors gap-3 w-full min-w-0">
                  <div className="flex items-center space-x-3 min-w-0 flex-1">
                    <Tag className="w-5 h-5 text-[#1D4ED8] flex-shrink-0 self-center" />
                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-sm text-slate-900 truncate">{c.name}</h4>
                      <p className="text-xs text-slate-500 truncate">{c.description || "Slug: " + c.slug}</p>
                    </div>
                  </div>
                  <button onClick={() => handleDelete(c.id!)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg flex-shrink-0 self-center" aria-label="Delete">
                    <Trash2 className="w-4 h-4 flex-shrink-0" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
