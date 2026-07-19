export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { razorpayInstance } from "@/lib/razorpay";
import { adminDb } from "@/lib/firebase-admin";
import { generateInvoiceNumber } from "@/lib/utils";

export async function POST(req: NextRequest) {
  try {
    const { courseId, userId, userEmail, amount } = await req.json();

    if (!courseId || !userId || !amount) {
      return NextResponse.json({ error: "Missing required checkout parameters" }, { status: 400 });
    }

    // Prevent duplicate purchase check
    try {
      const userDoc = await adminDb.collection("users").doc(userId).get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        if (userData?.purchasedCourses?.includes(courseId)) {
          return NextResponse.json({ error: "You have already purchased this course" }, { status: 400 });
        }
      }
    } catch (e) {
      console.warn("User duplicate check warning:", e);
    }

    const currency = "INR";
    const amountInPaise = Math.round(amount * 100);
    const receiptId = `rcpt_${Date.now().toString().slice(-8)}`;

    let order;
    try {
      order = await razorpayInstance.orders.create({
        amount: amountInPaise,
        currency: currency,
        receipt: receiptId,
        notes: {
          courseId,
          userId,
          userEmail,
        },
      });
    } catch (rzpErr) {
      console.warn("Razorpay API create order warning (likely placeholder keys):", rzpErr);
      // Create mock order for testing
      order = {
        id: `order_mock_${Date.now()}`,
        amount: amountInPaise,
        currency: currency,
        receipt: receiptId,
        status: "created",
      };
    }

    const invoiceNumber = generateInvoiceNumber();

    

    return NextResponse.json({
      success: true,
      orderId: order.id,
      amount: amountInPaise,
      currency,
      invoiceNumber,
      keyId: process.env.RAZORPAY_KEY_ID || "rzp_test_dummykey123",
    });
  } catch (error: unknown) {
    console.error("Razorpay order API error:", error);
    return NextResponse.json({ error: "Failed to initialize payment order" }, { status: 500 });
  }
}
