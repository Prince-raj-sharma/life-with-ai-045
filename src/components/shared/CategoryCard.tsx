import React from "react";
import Link from "next/link";
import { Category } from "@/lib/types";
import { Code, Cpu, Database, Globe, Terminal, Shield, Layers } from "lucide-react";

export default function CategoryCard({ category }: { category: Category }) {
  const getIcon = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes("ai") || n.includes("artificial") || n.includes("machine")) return <Cpu className="w-6 h-6 text-[#1D4ED8]" />;
    if (n.includes("web") || n.includes("frontend")) return <Globe className="w-6 h-6 text-[#1D4ED8]" />;
    if (n.includes("data") || n.includes("sql")) return <Database className="w-6 h-6 text-[#1D4ED8]" />;
    if (n.includes("code") || n.includes("program")) return <Code className="w-6 h-6 text-[#1D4ED8]" />;
    if (n.includes("security") || n.includes("cyber")) return <Shield className="w-6 h-6 text-[#1D4ED8]" />;
    if (n.includes("backend") || n.includes("devops")) return <Terminal className="w-6 h-6 text-[#1D4ED8]" />;
    return <Layers className="w-6 h-6 text-[#1D4ED8]" />;
  };

  return (
    <Link
      href={`/courses?category=${category.id}`}
      className="bg-white p-6 rounded-2xl border border-slate-200 hover:border-[#1D4ED8] hover:shadow-md transition-all duration-300 flex items-center space-x-4 group"
    >
      <div className="w-12 h-12 rounded-xl bg-blue-50 group-hover:bg-[#1D4ED8] flex items-center justify-center group-hover:text-white transition-colors">
        {React.cloneElement(getIcon(category.name), {
          className: "w-6 h-6 transition-colors group-hover:text-white text-[#1D4ED8]"
        })}
      </div>
      <div>
        <h4 className="font-bold text-slate-900 group-hover:text-[#1D4ED8] transition-colors">{category.name}</h4>
        <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{category.description || "Explore specialized curriculum"}</p>
      </div>
    </Link>
  );
}
