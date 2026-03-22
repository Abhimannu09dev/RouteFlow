"use client";

import {
  MapPin,
  Truck,
  Weight,
  Hash,
  FileText,
  ChevronRight,
  Building2,
  DollarSign,
  Send,
  RefreshCw,
  CheckCircle,
  Clock,
  Loader2,
} from "lucide-react";
import InfoChip from "./info-chip";

export type Order = {
  _id: string;
  orderId: string;
  productDetails: string;
  quantity: number;
  weight: number;
  vehicleType: string;
  invoiceNeeded: boolean;
  vatBillNeeded: boolean;
  expectedPrice?: number | null;
  routeFrom: string;
  routeTo: string;
  additionalInfo?: string;
  createdAt: string;
  manufacturer: { companyName: string; email: string };
};

export type MyOffer = {
  _id: string;
  proposedPrice: number;
  estimatedDeliveryDays: number;
  note: string;
  status: string;
  updatedAt?: string;
};

type Props = {
  order: Order;
  myOffer: MyOffer | null;
  isAccepting: boolean;
  onAccept: () => void;
  onBid: () => void;
};

function OrderHeader({ order }: { order: Order }) {
  function formatDate(d: string) {
    return new Date(d).toLocaleDateString("en-NP", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  return (
    <div className="flex items-center justify-between">
      <span className="font-mono text-xs font-bold text-[#252C32] bg-[#F5F5F5] px-2.5 py-1 rounded-lg">
        #{order.orderId.replace("ORD-", "")}
      </span>
      <span className="text-xs text-[#838383]">
        {formatDate(order.createdAt)}
      </span>
    </div>
  );
}

function OrderProduct({ order }: { order: Order }) {
  return (
    <div>
      <p className="text-sm font-semibold text-[#252C32] leading-snug">
        {order.productDetails}
      </p>
      <p className="text-xs text-[#838383] mt-0.5 flex items-center gap-1">
        <Building2 size={11} />
        {order.manufacturer.companyName}
      </p>
    </div>
  );
}

function OrderRoute({ order }: { order: Order }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2.5 bg-primary/5 rounded-xl border border-primary/15">
      <MapPin size={13} className="text-primary shrink-0" />
      <span className="text-sm font-medium text-[#252C32]">
        {order.routeFrom}
      </span>
      <ChevronRight size={13} className="text-[#B0B7C3]" />
      <span className="text-sm font-medium text-[#252C32]">
        {order.routeTo}
      </span>
    </div>
  );
}

function ExpectedPriceDisplay({ price }: { price?: number | null }) {
  if (price && price > 0) {
    return (
      <div className="flex items-center justify-between px-4 py-3 bg-green-50 border border-green-200 rounded-xl">
        <div>
          <p className="text-xs text-green-700 font-medium">
            Manufacturer&apos;s Expected Price
          </p>
          <p className="text-xl font-bold text-green-800">
            NPR {price.toLocaleString()}
          </p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center shrink-0">
          <DollarSign size={18} className="text-green-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-[#F5F5F5] border border-[#E5E9EB] rounded-xl">
      <DollarSign size={13} className="text-[#838383]" />
      <p className="text-xs text-[#838383]">No expected price — open bidding</p>
    </div>
  );
}

function OrderChips({ order }: { order: Order }) {
  return (
    <div className="flex flex-wrap gap-2">
      <InfoChip icon={Hash} label={`${order.quantity} units`} />
      <InfoChip icon={Weight} label={`${order.weight} kg`} />
      <InfoChip icon={Truck} label={order.vehicleType.replace(/_/g, " ")} />
      {order.invoiceNeeded && <InfoChip icon={FileText} label="Invoice" />}
      {order.vatBillNeeded && <InfoChip icon={FileText} label="VAT Bill" />}
    </div>
  );
}

function MyBidSummary({ offer }: { offer: MyOffer }) {
  return (
    <div className="flex items-center justify-between px-3 py-2.5 bg-blue-50 border border-blue-200 rounded-xl">
      <div>
        <p className="text-xs font-semibold text-blue-700 flex items-center gap-1">
          <CheckCircle size={11} />
          Your Current Bid
        </p>
        <p className="text-sm font-bold text-blue-800">
          NPR {offer.proposedPrice.toLocaleString()}
        </p>
        <p className="text-xs text-blue-500">
          {offer.estimatedDeliveryDays} day
          {offer.estimatedDeliveryDays !== 1 ? "s" : ""} delivery
        </p>
      </div>
      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full shrink-0">
        <Clock size={10} />
        Pending
      </span>
    </div>
  );
}

function ActionButtons({
  hasPendingBid,
  isAccepting,
  onAccept,
  onBid,
}: {
  hasPendingBid: boolean;
  isAccepting: boolean;
  onAccept: () => void;
  onBid: () => void;
}) {
  return (
    <div className="flex flex-col gap-2 pt-1 border-t border-[#F5F5F5]">
      {!hasPendingBid && (
        <button
          onClick={onAccept}
          disabled={isAccepting}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-green-500 hover:bg-green-600 text-white text-sm font-medium rounded-xl transition disabled:opacity-60"
        >
          {isAccepting ? (
            <Loader2 size={15} className="animate-spin" />
          ) : (
            <CheckCircle size={15} />
          )}
          {isAccepting ? "Accepting..." : "Accept Order"}
        </button>
      )}

      <button
        onClick={onBid}
        className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-primary text-primary hover:bg-primary hover:text-white text-sm font-medium rounded-xl transition"
      >
        {hasPendingBid ? (
          <>
            <RefreshCw size={15} />
            Update Bid
          </>
        ) : (
          <>
            <Send size={15} />
            Place Bid Instead
          </>
        )}
      </button>

      {!hasPendingBid && (
        <p className="text-[10px] text-center text-[#B0B7C3] leading-relaxed">
          Accept to confirm at expected price · Bid to propose a different price
        </p>
      )}
    </div>
  );
}

export default function OrderCard({
  order,
  myOffer,
  isAccepting,
  onAccept,
  onBid,
}: Props) {
  const hasPendingBid = !!(myOffer && myOffer.status === "pending");

  return (
    <div className="bg-white rounded-2xl border border-[#E5E9EB] p-5 flex flex-col gap-4 hover:border-primary/30 hover:shadow-sm transition-all duration-200">
      <OrderHeader order={order} />
      <OrderProduct order={order} />
      <OrderRoute order={order} />
      <ExpectedPriceDisplay price={order.expectedPrice} />
      <OrderChips order={order} />

      {order.additionalInfo && (
        <p className="text-xs text-[#838383] bg-[#F5F5F5] rounded-xl px-3 py-2 leading-relaxed">
          📝 {order.additionalInfo}
        </p>
      )}

      {hasPendingBid && <MyBidSummary offer={myOffer!} />}

      <ActionButtons
        hasPendingBid={hasPendingBid}
        isAccepting={isAccepting}
        onAccept={onAccept}
        onBid={onBid}
      />
    </div>
  );
}
