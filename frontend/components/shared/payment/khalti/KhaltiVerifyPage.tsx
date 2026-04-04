"use client";
import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function KhaltiVerifyContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [status, setStatus] = useState<"loading" | "success" | "failed">(
    "loading",
  );
  const [transactionId, setTransactionId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const verifyPayment = async () => {
      const pidx = searchParams.get("pidx");
      const paymentId = searchParams.get("purchase_order_id");
      const khaltiStatus = searchParams.get("status");

      // Validate params first (no immediate setState)
      if (!pidx || !paymentId) {
        if (isMounted) setStatus("failed");
        return;
      }

      if (khaltiStatus !== "Completed") {
        if (isMounted) setStatus("failed");
        return;
      }

      try {
        const res = await fetch(
          `${API_BASE}/payment/khalti/verify?pidx=${pidx}&paymentId=${paymentId}`,
          {
            credentials: "include",
          },
        );

        const data = await res.json();

        if (!isMounted) return;

        if (data.success) {
          setStatus("success");
          setTransactionId(data.transactionId || pidx);
        } else {
          setStatus("failed");
        }
      } catch (error) {
        if (isMounted) setStatus("failed");
      }
    };

    // Defer execution to avoid synchronous state update warning
    Promise.resolve().then(verifyPayment);

    return () => {
      isMounted = false;
    };
  }, [searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFB] px-4">
      <div className="bg-white rounded-2xl border border-[#E5E9EB] shadow-lg p-8 max-w-md w-full text-center flex flex-col items-center gap-4">
        {status === "loading" && (
          <>
            <Loader2 size={48} className="animate-spin text-purple-500" />
            <p className="text-sm font-medium text-[#252C32]">
              Verifying your Khalti payment...
            </p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 size={36} className="text-green-500" />
            </div>
            <h2 className="text-lg font-bold text-[#252C32]">
              Payment Successful!
            </h2>
            <p className="text-sm text-[#9AA6AC]">
              Your Khalti payment has been verified and recorded.
            </p>

            {transactionId && (
              <div className="bg-[#F8FAFB] rounded-xl px-4 py-3 w-full">
                <p className="text-xs text-[#9AA6AC]">Transaction ID</p>
                <p className="text-xs font-mono font-medium text-[#252C32] mt-0.5 break-all">
                  {transactionId}
                </p>
              </div>
            )}

            <button
              onClick={() => router.push("/manufacturer/order-management")}
              className="w-full h-10 rounded-xl bg-teal-500 hover:bg-teal-600 text-white text-sm font-medium transition"
            >
              Back to Orders
            </button>
          </>
        )}

        {status === "failed" && (
          <>
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
              <XCircle size={36} className="text-red-500" />
            </div>
            <h2 className="text-lg font-bold text-[#252C32]">Payment Failed</h2>
            <p className="text-sm text-[#9AA6AC]">
              Your Khalti payment could not be verified. Please try again.
            </p>

            <button
              onClick={() => router.push("/manufacturer/order-management")}
              className="w-full h-10 rounded-xl bg-teal-500 hover:bg-teal-600 text-white text-sm font-medium transition"
            >
              Back to Orders
            </button>
          </>
        )}
      </div>
    </div>
  );
}
