"use client";
import { useRouter } from "next/navigation";
import { XCircle } from "lucide-react";

export default function PaymentFailedPage() {
  const router = useRouter();
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFB] px-4">
      <div className="bg-white rounded-2xl border border-[#E5E9EB] shadow-lg p-8 max-w-md w-full text-center flex flex-col items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
          <XCircle size={36} className="text-red-500" />
        </div>
        <h2 className="text-lg font-bold text-[#252C32]">Payment Cancelled</h2>
        <p className="text-sm text-[#9AA6AC]">
          Your payment was cancelled or failed. No amount has been deducted.
        </p>
        <button
          onClick={() => router.push("/manufacturer/order-management")}
          className="w-full h-10 rounded-xl bg-teal-500 hover:bg-teal-600 text-white text-sm font-medium transition"
        >
          Back to Orders
        </button>
      </div>
    </div>
  );
}
