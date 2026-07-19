"use client";

import React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Course, Category, Review } from "@/lib/types";
import CourseCard from "@/components/shared/CourseCard";
import CategoryCard from "@/components/shared/CategoryCard";
import { GraduationCap, CheckCircle2, BookOpen, Sparkles, Cpu, Award, ChevronDown } from "lucide-react";

export default function HomePage() {
  // Fetch published courses
  const { data: coursesData, isLoading: coursesLoading } = useQuery({
    queryKey: ["courses-home"],
    queryFn: async () => {
      const res = await fetch("/api/courses");
      const json = await res.json();
      return (json.courses || []) as Course[];
    },
  });

  // Fetch categories
  const { data: categoriesData, isLoading: catsLoading } = useQuery({
    queryKey: ["categories-home"],
    queryFn: async () => {
      const res = await fetch("/api/categories");
      const json = await res.json();
      return (json.categories || []) as Category[];
    },
  });

  // Fetch testimonials
  const { data: testimonialsData } = useQuery({
    queryKey: ["testimonials-home"],
    queryFn: async () => {
      const res = await fetch("/api/reviews?all=true");
      const json = await res.json();
      return (json.reviews || []) as Review[];
    },
  });

  const featuredCourses = coursesData?.slice(0, 6) || [];
  const categories = categoriesData?.slice(0, 8) || [];
  const testimonials = testimonialsData || [];

  const faqs = [
    {
      q: "Who can enroll in LIFE WITH AI programs?",
      a: "Our courses are engineered for everyone from ambitious university students to seasoned professionals looking to master coding, programming, and artificial intelligence without any prerequisite roadblocks."
    },
    {
      q: "How do I access course videos and study PDFs?",
      a: "Once you purchase a course via our secure Razorpay gateway, all high-definition Cloudflare R2 video streams and downloadable curriculum PDFs unlock immediately inside your Student Dashboard."
    },
    {
      q: "Will I receive an official certificate upon completion?",
      a: "Yes! Upon finishing all lesson modules in your enrolled course, our dynamic certification engine verifies your progress and issues a verifiable academic certificate with a unique credential ID."
    },
    {
      q: "Can I learn at my own pace?",
      a: "Absolutely. You get lifetime access to all enrolled programs, allowing you to study from any laptop or device whenever it suits your academic or corporate schedule."
    }
  ];

  const [openFaq, setOpenFaq] = React.useState<number | null>(0);

  return (
    <div className="bg-white text-slate-900 overflow-x-hidden">
      {/* Hero Section */}
      <section className="relative h-screen w-full flex items-center justify-center overflow-hidden bg-slate-900">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_#1d4ed8_0%,_#0f172a_48%,_#020617_100%)]" />
        <div className="absolute inset-0 bg-slate-950/35 backdrop-blur-[2px]" />

        {/* Hero Content */}
        <div className="relative z-10 max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 text-center flex flex-col items-center justify-center space-y-8 mt-12">
          <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-blue-600/20 border border-blue-400/30 text-blue-300 backdrop-blur-md text-xs font-semibold uppercase tracking-widest animate-fade-in">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Commercial University-Grade Platform</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white max-w-5xl leading-tight sm:leading-none">
            Transform Your Future with <span className="text-blue-400">AI</span>
          </h1>

          <p className="text-lg sm:text-xl text-slate-300 max-w-3xl leading-relaxed font-normal">
            Master professional programming, software engineering, and applied artificial intelligence through rigorous, industry-recognized academic curriculum.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 pt-4 w-full max-w-md mx-auto">
            <Link
              href="/courses"
              className="w-full sm:w-auto px-8 py-4 rounded-xl font-bold text-base bg-[#F59E0B] hover:bg-[#D97706] text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5 text-center"
            >
              Explore Courses
            </Link>
            <Link
              href="/register"
              className="w-full sm:w-auto px-8 py-4 rounded-xl font-bold text-base bg-[#1D4ED8] hover:bg-blue-800 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5 text-center border border-blue-600"
            >
              Start Learning
            </Link>
          </div>

          {/* Key Trust Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 pt-16 border-t border-white/10 max-w-4xl w-full text-slate-300 text-xs sm:text-sm font-medium">
            <div className="flex items-center justify-center space-x-2">
              <CheckCircle2 className="w-5 h-5 text-blue-400 flex-shrink-0" />
              <span>Vercel Ready Deployment</span>
            </div>
            <div className="flex items-center justify-center space-x-2">
              <CheckCircle2 className="w-5 h-5 text-blue-400 flex-shrink-0" />
              <span>Cloudflare R2 HD Streaming</span>
            </div>
            <div className="flex items-center justify-center space-x-2">
              <CheckCircle2 className="w-5 h-5 text-blue-400 flex-shrink-0" />
              <span>Razorpay Instant Unlock</span>
            </div>
            <div className="flex items-center justify-center space-x-2">
              <CheckCircle2 className="w-5 h-5 text-blue-400 flex-shrink-0" />
              <span>Verifiable Certificates</span>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Courses Section */}
      <section className="py-24 bg-[#F8FAFC]">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-12">
          <div className="space-y-4 max-w-3xl mx-auto">
            <h2 className="text-xs uppercase tracking-widest font-bold text-[#1D4ED8]">Academic Excellence</h2>
            <h3 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">Featured Learning Programs</h3>
            <p className="text-slate-600 text-base">Explore our meticulously curated courses designed to accelerate your technological competency.</p>
          </div>

          {coursesLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-96 rounded-2xl bg-slate-200 animate-pulse" />
              ))}
            </div>
          ) : featuredCourses.length === 0 ? (
            <div className="bg-white rounded-3xl p-16 border border-slate-200 shadow-sm max-w-2xl mx-auto space-y-4">
              <div className="w-16 h-16 bg-blue-50 text-[#1D4ED8] rounded-2xl flex items-center justify-center mx-auto">
                <BookOpen className="w-8 h-8" />
              </div>
              <h4 className="text-2xl font-bold text-slate-800">No Courses Available</h4>
              <p className="text-slate-500 text-sm max-w-md mx-auto">
                The Firestore curriculum repository is currently empty. Please sign in as Admin to publish the inaugural academic course.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 text-left">
              {featuredCourses.map((course) => (
                <CourseCard key={course.id} course={course} />
              ))}
            </div>
          )}

          {featuredCourses.length > 0 && (
            <div className="pt-6">
              <Link
                href="/courses"
                className="inline-flex items-center space-x-2 px-8 py-3.5 rounded-xl border-2 border-[#1D4ED8] text-[#1D4ED8] hover:bg-[#1D4ED8] hover:text-white font-bold text-sm transition-all duration-300"
              >
                <span>View Full Catalog</span>
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-24 bg-white">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-12">
          <div className="space-y-4 max-w-3xl mx-auto">
            <h2 className="text-xs uppercase tracking-widest font-bold text-[#1D4ED8]">Domain Specializations</h2>
            <h3 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">Browse by Category</h3>
            <p className="text-slate-600 text-base">Select your focus area and dive into structured university-aligned paths.</p>
          </div>

          {catsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-24 bg-slate-100 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : categories.length === 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
              {[
                { id: "cat1", name: "Artificial Intelligence", slug: "ai", description: "Deep learning & neural networks" },
                { id: "cat2", name: "Software Engineering", slug: "se", description: "Enterprise architecture & design" },
                { id: "cat3", name: "Fullstack Development", slug: "fs", description: "Next.js, React & Node systems" },
                { id: "cat4", name: "Data Science", slug: "ds", description: "Big data analytics & Python" }
              ].map((c) => (
                <CategoryCard key={c.id} category={c as Category} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
              {categories.map((cat) => (
                <CategoryCard key={cat.id} category={cat} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Why Choose Us Section */}
      <section className="py-24 bg-[#FAFAFA] border-y border-slate-200/80">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          <div className="text-center space-y-4 max-w-3xl mx-auto">
            <h2 className="text-xs uppercase tracking-widest font-bold text-[#1D4ED8]">The Academic Edge</h2>
            <h3 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">Why Choose LIFE WITH AI</h3>
            <p className="text-slate-600 text-base">We bridge the gap between traditional university rigor and modern software engineering demands.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 text-center">
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-5">
              <div className="w-14 h-14 bg-blue-50 text-[#1D4ED8] rounded-2xl flex items-center justify-center mx-auto">
                <GraduationCap className="w-7 h-7" />
              </div>
              <h4 className="font-bold text-xl text-slate-900">Commercial Grade Standards</h4>
              <p className="text-slate-600 text-sm leading-relaxed">
                No filler tutorials. Every program is built with commercial software engineering patterns and real-world deployment practices.
              </p>
            </div>

            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-5">
              <div className="w-14 h-14 bg-blue-50 text-[#1D4ED8] rounded-2xl flex items-center justify-center mx-auto">
                <Cpu className="w-7 h-7" />
              </div>
              <h4 className="font-bold text-xl text-slate-900">Seamless Media Streaming</h4>
              <p className="text-slate-600 text-sm leading-relaxed">
                Powered by Cloudflare R2 object storage and public delivery, ensuring reliable video lectures without a separate media platform.
              </p>
            </div>

            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-5">
              <div className="w-14 h-14 bg-blue-50 text-[#1D4ED8] rounded-2xl flex items-center justify-center mx-auto">
                <Award className="w-7 h-7" />
              </div>
              <h4 className="font-bold text-xl text-slate-900">Verified Certification</h4>
              <p className="text-slate-600 text-sm leading-relaxed">
                Earn verifiable academic certificates automatically upon completion, backed by permanent Firestore credential records.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Learning Journey Section */}
      <section className="py-24 bg-white">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          <div className="text-center space-y-4 max-w-3xl mx-auto">
            <h2 className="text-xs uppercase tracking-widest font-bold text-[#1D4ED8]">Structured Progression</h2>
            <h3 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">Your Learning Journey</h3>
            <p className="text-slate-600 text-base">A streamlined 4-step roadmap from student enrollment to career transformation.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative">
            {[
              { step: "01", title: "Select Course", desc: "Browse specialized programs matching your career objectives." },
              { step: "02", title: "Instant Unlock", desc: "Purchase securely via Razorpay to instantly unlock full curriculum." },
              { step: "03", title: "Master Curriculum", desc: "Stream HD video lectures and download comprehensive study PDFs." },
              { step: "04", title: "Earn Credential", desc: "Complete evaluations and download your official academic certificate." },
            ].map((item, idx) => (
              <div key={idx} className="relative bg-[#F8FAFC] p-8 rounded-3xl border border-slate-200/80 flex flex-col justify-between space-y-6 text-center group hover:bg-blue-50/50 transition-colors">
                <div className="w-12 h-12 rounded-2xl bg-[#1D4ED8] text-white font-extrabold text-lg flex items-center justify-center mx-auto shadow-md">
                  {item.step}
                </div>
                <div className="space-y-2">
                  <h4 className="font-bold text-lg text-slate-900">{item.title}</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials (Only if Admin adds them) */}
      {testimonials.length > 0 && (
        <section className="py-24 bg-[#F8FAFC] border-t border-slate-200/80">
          <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
            <div className="text-center space-y-4 max-w-3xl mx-auto">
              <h2 className="text-xs uppercase tracking-widest font-bold text-[#1D4ED8]">Student Perspectives</h2>
              <h3 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">What Our Learners Say</h3>
              <p className="text-slate-600 text-base">Real feedback from verified enrolled students.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {testimonials.slice(0, 3).map((t) => (
                <div key={t.id} className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4 text-left flex flex-col justify-between">
                  <p className="text-sm text-slate-700 italic leading-relaxed">&quot;{t.comment}&quot;</p>
                  <div className="flex items-center space-x-3 pt-4 border-t border-slate-100">
                    <div className="w-10 h-10 rounded-full bg-[#1D4ED8] text-white font-bold flex items-center justify-center uppercase">
                      {t.userName.charAt(0)}
                    </div>
                    <div>
                      <h5 className="font-bold text-sm text-slate-900">{t.userName}</h5>
                      <span className="text-xs text-amber-500 font-semibold">★ {t.rating}.0 / 5.0</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* FAQ Section */}
      <section className="py-24 bg-white border-t border-slate-200/80">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          <div className="text-center space-y-4 max-w-3xl mx-auto">
            <h2 className="text-xs uppercase tracking-widest font-bold text-[#1D4ED8]">Clear Answers</h2>
            <h3 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">Frequently Asked Questions</h3>
            <p className="text-slate-600 text-base">Everything you need to know about our EdTech platform.</p>
          </div>

          <div className="max-w-3xl mx-auto space-y-4">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="border border-slate-200 rounded-2xl overflow-hidden transition-all bg-[#FAFAFA]"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  className="w-full px-6 py-5 text-left font-bold text-base text-slate-900 flex items-center justify-between focus:outline-none"
                >
                  <span>{faq.q}</span>
                  <ChevronDown className={`w-5 h-5 text-slate-500 transition-transform duration-300 ${openFaq === index ? "transform rotate-180 text-[#1D4ED8]" : ""}`} />
                </button>
                {openFaq === index && (
                  <div className="px-6 pb-5 pt-1 text-sm text-slate-600 leading-relaxed border-t border-slate-100 bg-white">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact CTA Section */}
      <section className="py-20 bg-[#1D4ED8] text-white">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
          <h3 className="text-3xl sm:text-5xl font-extrabold tracking-tight max-w-3xl mx-auto">
            Ready to Accelerate Your Career with AI?
          </h3>
          <p className="text-blue-100 text-lg max-w-2xl mx-auto leading-relaxed">
            Join thousands of ambitious students mastering the next generation of computing.
          </p>
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/courses"
              className="px-8 py-4 rounded-xl font-bold text-base bg-[#F59E0B] hover:bg-[#D97706] text-white shadow-lg hover:shadow-xl transition-all duration-200"
            >
              Browse All Courses
            </Link>
            <Link
              href="/contact"
              className="px-8 py-4 rounded-xl font-bold text-base bg-white text-[#1D4ED8] hover:bg-blue-50 shadow-lg hover:shadow-xl transition-all duration-200"
            >
              Contact Support
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
