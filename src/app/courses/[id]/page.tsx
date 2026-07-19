/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/providers/ToastProvider";
import { Course, CourseContentResponse, Review } from "@/types";
import { formatCurrency, calculateDiscountedPrice, formatDate } from "@/utils";
import VideoPlayer from "@/components/shared/VideoPlayer";
import { CheckCircle2, Play, Lock, BookOpen, Star, Heart, ArrowRight } from "lucide-react";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/firebase/client";

declare global {
  interface Window {
    Razorpay: unknown;
  }
}

export default function CourseDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const { user, profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const isEnrolled = profile?.purchasedCourses?.includes(id) || profile?.role === "admin" || false;

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);
    return () => {
      try { document.body.removeChild(script); } catch {}
    };
  }, []);

  const { data: course, isLoading } = useQuery({
    queryKey: ["course-detail", id],
    queryFn: async () => {
      const res = await fetch(`/api/courses/${id}`);
      const json = await res.json();
      return json.course as Course;
    },
    enabled: !!id,
  });

  const { data: contentData } = useQuery({
    queryKey: ["course-content", id, user?.uid, isEnrolled],
    queryFn: async () => {
      const token = await user?.getIdToken();
      const res = await fetch(`/api/course-content?courseId=${id}`, token ? { headers: { Authorization: `Bearer ${token}` } } : undefined);
      if (!res.ok) throw new Error("Unable to load course content");
      const json = await res.json();
      return json as CourseContentResponse;
    },
    enabled: !!id,
  });

  const { data: reviewsData, refetch: refetchReviews } = useQuery({
    queryKey: ["course-reviews", id],
    queryFn: async () => {
      const res = await fetch(`/api/reviews?courseId=${id}&all=true`);
      const json = await res.json();
      return (json.reviews || []) as Review[];
    },
    enabled: !!id,
  });

  const folders = contentData?.folders || [];
  const items = contentData?.items || [];
  const reviews = reviewsData || [];
  const isWishlisted = profile?.wishlist?.includes(id) || false;

  const handleWishlistToggle = async () => {
    if (!user || !profile) {
      toast({ message: "Please sign in to add to wishlist", type: "info" });
      return;
    }
    try {
      const cur = profile.wishlist || [];
      const updated = cur.includes(id) ? cur.filter((i) => i !== id) : [...cur, id];
      await setDoc(doc(db, "users", user.uid), { wishlist: updated }, { merge: true });
      await refreshProfile();
      toast({ message: cur.includes(id) ? "Removed from wishlist" : "Added to wishlist", type: "success" });
    } catch {
      toast({ message: "Updated wishlist locally", type: "info" });
    }
  };

  const handleCheckout = async () => {
    if (!user) {
      toast({ message: "Please log in or register to purchase this course", type: "info" });
      router.push(`/login?redirect=/courses/${id}`);
      return;
    }

    if (!course) return;

    setCheckoutLoading(true);
    try {
      const finalPrice = calculateDiscountedPrice(course.price, course.discount);
      
      const orderRes = await fetch("/api/razorpay/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId: id,
          userId: user.uid,
          userEmail: user.email,
          userName: profile?.displayName || user.email?.split("@")[0],
          amount: finalPrice,
          courseTitle: course.title,
        }),
      });

      const orderData = await orderRes.json();
      if (orderData.error) {
        toast({ message: orderData.error, type: "error" });
        setCheckoutLoading(false);
        return;
      }

      const RazorpayConstructor = window.Razorpay as new (opts: unknown) => { open: () => void };
      if (RazorpayConstructor && !orderData.orderId.startsWith("order_mock_")) {
        const rzp = new RazorpayConstructor({
          key: orderData.keyId,
          amount: orderData.amount,
          currency: orderData.currency,
          name: "LIFE WITH AI EdTech",
          description: course.title,
          order_id: orderData.orderId,
          handler: async function (response: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) {
            const verRes = await fetch("/api/razorpay/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                userId: user.uid,
                courseId: id,
                amount: finalPrice,
              }),
            });
            const verData = await verRes.json();
            if (verData.success) {
              await refreshProfile();
              toast({ title: "Enrollment Complete!", message: "Welcome to the classroom!", type: "success" });
              router.push(`/dashboard/learn/${id}`);
            } else {
              toast({ message: "Verification failed", type: "error" });
            }
          },
          prefill: {
            name: profile?.displayName || "Student",
            email: user.email || "",
          },
          theme: { color: "#1D4ED8" },
        });
        rzp.open();
      } else {
        const simRes = await fetch("/api/razorpay/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            razorpay_order_id: orderData.orderId,
            razorpay_payment_id: `pay_sim_${Date.now()}`,
            razorpay_signature: "mock_signature_for_test",
            userId: user.uid,
            courseId: id,
            amount: finalPrice,
          }),
        });
        const simData = await simRes.json();
        if (simData.success) {
          await refreshProfile();
          toast({ title: "Enrollment Complete!", message: "Welcome to the classroom!", type: "success" });
          router.push(`/dashboard/learn/${id}`);
        }
      }
    } catch (err) {
      console.error("Checkout error:", err);
      toast({ message: "Payment initialization error", type: "error" });
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) {
      toast({ message: "Please sign in to submit a review", type: "info" });
      return;
    }
    setSubmittingReview(true);
    try {
      await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId: id,
          userId: user.uid,
          userName: profile.displayName || user.email?.split("@")[0],
          rating: reviewRating,
          comment: reviewComment,
        }),
      });
      setReviewComment("");
      refetchReviews();
      toast({ title: "Review Submitted", message: "Thank you for your academic feedback", type: "success" });
    } catch {
      toast({ message: "Could not submit review", type: "error" });
    } finally {
      setSubmittingReview(false);
    }
  };

  if (isLoading || !course) {
    return (
      <div className="max-w-[1280px] mx-auto px-4 py-16 animate-pulse space-y-8">
        <div className="h-80 bg-slate-200 rounded-3xl w-full" />
        <div className="grid grid-cols-3 gap-8">
          <div className="col-span-2 space-y-4">
            <div className="h-10 bg-slate-200 rounded w-3/4" />
            <div className="h-32 bg-slate-200 rounded" />
          </div>
          <div className="h-96 bg-slate-200 rounded-3xl" />
        </div>
      </div>
    );
  }

  const finalPrice = calculateDiscountedPrice(course.price, course.discount);

  return (
    <div className="bg-white pb-24">
      <div className="bg-slate-900 text-white py-16 lg:py-20 border-b border-slate-800">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl space-y-6">
            <div className="flex items-center space-x-3 text-xs font-semibold">
              <span className="px-3 py-1 rounded-full bg-blue-600/30 text-blue-300 border border-blue-400/30 uppercase tracking-wider">
                {course.categoryName}
              </span>
              <span className="text-slate-400">•</span>
              <span className="text-slate-300">{course.level} Level</span>
              <span className="text-slate-400">•</span>
              <span className="text-slate-300">{course.language}</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
              {course.title}
            </h1>

            <p className="text-lg text-slate-300 leading-relaxed">
              {course.subtitle || course.description?.slice(0, 160) + "..."}
            </p>

            <div className="flex items-center space-x-6 text-xs text-slate-400 pt-2">
              <div className="flex items-center space-x-1 text-amber-400 font-bold">
                <Star className="w-4 h-4 fill-amber-400" />
                <span>{course.averageRating || 5.0} Academic Rating</span>
              </div>
              <div className="flex items-center space-x-1">
                <BookOpen className="w-4 h-4" />
                <span>{folders.length} Folders</span>
              </div>
              <div>Updated {formatDate(course.updatedAt || course.createdAt)}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 mt-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-start">
          
          <div className="lg:col-span-2 space-y-16">
            
            <div className="space-y-4">
              <h3 className="font-bold text-xl text-slate-900">Course Media Preview</h3>
              {course.promoVideoUrl ? (
                <VideoPlayer src={course.promoVideoUrl} poster={course.bannerUrl || course.thumbnailUrl} />
              ) : course.bannerUrl || course.thumbnailUrl ? (
                <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-sm aspect-video bg-slate-100">
                  <img src={course.bannerUrl || course.thumbnailUrl} alt={course.title} className="w-full h-full object-cover" />
                </div>
              ) : null}
            </div>

            <div className="space-y-4">
              <h3 className="font-bold text-2xl text-slate-900 tracking-tight">Academic Overview</h3>
              <div className="prose prose-slate max-w-none text-slate-600 text-base leading-relaxed whitespace-pre-line">
                {course.description}
              </div>
            </div>

            <div className="bg-[#F8FAFC] p-8 rounded-3xl border border-slate-200/80 space-y-6">
              <h3 className="font-bold text-xl text-slate-900">What You Will Master</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(course.learningOutcomes || ["Build commercial architectures", "Deploy to production systems"]).map((outcome, i) => (
                  <div key={i} className="flex items-start space-x-3 text-sm text-slate-700 font-medium">
                    <CheckCircle2 className="w-5 h-5 text-[#1D4ED8] flex-shrink-0 mt-0.5" />
                    <span>{outcome}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-bold text-xl text-slate-900">Requirements & Prerequisites</h3>
              <ul className="list-disc list-inside space-y-2 text-sm text-slate-600">
                {(course.requirements || ["No prior experience required", "A laptop with internet connection"]).map((req, i) => (
                  <li key={i}>{req}</li>
                ))}
              </ul>
            </div>

            {isEnrolled ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-2xl text-slate-900 tracking-tight">Curriculum Syllabus</h3>
                {isEnrolled && <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">{items.length} Total Files</span>}
              </div>

              {folders.length === 0 ? (
                !isEnrolled && items.length > 0 ? (
                  <div className="space-y-1 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    {items.map((item) => <div key={item.id} className="flex items-center gap-2 rounded-xl px-2 py-2"><span className={item.type === "video" ? "text-blue-600" : item.type === "image" ? "text-emerald-600" : "text-amber-600"}>{item.type === "video" ? "▶" : item.type === "image" ? "🖼" : "📄"}</span><span className="truncate text-sm font-semibold text-slate-700">{item.title}</span></div>)}
                  </div>
                ) : (
                  <div className="bg-slate-50 p-8 rounded-2xl border border-slate-200 text-center text-sm text-slate-500">{!isEnrolled ? "This curriculum will be available after purchase." : "Curriculum lessons will be uploaded shortly by the instructor."}</div>
                )
              ) : (
                <div className="space-y-3">
                  {folders.map((folder) => {
                    const folderItems = items.filter((item) => item.folderId === folder.id).sort((a, b) => a.order - b.order);
                    return (
                      <div key={folder.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-900">
                          <span className="text-[#1D4ED8]">▼</span>
                          <span>{folder.name}</span>
                        </div>
                        <div className="space-y-1 border-t border-slate-100 pt-2">
                          {folderItems.map((item) => (
                            <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl px-2 py-2 hover:bg-slate-50">
                              <div className="flex min-w-0 items-center gap-2">
                                <span className={item.type === "video" ? "text-blue-600" : "text-amber-600"}>{item.type === "video" ? "▶" : "📄"}</span>
                                <span className="truncate text-sm font-semibold text-slate-700">{item.title}</span>
                              </div>
                              {item.type === "video" && !item.isFreePreview && <Lock className="h-4 w-4 flex-shrink-0 text-slate-400" />}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            ) : items.filter((item) => item.isFreePreview).length > 0 ? (
              <div className="space-y-4">
                <h3 className="font-bold text-2xl text-slate-900 tracking-tight">Free Preview</h3>
                <div className="space-y-1 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  {items.filter((item) => item.isFreePreview).map((item) => <div key={item.id} className="flex items-center gap-2 rounded-xl px-2 py-2"><span className={item.type === "video" ? "text-blue-600" : item.type === "image" ? "text-emerald-600" : "text-amber-600"}>{item.type === "video" ? "▶" : item.type === "image" ? "🖼" : "📄"}</span><span className="truncate text-sm font-semibold text-slate-700">{item.title}</span></div>)}
                </div>
              </div>
            ) : null}

            <div className="bg-white rounded-3xl border-2 border-slate-200 shadow-xl p-8 space-y-8">
              <div className="space-y-2 text-center pb-6 border-b border-slate-100">
                <span className="text-xs font-bold uppercase tracking-wider text-[#1D4ED8] block">Commercial Enrollment</span>
                <div className="flex items-baseline justify-center space-x-2">
                  <span className="text-4xl font-extrabold text-slate-900">
                    {formatCurrency(finalPrice)}
                  </span>
                  {course.discount > 0 && (
                    <span className="text-base text-slate-400 line-through font-semibold">
                      {formatCurrency(course.price)}
                    </span>
                  )}
                </div>
                {course.discount > 0 && (
                  <span className="inline-block text-[11px] font-extrabold px-2.5 py-0.5 bg-amber-100 text-[#D97706] rounded-full uppercase">
                    Save {course.discount}% Today
                  </span>
                )}
              </div>

              <div className="space-y-3">
                {isEnrolled ? (
                  <Link
                    href={`/dashboard/learn/${id}`}
                    className="w-full py-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center space-x-2 text-center"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    <span>Enter Classroom</span>
                  </Link>
                ) : (
                  <button
                    onClick={handleCheckout}
                    disabled={checkoutLoading}
                    className="w-full py-4 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] text-white font-extrabold text-base shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center space-x-2 disabled:opacity-50"
                  >
                    <span>{checkoutLoading ? "Connecting Razorpay..." : "Enroll Now with Razorpay"}</span>
                    {!checkoutLoading && <ArrowRight className="w-5 h-5" />}
                  </button>
                )}

                <button
                  onClick={handleWishlistToggle}
                  className={`w-full py-3 rounded-xl border border-slate-300 hover:bg-slate-50 font-bold text-xs flex items-center justify-center space-x-2 transition-colors ${
                    isWishlisted ? "text-red-600 border-red-200 bg-red-50" : "text-slate-700"
                  }`}
                >
                  <Heart className={`w-4 h-4 ${isWishlisted ? "fill-red-600" : ""}`} />
                  <span>{isWishlisted ? "Saved in Wishlist" : "Add to Wishlist"}</span>
                </button>
              </div>
            </div>

            <div className="space-y-8 pt-8 border-t border-slate-200">
              <h3 className="font-bold text-2xl text-slate-900 tracking-tight">Student Evaluations</h3>

              <div className="bg-[#FAFAFA] p-6 sm:p-8 rounded-3xl border border-slate-200 space-y-4">
                <h4 className="font-bold text-base text-slate-900">Leave Your Review</h4>
                <form onSubmit={handleReviewSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-700 mb-2">Rating</label>
                    <select
                      value={reviewRating}
                      onChange={(e) => setReviewRating(Number(e.target.value))}
                      className="px-4 py-2 rounded-xl border border-slate-300 text-sm font-semibold bg-white outline-none focus:border-[#1D4ED8]"
                    >
                      <option value="5">★★★★★ (5/5) Excellent</option>
                      <option value="4">★★★★☆ (4/5) Very Good</option>
                      <option value="3">★★★☆☆ (3/5) Average</option>
                      <option value="2">★★☆☆☆ (2/5) Poor</option>
                      <option value="1">★☆☆☆☆ (1/5) Terrible</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-700 mb-2">Academic Review Comment</label>
                    <textarea
                      rows={3}
                      required
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      placeholder="Share your detailed feedback on the instructional quality..."
                      className="w-full p-4 rounded-xl border border-slate-300 focus:border-[#1D4ED8] outline-none text-sm bg-white"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submittingReview}
                    className="px-6 py-2.5 rounded-xl bg-[#1D4ED8] hover:bg-blue-800 text-white font-bold text-xs transition-colors shadow"
                  >
                    {submittingReview ? "Submitting..." : "Post Review"}
                  </button>
                </form>
              </div>

              <div className="space-y-4">
                {reviews.length === 0 ? (
                  <p className="text-sm text-slate-500 italic">No evaluations posted yet. Be the first to evaluate this program.</p>
                ) : (
                  reviews.map((rev) => (
                    <div key={rev.id} className="p-6 rounded-2xl border border-slate-200 space-y-2 bg-white shadow-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-slate-900">{rev.userName}</span>
                        <span className="text-xs text-amber-500 font-bold">★ {rev.rating}/5</span>
                      </div>
                      <p className="text-sm text-slate-600 leading-relaxed">&quot;{rev.comment}&quot;</p>
                      <span className="text-[10px] text-slate-400 block pt-1">{formatDate(rev.createdAt)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}
