"use client";

import { useEffect, useState, useMemo } from "react";
import { toast } from "react-toastify";
<<<<<<< Updated upstream
import { orderAPI } from "@/lib/api";
import {
  Package,
  MapPin,
  Truck,
  Weight,
  Hash,
  FileText,
  RefreshCw,
  Search,
  CheckCircle,
  Loader2,
  ChevronRight,
  Building2,
} from "lucide-react";

type Order = {
  _id: string;
  orderId: string;
  productDetails: string;
  quantity: number;
  weight: number;
  vehicleType: string;
  invoiceNeeded: boolean;
  vatBillNeeded: boolean;
  routeFrom: string;
  routeTo: string;
  additionalInfo?: string;
  createdAt: string;
  manufacturer: { companyName: string; email: string };
};

function InfoChip({
  icon: Icon,
  label,
}: {
  icon: React.ElementType;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 bg-[#F5F5F5] rounded-lg text-xs text-[#5B6871]">
      <Icon size={11} />
      {label}
    </span>
  );
}

function OrderCard({
  order,
  onAccept,
  isAccepting,
}: {
  order: Order;
  onAccept: (orderId: string) => void;
  isAccepting: boolean;
}) {
  function formatDate(d: string) {
    return new Date(d).toLocaleDateString("en-NP", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  return (
    <div className="bg-white rounded-2xl border border-[#E5E9EB] p-5 flex flex-col gap-4 hover:border-primary/30 hover:shadow-sm transition-all duration-200">
      {/* Top row — ID + date */}
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs font-bold text-[#252C32] bg-[#F5F5F5] px-2.5 py-1 rounded-lg">
          #{order.orderId.replace("ORD-", "")}
        </span>
        <span className="text-xs text-[#838383]">
          {formatDate(order.createdAt)}
        </span>
      </div>

      {/* Product */}
      <div>
        <p className="text-sm font-semibold text-[#252C32] leading-snug">
          {order.productDetails}
        </p>
        <div className="flex items-center gap-1.5 mt-1">
          <Building2 size={11} className="text-[#838383]" />
          <p className="text-xs text-[#838383]">
            {order.manufacturer.companyName}
          </p>
        </div>
      </div>

      {/* Route */}
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

      {/* Chips row */}
      <div className="flex flex-wrap gap-2">
        <InfoChip icon={Hash} label={`${order.quantity} units`} />
        <InfoChip icon={Weight} label={`${order.weight} kg`} />
        <InfoChip icon={Truck} label={order.vehicleType.replace("_", " ")} />
        {order.invoiceNeeded && <InfoChip icon={FileText} label="Invoice" />}
        {order.vatBillNeeded && <InfoChip icon={FileText} label="VAT Bill" />}
      </div>

      {/* Additional info */}
      {order.additionalInfo && (
        <p className="text-xs text-[#838383] bg-[#F5F5F5] rounded-xl px-3 py-2 leading-relaxed">
          📝 {order.additionalInfo}
        </p>
      )}

      {/* Accept Button */}
      <button
        onClick={() => onAccept(order.orderId)}
        disabled={isAccepting}
        className="w-full flex items-center justify-center gap-2 py-2.5 bg-primary hover:bg-primary-dark text-white text-sm font-medium rounded-xl transition disabled:opacity-60"
      >
        {isAccepting ? (
          <>
            <Loader2 size={15} className="animate-spin" />
            Accepting...
          </>
        ) : (
          <>
            <CheckCircle size={15} />
            Accept Order
          </>
        )}
      </button>
    </div>
  );
}
=======
import { orderAPI, priceOfferAPI } from "@/lib/api";
import { Package, RefreshCw, Search } from "lucide-react";
import OrderCard, { type Order, type MyOffer } from "./order-card";
import SubmitOfferModal from "./submit-offer";

type OfferMap = Record<string, MyOffer>;
>>>>>>> Stashed changes

export default function OrdersPlacement() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
<<<<<<< Updated upstream
=======
  const [activeModal, setActiveModal] = useState<{
    orderId: string;
    orderDetails: string;
    expectedPrice?: number | null;
    existingOffer: MyOffer | null;
  } | null>(null);
>>>>>>> Stashed changes

  async function fetchOrders(silent = false) {
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);
    try {
      const data = await orderAPI.getOrders();
<<<<<<< Updated upstream
      setOrders(Array.isArray(data.orders) ? data.orders : []);
=======
      const fetched: Order[] = Array.isArray(data.orders) ? data.orders : [];
      setOrders(fetched);

      const results = await Promise.allSettled(
        fetched.map((o) => priceOfferAPI.getOffers(o.orderId)),
      );

      const newMap: OfferMap = {};
      results.forEach((result, i) => {
        if (result.status === "fulfilled") {
          const offers: MyOffer[] = result.value.offers || [];
          if (offers.length > 0) newMap[fetched[i].orderId] = offers[0];
        }
      });
      setOfferMap(newMap);
>>>>>>> Stashed changes
    } catch {
      if (silent) toast.error("Failed to refresh orders");
      setOrders([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }

  useEffect(() => {
    fetchOrders();
  }, []);

<<<<<<< Updated upstream
  async function handleAccept(orderId: string) {
=======
  async function handleAcceptOrder(orderId: string) {
>>>>>>> Stashed changes
    setAcceptingId(orderId);
    try {
      await orderAPI.acceptOrder(orderId);
      toast.success("Order accepted! Check your History tab.");
<<<<<<< Updated upstream
      // Remove from available list immediately
=======
>>>>>>> Stashed changes
      setOrders((prev) => prev.filter((o) => o.orderId !== orderId));
    } catch (error: any) {
      toast.error(error.message || "Failed to accept order");
    } finally {
      setAcceptingId(null);
    }
<<<<<<< Updated upstream
=======
  }

  function handleOfferSuccess(offer: MyOffer) {
    if (!activeModal) return;
    if (offer.status === "withdrawn") {
      setOfferMap((prev) => {
        const next = { ...prev };
        delete next[activeModal.orderId];
        return next;
      });
    } else {
      setOfferMap((prev) => ({ ...prev, [activeModal.orderId]: offer }));
    }
>>>>>>> Stashed changes
  }

  const filteredOrders = useMemo(() => {
    if (!searchQuery.trim()) return orders;
    const q = searchQuery.toLowerCase();
    return orders.filter(
      (o) =>
        o.orderId.toLowerCase().includes(q) ||
        o.productDetails.toLowerCase().includes(q) ||
        o.routeFrom.toLowerCase().includes(q) ||
        o.routeTo.toLowerCase().includes(q) ||
        o.manufacturer.companyName.toLowerCase().includes(q),
    );
  }, [orders, searchQuery]);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-5">
        <div className="h-8 w-48 bg-[#F5F5F5] rounded-lg animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
<<<<<<< Updated upstream
              className="h-64 bg-[#F5F5F5] rounded-2xl animate-pulse"
=======
              className="h-80 bg-[#F5F5F5] rounded-2xl animate-pulse"
>>>>>>> Stashed changes
            />
          ))}
        </div>
      </div>
    );
  }

  return (
<<<<<<< Updated upstream
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#252C32]">
            Available Orders
          </h1>
          <p className="text-sm text-[#838383] mt-0.5">
            Browse and accept open shipment requests from manufacturers
          </p>
        </div>
        <button
          onClick={() => fetchOrders(true)}
          disabled={isRefreshing}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#E5E9EB] text-sm text-[#5B6871] hover:bg-[#F5F5F5] transition disabled:opacity-50"
        >
          <RefreshCw size={14} className={isRefreshing ? "animate-spin" : ""} />
          Refresh
        </button>
=======
    <>
      {activeModal && (
        <SubmitOfferModal
          orderId={activeModal.orderId}
          orderDetails={activeModal.orderDetails}
          expectedPrice={activeModal.expectedPrice}
          existingOffer={activeModal.existingOffer}
          onClose={() => setActiveModal(null)}
          onSuccess={(offer) => {
            handleOfferSuccess(offer);
            setActiveModal(null);
          }}
        />
      )}

      <div className="flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-[#252C32]">
              Available Orders
            </h1>
            <p className="text-sm text-[#838383] mt-0.5">
              Accept at the expected price, or bid at your preferred price
            </p>
          </div>
          <button
            onClick={() => fetchOrders(true)}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#E5E9EB] text-sm text-[#5B6871] hover:bg-[#F5F5F5] transition disabled:opacity-50"
          >
            <RefreshCw
              size={14}
              className={isRefreshing ? "animate-spin" : ""}
            />
            Refresh
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#B0B7C3]"
            />
            <input
              type="text"
              placeholder="Search by product, city, or company..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-[#F5F5F5] text-sm placeholder:text-[#B0B7C3] outline-none focus:ring-2 focus:ring-primary/30 transition"
            />
          </div>
          <span className="text-xs text-[#838383] shrink-0">
            <span className="font-semibold text-[#252C32]">
              {filteredOrders.length}
            </span>{" "}
            order{filteredOrders.length !== 1 ? "s" : ""} available
          </span>
        </div>

        {filteredOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-2xl border border-[#E5E9EB]">
            <div className="w-16 h-16 rounded-2xl bg-[#F5F5F5] flex items-center justify-center mb-4">
              <Package size={28} className="text-[#B0B7C3]" />
            </div>
            <p className="text-sm font-medium text-[#252C32]">
              {searchQuery
                ? "No orders match your search"
                : "No orders available right now"}
            </p>
            <p className="text-xs text-[#838383] mt-1">
              {searchQuery
                ? "Try a different search term"
                : "Check back soon — manufacturers are placing orders"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredOrders.map((order) => (
              <OrderCard
                key={order._id}
                order={order}
                myOffer={offerMap[order.orderId] || null}
                isAccepting={acceptingId === order.orderId}
                onAccept={() => handleAcceptOrder(order.orderId)}
                onBid={() =>
                  setActiveModal({
                    orderId: order.orderId,
                    orderDetails: order.productDetails,
                    expectedPrice: order.expectedPrice,
                    existingOffer: offerMap[order.orderId] || null,
                  })
                }
              />
            ))}
          </div>
        )}
>>>>>>> Stashed changes
      </div>

      {/* Search + count */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#B0B7C3]"
          />
          <input
            type="text"
            placeholder="Search by product, city, or company..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-[#F5F5F5] text-sm text-[#252C32] placeholder:text-[#B0B7C3] outline-none focus:ring-2 focus:ring-primary/30 transition"
          />
        </div>
        <span className="text-xs text-[#838383] shrink-0">
          <span className="font-semibold text-[#252C32]">
            {filteredOrders.length}
          </span>{" "}
          order{filteredOrders.length !== 1 ? "s" : ""} available
        </span>
      </div>

      {/* Orders grid / empty state */}
      {filteredOrders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-2xl border border-[#E5E9EB]">
          <div className="w-16 h-16 rounded-2xl bg-[#F5F5F5] flex items-center justify-center mb-4">
            <Package size={28} className="text-[#B0B7C3]" />
          </div>
          <p className="text-sm font-medium text-[#252C32]">
            {searchQuery
              ? "No orders match your search"
              : "No orders available right now"}
          </p>
          <p className="text-xs text-[#838383] mt-1">
            {searchQuery
              ? "Try a different search term"
              : "Check back soon — manufacturers are placing orders"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredOrders.map((order) => (
            <OrderCard
              key={order._id}
              order={order}
              onAccept={handleAccept}
              isAccepting={acceptingId === order.orderId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
