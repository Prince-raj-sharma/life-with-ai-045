/* eslint-disable @next/next/no-img-element */
import React from "react";
import Link from "next/link";
import { Course } from "@/types";
import { formatCurrency, calculateDiscountedPrice } from "@/utils";
import { BookOpen, BarChart2 } from "lucide-react";

export default function CourseCard({ course }: { course: Course }) {
  const finalPrice = calculateDiscountedPrice(course.price, course.discount);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 flex flex-col h-full group">
      <div className="relative aspect-video w-full bg-slate-100 overflow-hidden">
        {course.thumbnailUrl ? (
          <img
            src={course.thumbnailUrl}
            alt={course.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 text-slate-400">
            <BookOpen className="w-12 h-12 text-[#1D4ED8]/40" />
          </div>
        )}
        {course.discount > 0 && (
          <div className="absolute top-3 left-3 bg-[#F59E0B] text-white text-[11px] font-bold px-2.5 py-1 rounded-full shadow-sm uppercase tracking-wider">
            {course.discount}% OFF
          </div>
        )}
        <div className="absolute top-3 right-3 bg-slate-900/80 backdrop-blur-md text-white text-xs font-semibold px-2.5 py-1 rounded-lg">
          {course.level}
        </div>
      </div>

      <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold text-[#1D4ED8] bg-blue-50 px-2 py-0.5 rounded uppercase tracking-wider">
              {course.categoryName || "General"}
            </span>
            <div className="flex items-center space-x-1 text-slate-600 font-medium">
              <BarChart2 className="w-3.5 h-3.5 text-slate-400" />
              <span>{course.language || "English"}</span>
            </div>
          </div>

          <h3 className="font-bold text-lg text-slate-900 line-clamp-2 group-hover:text-[#1D4ED8] transition-colors leading-snug">
            {course.title}
          </h3>

          <p className="text-sm text-slate-600 line-clamp-2 leading-relaxed">
            {course.subtitle}
          </p>
        </div>

        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
          <div>
            <div className="flex items-baseline space-x-2">
              <span className="font-extrabold text-xl text-slate-900">
                {formatCurrency(finalPrice)}
              </span>
              {course.discount > 0 && (
                <span className="text-xs text-slate-400 line-through font-medium">
                  {formatCurrency(course.price)}
                </span>
              )}
            </div>
          </div>

          <Link
            href={`/courses/${course.id}`}
            className="px-4 py-2 rounded-xl bg-[#1D4ED8] hover:bg-blue-800 text-white font-semibold text-sm shadow-sm hover:shadow transition-all"
          >
            Explore
          </Link>
        </div>
      </div>
    </div>
  );
}
