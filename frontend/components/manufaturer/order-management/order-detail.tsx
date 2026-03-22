"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { orderAPI, priceOfferAPI } from "@/lib/api";
import {
  ArrowLeft,
  Package,
  MapPin,
  ChevronRight,
  Truck,
  Weight,
  Hash,
  FileText,
  DollarSign,
  Clock,
  Building2,
  CheckCircle,
  Trophy,
  Loader2,
  Phone,
  ShieldAlert,
} from "lucide-react";

//  Types

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
  logistics?: { companyName: string; email: string } | null;
};

type Offer = {
  _id: string;
  proposedPrice: number;
  estimatedDeliveryDays: number;
  note: string;
  status: string;
  createdAt: string;
  logistics: {
    companyName: string;
    email: string;
    companyLogo?: string;
    contactNumber?: string;
  };
};

//  Sub-components

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-[#838383]">{label}</p>
      <p className="text-sm font-medium text-[#252C32] mt-0.5">{value}</p>
    </div>
  );
}

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

function OfferCard({
  offer,
  isLowest,
  canAccept,
  isAccepting,
  onAccept,
}: {
  offer: Offer;
  isLowest: boolean;
  canAccept: boolean;
  isAccepting: boolean;
  onAccept: () => void;
}) {
  function formatDate(d: string) {
    return new Date(d).toLocaleDateString("en-NP", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  const isAccepted = offer.status === "accepted";
  const isRejected = offer.status === "rejected";

  return (
    <div
      className={`rounded-2xl border p-4 transition ${
        isAccepted
          ? "border-green-200 bg-green-50"
          : isRejected
            ? "border-[#E5E9EB] bg-[#FAFAFA] opacity-60"
            : isLowest
              ? "border-primary/30 bg-primary/5"
              : "border-[#E5E9EB] bg-white"
      }`}
    >
      {/* Company row */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-[#F5F5F5] flex items-center justify-center shrink-0 overflow-hidden">
            {offer.logistics.companyLogo ? (
              <img
                src={offer.logistics.companyLogo}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              <Building2 size={16} className="text-[#B0B7C3]" />
            )}
          </div>
          <div>
            <p className="text-sm font-semibold text-[#252C32]">
              {offer.logistics.companyName}
            </p>
            <p className="text-xs text-[#838383]">{offer.logistics.email}</p>
          </div>
        </div>

        {/* Badges */}
        <div className="flex flex-col items-end gap-1 shrink-0">
          {isLowest && !isAccepted && !isRejected && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary text-white text-[10px] font-bold rounded-full">
              <Trophy size={9} />
              Best Price
            </span>
          )}
          {isAccepted && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded-full">
              <CheckCircle size={9} />
              Accepted
            </span>
          )}
          {isRejected && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-500 text-[10px] font-medium rounded-full">
              Not Selected
            </span>
          )}
        </div>
      </div>

      {/* Price + days */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="bg-white rounded-xl px-3 py-2 border border-[#E5E9EB]">
          <p className="text-[10px] text-[#838383] mb-0.5">Proposed Price</p>
          <p className="text-base font-bold text-[#252C32] flex items-center gap-1">
            <DollarSign size={13} className="text-primary" />
            NPR {offer.proposedPrice.toLocaleString()}
          </p>
        </div>
        <div className="bg-white rounded-xl px-3 py-2 border border-[#E5E9EB]">
          <p className="text-[10px] text-[#838383] mb-0.5">Delivery Time</p>
          <p className="text-base font-bold text-[#252C32] flex items-center gap-1">
            <Clock size={13} className="text-primary" />
            {offer.estimatedDeliveryDays} day
            {offer.estimatedDeliveryDays !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Contact */}
      {offer.logistics.contactNumber && (
        <p className="text-xs text-[#838383] flex items-center gap-1 mb-2">
          <Phone size={11} />
          {offer.logistics.contactNumber}
        </p>
      )}

      {/* Note */}
      {offer.note && (
        <p className="text-xs text-[#838383] bg-white border border-[#E5E9EB] rounded-xl px-3 py-2 mb-3 leading-relaxed">
          {offer.note}
        </p>
      )}

      <p className="text-[10px] text-[#B0B7C3] mb-3">
        Submitted {formatDate(offer.createdAt)}
      </p>

      {/* Accept button */}
      {canAccept && offer.status === "pending" && (
        <button
          onClick={onAccept}
          disabled={isAccepting}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-green-500 hover:bg-green-600 text-white text-xs font-medium rounded-xl transition disabled:opacity-60"
        >
          {isAccepting ? (
            <Loader2 size={13} className="animate-spin" />
          ) : (
            <CheckCircle size={13} />
          )}
          {isAccepting ? "Accepting..." : "Accept This Offer"}
        </button>
      )}
    </div>
  );
}

//  Main Component

export default function OrderDetail({ orderId }: { orderId: string }) {
  const router = useRouter();

  const [order, setOrder] = useState<Order | null>(null);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  //  Fetch

  useEffect(() => {
    async function fetchData() {
      try {
        const [orderRes, offersRes] = await Promise.all([
          orderAPI.getOrderDetails(orderId),
          priceOfferAPI.getOffers(orderId),
        ]);
        setOrder(orderRes.order);
        setOffers(Array.isArray(offersRes.offers) ? offersRes.offers : []);
      } catch (error: any) {
        toast.error(error.message || "Failed to load order details");
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [orderId]);

  //  Accept offer

  async function handleAcceptOffer(offerId: string, companyName: string) {
    setAcceptingId(offerId);
    try {
      await priceOfferAPI.acceptOffer(orderId, offerId);
      toast.success(`Offer from ${companyName} accepted! Order confirmed.`);

      // Refresh data
      const [orderRes, offersRes] = await Promise.all([
        orderAPI.getOrderDetails(orderId),
        priceOfferAPI.getOffers(orderId),
      ]);
      setOrder(orderRes.order);
      setOffers(Array.isArray(offersRes.offers) ? offersRes.offers : []);
    } catch (error: any) {
      toast.error(error.message || "Failed to accept offer");
    } finally {
      setAcceptingId(null);
    }
  }

  //  Derived

  const pendingOffers = offers.filter((o) => o.status === "pending");
  const lowestPrice =
    pendingOffers.length > 0
      ? Math.min(...pendingOffers.map((o) => o.proposedPrice))
      : null;
  const canAccept = order?.status === "pending";

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString("en-NP", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  //  Loading

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto flex flex-col gap-5">
        <div className="h-8 w-32 bg-[#F5F5F5] rounded-lg animate-pulse" />
        <div className="h-48 bg-[#F5F5F5] rounded-2xl animate-pulse" />
        <div className="h-32 bg-[#F5F5F5] rounded-2xl animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-48 bg-[#F5F5F5] rounded-2xl animate-pulse"
            />
          ))}
        </div>
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

  //  Render

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-5">
      {/* Back button */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-sm text-[#5B6871] hover:text-primary transition w-fit"
      >
        <ArrowLeft size={16} />
        Back to Orders
      </button>

      {/* Order header */}
      <div className="bg-white rounded-2xl border border-[#E5E9EB] p-5">
        <div className="flex items-start justify-between mb-4">
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

        {/* Route */}
        <div className="flex items-center gap-2 px-4 py-3 bg-primary/5 rounded-xl border border-primary/20 mb-4">
          <MapPin size={14} className="text-primary shrink-0" />
          <span className="text-sm font-medium text-[#252C32]">
            {order.routeFrom}
          </span>
          <ChevronRight size={14} className="text-[#838383]" />
          <span className="text-sm font-medium text-[#252C32]">
            {order.routeTo}
          </span>
        </div>

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

        {/* Document requirements */}
        {(order.invoiceNeeded || order.vatBillNeeded) && (
          <div className="flex gap-2 mt-4">
            {order.invoiceNeeded && (
              <span className="text-xs px-2.5 py-1 bg-[#F5F5F5] border border-[#E5E9EB] rounded-lg text-[#5B6871] flex items-center gap-1">
                <FileText size={11} />
                Invoice Required
              </span>
            )}
            {order.vatBillNeeded && (
              <span className="text-xs px-2.5 py-1 bg-[#F5F5F5] border border-[#E5E9EB] rounded-lg text-[#5B6871] flex items-center gap-1">
                <FileText size={11} />
                VAT Bill Required
              </span>
            )}
          </div>
        )}

        {/* Additional info */}
        {order.additionalInfo && (
          <p className="text-xs text-[#838383] bg-[#F5F5F5] rounded-xl px-3 py-2 mt-4 leading-relaxed">
            {order.additionalInfo}
          </p>
        )}

        {/* Assigned logistics partner */}
        {order.logistics && (
          <div className="flex items-center gap-2 mt-4 px-3 py-2.5 bg-green-50 border border-green-200 rounded-xl">
            <CheckCircle size={14} className="text-green-600 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-green-700">
                Logistics Partner Assigned
              </p>
              <p className="text-xs text-green-600">
                {order.logistics.companyName} · {order.logistics.email}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Expected price + offers summary */}
      <div className="bg-white rounded-2xl border border-[#E5E9EB] p-5">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold text-[#252C32] flex items-center gap-2">
            <DollarSign size={16} className="text-primary" />
            Price Overview
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="px-4 py-3 bg-[#F5F5F5] rounded-xl">
            <p className="text-xs text-[#838383]">Your Expected Price</p>
            <p className="text-lg font-bold text-[#252C32] mt-0.5">
              {order.expectedPrice
                ? `NPR ${order.expectedPrice.toLocaleString()}`
                : "Open bidding"}
            </p>
          </div>
          <div className="px-4 py-3 bg-[#F5F5F5] rounded-xl">
            <p className="text-xs text-[#838383]">Total Bids</p>
            <p className="text-lg font-bold text-[#252C32] mt-0.5">
              {offers.length}
            </p>
          </div>
          <div className="px-4 py-3 bg-[#F5F5F5] rounded-xl">
            <p className="text-xs text-[#838383]">Lowest Bid</p>
            <p className="text-lg font-bold text-green-600 mt-0.5">
              {lowestPrice ? `NPR ${lowestPrice.toLocaleString()}` : "—"}
            </p>
          </div>
        </div>
      </div>

      {/* Offers section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-[#252C32]">
            Price Offers{" "}
            <span className="text-[#838383] font-normal">
              ({pendingOffers.length} pending)
            </span>
          </h2>
          {canAccept && pendingOffers.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl">
              <ShieldAlert size={13} />
              Review and accept the best offer
            </div>
          )}
        </div>

        {offers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 bg-white rounded-2xl border border-[#E5E9EB] text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#F5F5F5] flex items-center justify-center mb-3">
              <Package size={24} className="text-[#B0B7C3]" />
            </div>
            <p className="text-sm font-medium text-[#252C32]">No bids yet</p>
            <p className="text-xs text-[#838383] mt-1">
              Logistics companies will submit their price offers here
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {offers.map((offer) => (
              <OfferCard
                key={offer._id}
                offer={offer}
                isLowest={
                  offer.proposedPrice === lowestPrice &&
                  offer.status === "pending"
                }
                canAccept={!!canAccept}
                isAccepting={acceptingId === offer._id}
                onAccept={() =>
                  handleAcceptOffer(offer._id, offer.logistics.companyName)
                }
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
