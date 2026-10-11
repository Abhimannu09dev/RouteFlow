"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { orderAPI, priceOfferAPI } from "@/lib/api";
import {
  Gavel,
  Package,
  MapPin,
  ChevronRight,
  Clock,
  CheckCircle,
  Search,
  RefreshCw,
} from "lucide-react";

//  Types

type Order = {
  _id: string;
  orderId: string;
  productDetails: string;
  status: string;
  routeFrom: string;
  routeTo: string;
  expectedPrice?: number | null;
  createdAt: string;
  logistics?: { companyName: string } | null;
};

type Offer = {
  _id: string;
  proposedPrice: number;
  estimatedDeliveryDays: number;
  status: string;
  logistics: { companyName: string };
};

type OrderWithOffers = {
  order: Order;
  offers: Offer[];
  lowestPrice: number | null;
};

//  Bid Status Badge

function BidStatusBadge({
  count,
  orderStatus,
}: {
  count: number;
  orderStatus: string;
}) {
  if (orderStatus !== "pending") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 border border-green-200 text-green-600">
        <CheckCircle size={10} />
        Confirmed
      </span>
    );
  }
  if (count === 0) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-[#F5F5F5] border border-[#E5E9EB] text-[#838383]">
        <Clock size={10} />
        No bids yet
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 border border-amber-200 text-amber-600">
      <Gavel size={10} />
      {count} bid{count !== 1 ? "s" : ""}
    </span>
  );
}

//  Order Bid Row

function OrderBidRow({
  item,
  onClick,
}: {
  item: OrderWithOffers;
  onClick: () => void;
}) {
  const { order, offers, lowestPrice } = item;
  const pendingOffers = offers.filter((o) => o.status === "pending");

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString("en-NP", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  return (
    <div
      onClick={onClick}
      className="flex flex-col sm:flex-row sm:items-center gap-4 p-5 hover:bg-[#FAFAFA] cursor-pointer transition border-b border-[#F5F5F5] last:border-0"
    >
      {/* Order info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className="font-mono text-xs font-bold text-[#252C32]">
            #{order.orderId.replace("ORD-", "")}
          </span>
          <BidStatusBadge
            count={pendingOffers.length}
            orderStatus={order.status}
          />
        </div>
        <p className="text-sm font-medium text-[#252C32] truncate">
          {order.productDetails}
        </p>
        <div className="flex items-center gap-1 mt-0.5 text-xs text-[#838383]">
          <MapPin size={10} />
          <span>
            {order.routeFrom} → {order.routeTo}
          </span>
        </div>
      </div>

      {/* Price info */}
      <div className="flex items-center gap-6 shrink-0">
        {/* Expected price */}
        <div className="text-right">
          <p className="text-[10px] text-[#838383]">Expected</p>
          <p className="text-sm font-semibold text-[#252C32]">
            {order.expectedPrice
              ? `NPR ${order.expectedPrice.toLocaleString()}`
              : "Open"}
          </p>
        </div>

        {/* Lowest bid */}
        <div className="text-right">
          <p className="text-[10px] text-[#838383]">Lowest Bid</p>
          <p
            className={`text-sm font-semibold ${lowestPrice ? "text-green-600" : "text-[#B0B7C3]"}`}
          >
            {lowestPrice ? `NPR ${lowestPrice.toLocaleString()}` : "—"}
          </p>
        </div>

        {/* Date + chevron */}
        <div className="text-right hidden sm:block">
          <p className="text-[10px] text-[#838383]">Placed</p>
          <p className="text-xs text-[#252C32]">
            {formatDate(order.createdAt)}
          </p>
        </div>

        <ChevronRight size={16} className="text-[#B0B7C3]" />
      </div>
    </div>
  );
}

//  Main Component

export default function ManufacturerBids() {
  const router = useRouter();
  const [items, setItems] = useState<OrderWithOffers[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<
    "all" | "open" | "received" | "confirmed"
  >("all");

  //  Fetch orders + their offers

  async function fetchData(silent = false) {
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);

    try {
      const data = await orderAPI.getOrders({ page: 1, limit: 1000 });
      const orders: Order[] = Array.isArray(data.orders) ? data.orders : [];

      // Fetch offers for all orders in parallel
      const offerResults = await Promise.allSettled(
        orders.map((o) => priceOfferAPI.getOffers(o.orderId)),
      );

      const combined: OrderWithOffers[] = orders.map((order, i) => {
        const result = offerResults[i];
        const offers: Offer[] =
          result.status === "fulfilled" ? result.value.offers || [] : [];

        const pendingPrices = offers
          .filter((o) => o.status === "pending")
          .map((o) => o.proposedPrice);

        return {
          order,
          offers,
          lowestPrice:
            pendingPrices.length > 0 ? Math.min(...pendingPrices) : null,
        };
      });

      setItems(combined);
    } catch {
      if (silent) toast.error("Failed to refresh");
      setItems([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  //  Stats

  const stats = useMemo(
    () => ({
      total: items.length,
      open: items.filter(
        (i) =>
          i.order.status === "pending" &&
          i.offers.filter((o) => o.status === "pending").length === 0,
      ).length,
      received: items.filter(
        (i) =>
          i.order.status === "pending" &&
          i.offers.filter((o) => o.status === "pending").length > 0,
      ).length,
      confirmed: items.filter((i) => i.order.status !== "pending").length,
    }),
    [items],
  );

  //  Filter + search

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const pendingCount = item.offers.filter(
        (o) => o.status === "pending",
      ).length;

      const matchesFilter =
        activeFilter === "all" ||
        (activeFilter === "open" &&
          item.order.status === "pending" &&
          pendingCount === 0) ||
        (activeFilter === "received" &&
          item.order.status === "pending" &&
          pendingCount > 0) ||
        (activeFilter === "confirmed" && item.order.status !== "pending");

      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        item.order.orderId.toLowerCase().includes(q) ||
        item.order.productDetails.toLowerCase().includes(q) ||
        item.order.routeFrom?.toLowerCase().includes(q) ||
        item.order.routeTo?.toLowerCase().includes(q);

      return matchesFilter && matchesSearch;
    });
  }, [items, activeFilter, searchQuery]);

  //  Loading

  if (isLoading) {
    return (
      <div className="flex flex-col gap-5">
        <div className="h-8 w-48 bg-[#F5F5F5] rounded-lg animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-20 bg-[#F5F5F5] rounded-2xl animate-pulse"
            />
          ))}
        </div>
        <div className="bg-white rounded-2xl border border-[#E5E9EB]">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-20 border-b border-[#F5F5F5] animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  //  Render

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#252C32]">Bids</h1>
          <p className="text-sm text-[#838383] mt-0.5">
            Track price offers received on your orders
          </p>
        </div>
        <button
          onClick={() => fetchData(true)}
          disabled={isRefreshing}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#E5E9EB] text-sm text-[#5B6871] hover:bg-[#F5F5F5] transition disabled:opacity-50"
        >
          <RefreshCw size={14} className={isRefreshing ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Total Orders",
            value: stats.total,
            color: "bg-[#252C32]",
            icon: Package,
          },
          {
            label: "Awaiting Bids",
            value: stats.open,
            color: "bg-[#838383]",
            icon: Clock,
          },
          {
            label: "Bids Received",
            value: stats.received,
            color: "bg-amber-400",
            icon: Gavel,
          },
          {
            label: "Confirmed",
            value: stats.confirmed,
            color: "bg-green-500",
            icon: CheckCircle,
          },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-white rounded-2xl border border-[#E5E9EB] p-4 flex items-center gap-3"
          >
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${s.color}`}
            >
              <s.icon size={18} className="text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#252C32]">{s.value}</p>
              <p className="text-xs text-[#838383]">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* List */}
      <div className="bg-white rounded-2xl border border-[#E5E9EB] overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-[#F5F5F5]">
          <div className="relative max-w-sm">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#B0B7C3]"
            />
            <input
              type="text"
              placeholder="Search by order, product, or city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-[#F5F5F5] text-sm placeholder:text-[#B0B7C3] outline-none focus:ring-2 focus:ring-primary/30 transition"
            />
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 px-4 py-2 border-b border-[#F5F5F5] overflow-x-auto">
          {[
            { label: "All", value: "all" as const, count: stats.total },
            {
              label: "Awaiting Bids",
              value: "open" as const,
              count: stats.open,
            },
            {
              label: "Bids Received",
              value: "received" as const,
              count: stats.received,
            },
            {
              label: "Confirmed",
              value: "confirmed" as const,
              count: stats.confirmed,
            },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveFilter(tab.value)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition ${
                activeFilter === tab.value
                  ? "bg-primary text-white"
                  : "text-[#5B6871] hover:bg-[#F5F5F5]"
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
                    activeFilter === tab.value
                      ? "bg-white/20 text-white"
                      : "bg-[#F5F5F5] text-[#838383]"
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Column headers */}
        <div className="hidden sm:flex items-center px-5 py-2 border-b border-[#F5F5F5] bg-[#FAFAFA]">
          <p className="flex-1 text-xs font-medium text-[#838383]">Order</p>
          <div className="flex items-center gap-6 shrink-0 mr-8">
            <p className="text-xs font-medium text-[#838383] w-24 text-right">
              Expected
            </p>
            <p className="text-xs font-medium text-[#838383] w-24 text-right">
              Lowest Bid
            </p>
            <p className="text-xs font-medium text-[#838383] w-20 text-right">
              Placed
            </p>
          </div>
        </div>

        {/* Rows */}
        {filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#F5F5F5] flex items-center justify-center mb-3">
              <Gavel size={24} className="text-[#B0B7C3]" />
            </div>
            <p className="text-sm font-medium text-[#252C32]">
              No orders found
            </p>
            <p className="text-xs text-[#838383] mt-1">
              {searchQuery || activeFilter !== "all"
                ? "Try adjusting your search or filter"
                : "Place an order to start receiving bids"}
            </p>
          </div>
        ) : (
          filteredItems.map((item) => (
            <OrderBidRow
              key={item.order._id}
              item={item}
              onClick={() =>
                router.push(
                  `/manufacturer/order-management/${item.order.orderId}`,
                )
              }
            />
          ))
        )}

        {/* Footer */}
        {filteredItems.length > 0 && (
          <div className="px-5 py-3 border-t border-[#F5F5F5]">
            <p className="text-xs text-[#838383]">
              Showing{" "}
              <span className="font-medium text-[#252C32]">
                {filteredItems.length}
              </span>{" "}
              of{" "}
              <span className="font-medium text-[#252C32]">{items.length}</span>{" "}
              orders
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
