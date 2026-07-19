export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

type OrderRecord = Record<string, unknown> & { id: string; createdAt?: string };

export async function GET(req: NextRequest) {
  try {
    const uid = req.nextUrl.searchParams.get("uid");

    if (!uid) {
      return NextResponse.json({ orders: [] });
    }

    const snapshot = await adminDb
      .collection("orders")
      .where("userId", "==", uid)
      .where("status", "==", "paid")
      .get();

    const orders: OrderRecord[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }) as OrderRecord);

    orders.sort(
      (a, b) =>
        new Date(b.createdAt || 0).getTime() -
        new Date(a.createdAt || 0).getTime()
    );

    return NextResponse.json({ orders });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ orders: [] });
  }
}
