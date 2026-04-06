"use client";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import {
  CreditCard,
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  Package,
  Loader2,
  RefreshCw,
} from "lucide-react";
import PaymentModal from "@/components/shared/payment/PaymentModal";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

type Payment = {
  _id: string;
  orderId: {
    _id: string;
    orderId: string;
    productDetails: string;
    routeFrom: string;
    routeTo: string;
  };
  payerId: { _id: string; companyName: string };
  receiverId: { _id: string; companyName: string };
  amount: number;
  gateway: "khalti" | "esewa";
  status: "pending" | "completed" | "failed";
  transactionId: string | null;
  refId: string | null;
  createdAt: string;
};

//  Helpers

const STATUS_CONFIG = {
  completed: {
    label: "Completed",
    color: "bg-green-50 text-green-600 border-green-100",
    icon: CheckCircle2,
  },
  pending: {
    label: "Pending",
    color: "bg-amber-50 text-amber-600 border-amber-100",
    icon: Clock,
  },
  failed: {
    label: "Failed",
    color: "bg-red-50 text-red-500 border-red-100",
    icon: XCircle,
  },
};

function GatewayBadge({ gateway }: { gateway: "khalti" | "esewa" }) {
  if (gateway === "khalti") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-100">
        <span className="w-3.5 h-3.5 rounded-sm bg-[#5C2D91] flex items-center justify-center">
          <span className="text-white text-[8px] font-bold">K</span>
        </span>
        Khalti
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-100">
      <span className="w-3.5 h-3.5 rounded-sm bg-[#60BB46] flex items-center justify-center">
        <span className="text-white text-[8px] font-bold">e</span>
      </span>
      eSewa
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cfg =
    STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] ??
    STATUS_CONFIG.pending;
  const Icon = cfg.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${cfg.color}`}
    >
      <Icon size={11} />
      {cfg.label}
    </span>
  );
}

// Payment Row

function PaymentRow({
  payment,
  role,
  onRetry,
}: {
  payment: Payment;
  role: "manufacturer" | "logistics";
  onRetry?: (payment: Payment) => void;
}) {
  const isManufacturer = role === "manufacturer";
  const order = payment.orderId;
  const isPending = payment.status === "pending";

  return (
    <div
      className={`px-5 py-4 border-b border-[#F5F5F5] last:border-0 transition ${
        isPending && isManufacturer
          ? "hover:bg-amber-50/40 cursor-pointer"
          : "hover:bg-[#F9FAFB]"
      }`}
      onClick={() => isPending && isManufacturer && onRetry?.(payment)}
    >
      <div className="flex items-start justify-between gap-4">
        {/* Order info */}
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-[#F5F5F5] flex items-center justify-center shrink-0 mt-0.5">
            <Package size={16} className="text-[#838383]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-[#252C32] font-mono">
                {order?.orderId || "—"}
              </span>
              <GatewayBadge gateway={payment.gateway} />
              <StatusBadge status={payment.status} />
            </div>
            <p className="text-xs text-[#838383] mt-0.5 truncate">
              {order?.productDetails || "—"}
              {order?.routeFrom && order?.routeTo && (
                <span>
                  {" "}
                  · {order.routeFrom} → {order.routeTo}
                </span>
              )}
            </p>
            <p className="text-xs text-[#9AA6AC] mt-0.5">
              {isManufacturer
                ? `To: ${payment.receiverId?.companyName}`
                : `From: ${payment.payerId?.companyName}`}
            </p>
            {payment.transactionId && (
              <p className="text-[10px] text-[#9AA6AC] mt-0.5 font-mono">
                Txn: {payment.transactionId}
              </p>
            )}
          </div>
        </div>

        {/* Amount + date */}
        <div className="text-right shrink-0">
          <div className="flex items-center gap-1 justify-end">
            {isManufacturer ? (
              <TrendingDown size={13} className="text-red-400" />
            ) : (
              <TrendingUp size={13} className="text-green-500" />
            )}
            <span
              className={`text-sm font-bold ${isManufacturer ? "text-[#252C32]" : "text-green-600"}`}
            >
              NPR {payment.amount.toLocaleString()}
            </span>
          </div>
          <p className="text-[10px] text-[#9AA6AC] mt-0.5">
            {format(new Date(payment.createdAt), "dd MMM yyyy, hh:mm a")}
          </p>
          {isPending && isManufacturer && (
            <span className="inline-flex items-center gap-1 mt-1.5 text-[10px] font-medium text-amber-600 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full">
              <RefreshCw size={9} />
              Tap to retry
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

//  Main Page

export default function PaymentsPage({
  role,
}: {
  role: "manufacturer" | "logistics";
}) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [retryPayment, setRetryPayment] = useState<Payment | null>(null);

  function loadPayments() {
    setLoading(true);
    fetch(`${API_BASE}/payment/my-payments`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) =>
        setPayments(Array.isArray(data.payments) ? data.payments : []),
      )
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadPayments();
  }, []);

  // Summary stats
  const completed = payments.filter((p) => p.status === "completed");
  const totalAmount = completed.reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-5 py-2">
      {/* Retry Payment Modal */}
      {retryPayment && (
        <PaymentModal
          orderId={retryPayment.orderId._id}
          orderTitle={retryPayment.orderId.productDetails || "Order Payment"}
          amount={retryPayment.amount}
          onClose={() => setRetryPayment(null)}
          onSuccess={() => {
            setRetryPayment(null);
            loadPayments();
          }}
        />
      )}
      <div>
        <h1 className="text-lg font-semibold text-[#252C32]">
          {role === "manufacturer" ? "Payments Made" : "Payments Received"}
        </h1>
        <p className="text-sm text-[#9AA6AC] mt-0.5">
          {role === "manufacturer"
            ? "Track all payments you've made to logistics partners"
            : "Track all payments received from manufacturers"}
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-[#E5E9EB] p-4">
          <p className="text-xs text-[#838383]">Total Transactions</p>
          <p className="text-2xl font-bold text-[#252C32] mt-1">
            {payments.length}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-[#E5E9EB] p-4">
          <p className="text-xs text-[#838383]">Completed</p>
          <p className="text-2xl font-bold text-green-600 mt-1">
            {completed.length}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-[#E5E9EB] p-4">
          <p className="text-xs text-[#838383]">
            {role === "manufacturer" ? "Total Paid" : "Total Received"}
          </p>
          <p className="text-lg font-bold text-[#252C32] mt-1">
            NPR {totalAmount.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Payments list */}
      <div className="bg-white rounded-2xl border border-[#E5E9EB] overflow-hidden">
        <div className="px-5 py-4 border-b border-[#E5E9EB] flex items-center gap-2">
          <CreditCard size={16} className="text-[#838383]" />
          <h2 className="text-sm font-semibold text-[#252C32]">
            Transaction History
          </h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-[#838383]">
            <Loader2 size={16} className="animate-spin" /> Loading...
          </div>
        ) : payments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#F5F5F5] flex items-center justify-center">
              <CreditCard size={24} className="text-[#B0B7C3]" />
            </div>
            <p className="text-sm font-medium text-[#252C32]">
              No payments yet
            </p>
            <p className="text-xs text-[#838383]">
              {role === "manufacturer"
                ? "Payments appear here once you pay for delivered orders"
                : "Payments appear here once manufacturers pay for delivered orders"}
            </p>
          </div>
        ) : (
          <>
            {payments.map((p) => (
              <PaymentRow
                key={p._id}
                payment={p}
                role={role}
                onRetry={setRetryPayment}
              />
            ))}
            <div className="px-5 py-3 border-t border-[#F5F5F5]">
              <p className="text-xs text-[#838383]">
                Showing{" "}
                <span className="font-medium text-[#252C32]">
                  {payments.length}
                </span>{" "}
                transactions
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
