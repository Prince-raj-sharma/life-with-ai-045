export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function GET() {
  try {
    const coursesSnap = await adminDb.collection("courses").get();
    const allCourses = coursesSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const totalCourses = allCourses.length;
    const publishedCourses = allCourses.filter((c: unknown) => (c as { isPublished?: boolean }).isPublished === true).length;
    const draftCourses = totalCourses - publishedCourses;

    const usersSnap = await adminDb.collection("users").get();
    const allUsers = usersSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const students = allUsers.filter((u: unknown) => (u as { role?: string }).role !== "admin");
    const totalStudents = students.length;

    // Recent registrations
    students.sort((a: unknown, b: unknown) => {
      const itemA = a as { createdAt?: string };
      const itemB = b as { createdAt?: string };
      return new Date(itemB.createdAt || 0).getTime() - new Date(itemA.createdAt || 0).getTime();
    });
    const recentRegistrations = students.slice(0, 5);

    const ordersSnap = await adminDb.collection("orders").get();
    const orders = ordersSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    

    const paidOrders = orders.filter((o: unknown) => {
      const item = o as { status?: string };
      return item.status === "paid";
    });
    const totalOrders = paidOrders.length;
    const totalRevenue = paidOrders.reduce((acc: number, o: unknown) => {
      const item = o as { amount?: number };
      return acc + Number(item.amount || 0);
    }, 0);

    // Recent orders / payments
    orders.sort((a: unknown, b: unknown) => {
      const itemA = a as { createdAt?: string };
      const itemB = b as { createdAt?: string };
      return new Date(itemB.createdAt || 0).getTime() - new Date(itemA.createdAt || 0).getTime();
    });
    const recentPayments = paidOrders
      .sort((a: unknown, b: unknown) => {
        const itemA = a as { createdAt?: string };
        const itemB = b as { createdAt?: string };
        return new Date(itemB.createdAt || 0).getTime() - new Date(itemA.createdAt || 0).getTime();
      })
      .slice(0, 5);

    // Sales chart data calculated by month
    const monthlySales: { [month: string]: number } = {};
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    months.forEach((m) => { monthlySales[m] = 0; });

    orders.forEach((o: unknown) => {
      const item = o as { createdAt?: string; amount?: number };
      if (item.createdAt) {
        const d = new Date(item.createdAt);
        const mName = months[d.getMonth()];
        if (monthlySales[mName] !== undefined) {
          monthlySales[mName] += Number(item.amount || 0);
        }
      }
    });

    const chartData = months.map((m) => ({ name: m, revenue: monthlySales[m] }));

    return NextResponse.json({
      stats: {
        totalRevenue,
        totalOrders,
        totalStudents,
        totalCourses,
        publishedCourses,
        draftCourses,
        recentPayments,
        recentRegistrations,
        chartData,
      }
    });
  } catch (error: unknown) {
    console.warn("GET stats warning (offline/placeholder mode):", error);
    return NextResponse.json({
      stats: {
        totalRevenue: 0,
        totalOrders: 0,
        totalStudents: 0,
        totalCourses: 0,
        publishedCourses: 0,
        draftCourses: 0,
        recentPayments: [],
        recentRegistrations: [],
        chartData: [
          { name: "Jan", revenue: 0 },
          { name: "Feb", revenue: 0 },
          { name: "Mar", revenue: 0 },
          { name: "Apr", revenue: 0 },
          { name: "May", revenue: 0 },
          { name: "Jun", revenue: 0 },
        ],
      }
    });
  }
}
