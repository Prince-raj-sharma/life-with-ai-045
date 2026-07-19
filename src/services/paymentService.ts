export async function createPaymentOrder(payload: { courseId: string; userId: string; userEmail?: string; userName?: string; amount: number; courseTitle: string }) {
  const res = await fetch("/api/razorpay/order", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Order creation failed");
  }
  return res.json();
}

export async function verifyPaymentTransaction(payload: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string; userId: string; courseId: string; amount: number }) {
  const res = await fetch("/api/razorpay/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Payment verification failed");
  return res.json();
}
