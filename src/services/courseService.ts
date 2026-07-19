import { Course } from "@/types";

export async function fetchCourses(params?: { category?: string; level?: string; search?: string; all?: boolean }) {
  const query = new URLSearchParams();
  if (params?.category && params.category !== "all") query.append("category", params.category);
  if (params?.level && params.level !== "all") query.append("level", params.level);
  if (params?.search) query.append("search", params.search);
  if (params?.all) query.append("all", "true");

  const res = await fetch(`/api/courses?${query.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch courses");
  const data = await res.json();
  return (data.courses || []) as Course[];
}

export async function fetchCourseById(id: string) {
  const res = await fetch(`/api/courses/${id}`);
  if (!res.ok) throw new Error("Course not found");
  const data = await res.json();
  return data.course as Course;
}
