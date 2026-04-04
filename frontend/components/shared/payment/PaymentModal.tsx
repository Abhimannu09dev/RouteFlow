"use client";
import { useState } from "react";
import {
  X,
  CreditCard,
  Loader2,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";
import { toast } from "react-toastify";
import { paymentAPI } from "@/lib/api";
import Image from "next/image";

interface PaymentModalProps {
  orderId: string;
  orderTitle: string;
  amount: number;
  onClose: () => void;
  onSuccess: () => void;
}

export default function PaymentModal({
  orderId,
  orderTitle,
  amount,
  onClose,
}: PaymentModalProps) {
  const [gateway, setGateway] = useState<"khalti" | "esewa" | null>(null);
  const [loading, setLoading] = useState(false);

  async function handlePay() {
    if (!gateway) {
      toast.error("Please select a payment gateway");
      return;
    }

    setLoading(true);
    try {
      if (gateway === "khalti") {
        const data = await paymentAPI.initiateKhalti(orderId);
        if (data.paymentUrl) {
          // Redirect to Khalti payment page
          window.location.href = data.paymentUrl;
        }
      } else {
        const data = await paymentAPI.initiateEsewa(orderId);
        if (data.formData && data.esewaUrl) {
          // Create and submit form to eSewa
          const form = document.createElement("form");
          form.method = "POST";
          form.action = data.esewaUrl;
          Object.entries(data.formData).forEach(([key, value]) => {
            const input = document.createElement("input");
            input.type = "hidden";
            input.name = key;
            input.value = value as string;
            form.appendChild(input);
          });
          document.body.appendChild(form);
          form.submit();
        }
      }
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to initiate payment",
      );
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-[#E5E9EB] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center">
              <CreditCard size={18} className="text-teal-500" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[#252C32]">
                Complete Payment
              </h2>
              <p className="text-xs text-[#9AA6AC]">{orderTitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[#F5F7F8] transition"
          >
            <X size={16} color="#5B6871" />
          </button>
        </div>

        {/* Amount */}
        <div className="px-6 py-4 bg-[#F8FAFB] border-b border-[#E5E9EB]">
          <p className="text-xs text-[#9AA6AC]">Amount to pay</p>
          <p className="text-2xl font-bold text-[#252C32] mt-0.5">
            NPR {amount.toLocaleString()}
          </p>
        </div>

        {/* Gateway selection */}
        <div className="px-6 py-5 flex flex-col gap-4">
          <p className="text-xs font-semibold text-[#5B6871] uppercase tracking-wider">
            Select Payment Gateway
          </p>

          <div className="flex flex-col gap-3">
            {/* Khalti */}
            <button
              onClick={() => setGateway("khalti")}
              className={`flex items-center gap-4 p-4 rounded-xl border-2 transition ${
                gateway === "khalti"
                  ? "border-purple-500 bg-purple-50"
                  : "border-[#E5E9EB] hover:border-purple-200 hover:bg-purple-50/30"
              }`}
            >
              <Image src="/khalti.png" alt="Khalti" width={24} height={24} />
              <div className="text-left flex-1">
                <p className="text-sm font-semibold text-[#252C32]">Khalti</p>
                <p className="text-xs text-[#9AA6AC]">
                  Pay via Khalti digital wallet
                </p>
              </div>
              {gateway === "khalti" && (
                <CheckCircle2 size={20} className="text-purple-500 shrink-0" />
              )}
            </button>

            {/* eSewa */}
            <button
              onClick={() => setGateway("esewa")}
              className={`flex items-center gap-4 p-4 rounded-xl border-2 transition ${
                gateway === "esewa"
                  ? "border-green-500 bg-green-50"
                  : "border-[#E5E9EB] hover:border-green-200 hover:bg-green-50/30"
              }`}
            >
              <Image src="/esewa.png" alt="eSewa" width={24} height={24} />
              <div className="text-left flex-1">
                <p className="text-sm font-semibold text-[#252C32]">eSewa</p>
                <p className="text-xs text-[#9AA6AC]">
                  Pay via eSewa digital wallet
                </p>
              </div>
              {gateway === "esewa" && (
                <CheckCircle2 size={20} className="text-green-500 shrink-0" />
              )}
            </button>
          </div>

          {/* Security note */}
          <div className="flex items-center gap-2 text-xs text-[#9AA6AC]">
            <ShieldCheck size={13} />
            Payments are secured and encrypted
          </div>

          {/* Pay button */}
          <button
            onClick={handlePay}
            disabled={!gateway || loading}
            className="w-full h-11 rounded-xl bg-teal-500 hover:bg-teal-600 text-white text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Redirecting to {gateway === "khalti" ? "Khalti" : "eSewa"}...
              </>
            ) : (
              <>
                <CreditCard size={16} />
                Pay NPR {amount.toLocaleString()}
              </>
            )}
          </button>

          {/* Sandbox notice */}
          <p className="text-center text-[10px] text-[#9AA6AC] bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
            Sandbox mode — use test credentials provided by Khalti/eSewa
          </p>
        </div>
      </div>
    </div>
  );
}
