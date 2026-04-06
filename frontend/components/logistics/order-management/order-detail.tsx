"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { orderAPI, priceOfferAPI } from "@/lib/api";
import dynamic from "next/dynamic";
import {
  ArrowLeft,
  MapPin,
  ChevronRight,
  FileText,
  DollarSign,
  Clock,
  Building2,
  CheckCircle,
  Trophy,
  Loader2,
  Hash,
  Weight,
  Truck,
  Send,
  RefreshCw,
  XCircle,
  Package,
} from "lucide-react";
import SubmitOfferModal from "./submit-offer";

const RouteMapDisplay = dynamic(
  () => import("@/components/shared/route-map-display"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-52 rounded-xl bg-[#F5F5F5] border border-[#E5E9EB] animate-pulse" />
    ),
  },
);

type Order = {
  _id: string;
  orderId: string;
  productDetails: string;
  quantity: number;
  weight: number;
  vehicleType: string;
  invoiceNeeded: boolean;
  vatBillNeeded: boolean;
  expectedPrice?: number | null;
  status: string;
  routeFrom: string;
  routeTo: string;
  additionalInfo?: string;
  createdAt: string;
  updatedAt: string;
  manufacturer: { companyName: string; email: string };
  logistics?: { _id: string; companyName: string; email: string } | null;
};

type MyOffer = {
  _id: string;
  proposedPrice: number;
  estimatedDeliveryDays: number;
  note: string;
  status: string;
  createdAt: string;
} | null;

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { color: string; bg: string }> = {
    pending: { color: "text-amber-600", bg: "bg-amber-50 border-amber-200" },
    accepted: { color: "text-blue-600", bg: "bg-blue-50 border-blue-200" },
    "in transit": {
      color: "text-purple-600",
      bg: "bg-purple-50 border-purple-200",
    },
    delivered: { color: "text-green-600", bg: "bg-green-50 border-green-200" },
    cancelled: { color: "text-red-500", bg: "bg-red-50 border-red-200" },
  };
  const cfg = config[status] || config.pending;
  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${cfg.bg} ${cfg.color}`}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-[#838383]">{label}</p>
      <p className="text-sm font-medium text-[#252C32] mt-0.5">{value}</p>
    </div>
  );
}

export default function LogisticsOrderDetail({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [myOffer, setMyOffer] = useState<MyOffer>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showBidModal, setShowBidModal] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  async function fetchData() {
    try {
      const [orderRes, offersRes] = await Promise.all([
        orderAPI.getOrderDetails(orderId),
        priceOfferAPI.getOffers(orderId),
      ]);
      setOrder(orderRes.order);
      const offers = Array.isArray(offersRes.offers) ? offersRes.offers : [];
      setMyOffer(offers.length > 0 ? offers[0] : null);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to load order");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, [orderId]);

  async function handleWithdraw() {
    if (!myOffer || !order) return;
    setIsWithdrawing(true);
    try {
      await priceOfferAPI.withdrawOffer(orderId, myOffer._id);
      toast.success("Bid withdrawn successfully");
      setMyOffer(null);
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to withdraw bid",
      );
    } finally {
      setIsWithdrawing(false);
    }
  }

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString("en-NP", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto flex flex-col gap-5">
        <div className="h-8 w-32 bg-[#F5F5F5] rounded-lg animate-pulse" />
        <div className="h-48 bg-[#F5F5F5] rounded-2xl animate-pulse" />
        <div className="h-32 bg-[#F5F5F5] rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-sm text-[#838383]">Order not found</p>
        <button
          onClick={() => router.back()}
          className="mt-4 text-xs text-primary hover:underline"
        >
          Go back
        </button>
      </div>
    );
  }

  const isPending = order.status === "pending";
  const hasBid = !!myOffer && myOffer.status === "pending";
  const isWon = myOffer?.status === "accepted";
  const isNotSelected = myOffer?.status === "rejected";

  return (
    <>
      <div className="max-w-3xl mx-auto flex flex-col gap-5">
        {/* Back */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm text-[#5B6871] hover:text-primary transition w-fit"
        >
          <ArrowLeft size={16} />
          Back to Orders
        </button>

        {/* Order header card */}
        <div className="bg-white rounded-2xl border border-[#E5E9EB] p-5 flex flex-col gap-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-sm font-bold text-[#252C32]">
                  {order.orderId}
                </span>
                <StatusBadge status={order.status} />
              </div>
              <p className="text-xs text-[#838383]">
                Placed {formatDate(order.createdAt)}
              </p>
            </div>
          </div>

          {/* Manufacturer */}
          <div className="flex items-center gap-2 px-3 py-2.5 bg-[#F5F5F5] rounded-xl border border-[#E5E9EB]">
            <Building2 size={14} className="text-[#838383] shrink-0" />
            <div>
              <p className="text-xs font-semibold text-[#252C32]">
                {order.manufacturer.companyName}
              </p>
              <p className="text-xs text-[#838383]">
                {order.manufacturer.email}
              </p>
            </div>
          </div>

          {/* Route */}
          <div className="flex items-center gap-2 px-4 py-3 bg-primary/5 rounded-xl border border-primary/20">
            <MapPin size={14} className="text-primary shrink-0" />
            <span className="text-sm font-medium text-[#252C32]">
              {order.routeFrom}
            </span>
            <ChevronRight size={14} className="text-[#838383]" />
            <span className="text-sm font-medium text-[#252C32]">
              {order.routeTo}
            </span>
          </div>

          {/* Route map */}
          <RouteMapDisplay from={order.routeFrom} to={order.routeTo} />

          {/* Details grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <DetailRow label="Product" value={order.productDetails} />
            <DetailRow label="Quantity" value={`${order.quantity} units`} />
            <DetailRow label="Weight" value={`${order.weight} kg`} />
            <DetailRow
              label="Vehicle"
              value={order.vehicleType.replace(/_/g, " ")}
            />
          </div>

          {/* Chips */}
          <div className="flex flex-wrap gap-2">
            {order.invoiceNeeded && (
              <span className="text-xs px-2.5 py-1 bg-[#F5F5F5] border border-[#E5E9EB] rounded-lg text-[#5B6871] flex items-center gap-1">
                <FileText size={11} /> Invoice Required
              </span>
            )}
            {order.vatBillNeeded && (
              <span className="text-xs px-2.5 py-1 bg-[#F5F5F5] border border-[#E5E9EB] rounded-lg text-[#5B6871] flex items-center gap-1">
                <FileText size={11} /> VAT Bill Required
              </span>
            )}
          </div>

          {/* Additional info */}
          {order.additionalInfo && (
            <p className="text-xs text-[#838383] bg-[#F5F5F5] rounded-xl px-3 py-2 leading-relaxed">
              {order.additionalInfo}
            </p>
          )}

          {/* Expected price */}
          {order.expectedPrice && order.expectedPrice > 0 ? (
            <div className="flex items-center justify-between px-4 py-3 bg-green-50 border border-green-200 rounded-xl">
              <div>
                <p className="text-xs text-green-700 font-medium">
                  Manufacturer&apos;s budget hint
                </p>
                <p className="text-xl font-bold text-green-800">
                  NPR {order.expectedPrice.toLocaleString()}
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center shrink-0">
                <DollarSign size={18} className="text-green-600" />
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-2 bg-[#F5F5F5] border border-[#E5E9EB] rounded-xl">
              <DollarSign size={13} className="text-[#838383]" />
              <p className="text-xs text-[#838383]">
                No budget hint — bid competitively
              </p>
            </div>
          )}
        </div>

        {/* My bid card */}
        <div className="bg-white rounded-2xl border border-[#E5E9EB] p-5">
          <p className="text-sm font-semibold text-[#252C32] flex items-center gap-2 mb-4">
            <Trophy size={15} className="text-primary" />
            Your Bid
          </p>

          {isWon && (
            <div className="flex items-center gap-3 px-4 py-3 bg-green-50 border border-green-200 rounded-xl mb-4">
              <CheckCircle size={18} className="text-green-600 shrink-0" />
              <div>
                <p className="text-sm font-bold text-green-700">
                  You won this order! 🎉
                </p>
                <p className="text-xs text-green-600 mt-0.5">
                  Your bid of NPR {myOffer?.proposedPrice.toLocaleString()} was
                  accepted.
                </p>
              </div>
            </div>
          )}

          {isNotSelected && (
            <div className="flex items-center gap-3 px-4 py-3 bg-[#F5F5F5] border border-[#E5E9EB] rounded-xl mb-4">
              <XCircle size={18} className="text-[#838383] shrink-0" />
              <div>
                <p className="text-sm font-medium text-[#252C32]">
                  Not selected
                </p>
                <p className="text-xs text-[#838383] mt-0.5">
                  The manufacturer chose a different logistics partner.
                </p>
              </div>
            </div>
          )}

          {hasBid && myOffer && (
            <div className="flex flex-col gap-3 mb-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl">
                  <p className="text-[10px] text-blue-600 mb-0.5">Your Price</p>
                  <p className="text-lg font-bold text-blue-800">
                    NPR {myOffer.proposedPrice.toLocaleString()}
                  </p>
                </div>
                <div className="px-4 py-3 bg-[#F5F5F5] border border-[#E5E9EB] rounded-xl">
                  <p className="text-[10px] text-[#838383] mb-0.5">Delivery</p>
                  <p className="text-lg font-bold text-[#252C32]">
                    {myOffer.estimatedDeliveryDays} day
                    {myOffer.estimatedDeliveryDays !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
              {myOffer.note && (
                <p className="text-xs text-[#838383] bg-[#F5F5F5] rounded-xl px-3 py-2 leading-relaxed">
                  {myOffer.note}
                </p>
              )}
              <p className="text-[10px] text-[#B0B7C3] flex items-center gap-1">
                <Clock size={10} /> Submitted {formatDate(myOffer.createdAt)} ·
                Awaiting manufacturer
              </p>
            </div>
          )}

          {!myOffer && !isPending && (
            <p className="text-sm text-[#838383] text-center py-4">
              This order is no longer accepting bids.
            </p>
          )}

          {!myOffer && isPending && (
            <p className="text-xs text-[#838383] mb-4">
              You haven&apos;t placed a bid on this order yet.
            </p>
          )}

          {/* Actions — only for pending orders */}
          {isPending && (
            <div className="flex flex-col gap-2 pt-3 border-t border-[#F5F5F5]">
              <button
                onClick={() => setShowBidModal(true)}
                className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-primary text-primary hover:bg-primary hover:text-white text-sm font-medium rounded-xl transition"
              >
                {hasBid ? (
                  <>
                    <RefreshCw size={15} /> Update Bid
                  </>
                ) : (
                  <>
                    <Send size={15} /> Place Bid
                  </>
                )}
              </button>
              {hasBid && (
                <button
                  onClick={handleWithdraw}
                  disabled={isWithdrawing}
                  className="w-full flex items-center justify-center gap-2 py-2 text-sm text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition disabled:opacity-50"
                >
                  {isWithdrawing ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <XCircle size={14} />
                  )}
                  Withdraw Bid
                </button>
              )}
              <p className="text-[10px] text-center text-[#B0B7C3]">
                Only the manufacturer can award this order by accepting one bid
              </p>
            </div>
          )}
        </div>
      </div>

      {showBidModal && order && (
        <SubmitOfferModal
          orderId={order.orderId}
          orderDetails={order.productDetails}
          expectedPrice={order.expectedPrice}
          existingOffer={
            myOffer
              ? {
                  _id: myOffer._id,
                  proposedPrice: myOffer.proposedPrice,
                  estimatedDeliveryDays: myOffer.estimatedDeliveryDays,
                  note: myOffer.note,
                  status: myOffer.status,
                }
              : null
          }
          onClose={() => setShowBidModal(false)}
          onSuccess={(offer) => {
            setMyOffer(offer as MyOffer);
            setShowBidModal(false);
          }}
        />
      )}
    </>
  );
}
