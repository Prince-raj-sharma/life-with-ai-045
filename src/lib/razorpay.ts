import Razorpay from "razorpay";

export const razorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "rzp_test_dummykey123",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "dummysecret123"
});
