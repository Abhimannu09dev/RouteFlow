"use client";

import { useEffect, useState, useMemo } from "react";
import { orderAPI } from "@/lib/api";
import {
  Package,
  CheckCircle,
  XCircle,
  MapPin,
  Search,
  RefreshCw,
  Building2,
  Weight,
  Hash,
  Truck,
  ChevronDown,
  Clock,
} from "lucide-react";

type OrderStatus =
  | "pending"
  | "accepted"
  | "in transit"
  | "delivered"
  | "cancelled";

type Order = {
  _id: string;
  orderId: string;
  productDetails: string;
  quantity: number;
  weight: number;
  vehicleType: string;
  status: OrderStatus;
  routeFrom: string;
  routeTo: string;
  additionalInfo?: string;
  createdAt: string;
  updatedAt: string;
  logistics?: {
    companyName: string;
    email: string;
  } | null;
};

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; icon: React.ElementType }
> = {
  delivered: {
    label: "Delivered",
    color: "text-green-600",
    bg: "bg-green-50 border-green-200",
    icon: CheckCircle,
  },
  cancelled: {
    label: "Cancelled",
    color: "text-red-500",
    bg: "bg-red-50 border-red-200",
    icon: XCircle,
  },
  "in transit": {
    label: "In Transit",
    color: "text-purple-600",
    bg: "bg-purple-50 border-purple-200",
    icon: Truck,
  },
  accepted: {
    label: "Accepted",
    color: "text-blue-600",
    bg: "bg-blue-50 border-blue-200",
    icon: Clock,
  },
  pending: {
    label: "Pending",
    color: "text-amber-600",
    bg: "bg-amber-50 border-amber-200",
    icon: Clock,
  },
};

const FILTER_TABS = [
  { label: "All", value: "all" },
  { label: "Delivered", value: "delivered" },
  { label: "In Transit", value: "in transit" },
  { label: "Cancelled", value: "cancelled" },
];

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const Icon = cfg.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${cfg.bg} ${cfg.color}`}
    >
      <Icon size={11} />
      {cfg.label}
    </span>
  );
}

function OrderRow({ order }: { order: Order }) {
  const [expanded, setExpanded] = useState(false);

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString("en-NP", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  return (
    <div className="border-b border-[#F5F5F5] last:border-0">
      {/* Collapsed row */}
      <div
        className="flex items-center gap-4 px-5 py-4 hover:bg-[#FAFAFA] cursor-pointer transition"
        onClick={() => setExpanded((p) => !p)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <span className="font-mono text-xs font-bold text-[#252C32]">
              #{order.orderId.replace("ORD-", "")}
            </span>
            <StatusBadge status={order.status} />
          </div>
          <p className="text-sm text-[#252C32] truncate">
            {order.productDetails}
          </p>
          <div className="flex items-center gap-3 mt-0.5 text-xs text-[#838383]">
            <span className="flex items-center gap-1">
              <MapPin size={10} />
              {order.routeFrom} → {order.routeTo}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <p className="text-xs text-[#838383] hidden sm:block">
            {formatDate(order.createdAt)}
          </p>
          <ChevronDown
            size={15}
            className={`text-[#838383] transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
          />
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-5 pb-5 bg-[#FAFAFA] border-t border-[#F5F5F5]">
          <div className="pt-4 grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
            <div>
              <p className="text-xs text-[#838383]">Quantity</p>
              <p className="text-sm font-medium text-[#252C32] flex items-center gap-1 mt-0.5">
                <Hash size={12} className="text-primary" />
                {order.quantity} units
              </p>
            </div>
            <div>
              <p className="text-xs text-[#838383]">Weight</p>
              <p className="text-sm font-medium text-[#252C32] flex items-center gap-1 mt-0.5">
                <Weight size={12} className="text-primary" />
                {order.weight} kg
              </p>
            </div>
            <div>
              <p className="text-xs text-[#838383]">Vehicle</p>
              <p className="text-sm font-medium text-[#252C32] flex items-center gap-1 mt-0.5">
                <Truck size={12} className="text-primary" />
                {order.vehicleType?.replace("_", " ") || "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-[#838383]">Last Updated</p>
              <p className="text-sm font-medium text-[#252C32] mt-0.5">
                {formatDate(order.updatedAt)}
              </p>
            </div>
          </div>

          {/* Logistics partner */}
          {order.logistics ? (
            <div className="flex items-center gap-2 px-3 py-2.5 bg-white border border-[#E5E9EB] rounded-xl mb-3">
              <Building2 size={14} className="text-primary shrink-0" />
              <div>
                <p className="text-xs font-medium text-[#252C32]">
                  {order.logistics.companyName}
                </p>
                <p className="text-xs text-[#838383]">
                  {order.logistics.email}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-xs text-[#B0B7C3] italic mb-3">
              No logistics partner assigned
            </p>
          )}

          {/* Additional info */}
          {order.additionalInfo && (
            <p className="text-xs text-[#838383] bg-white border border-[#E5E9EB] rounded-xl px-3 py-2 leading-relaxed">
              📝 {order.additionalInfo}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function ManufacturerHistory() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");

  async function fetchOrders(silent = false) {
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);
    try {
      const data = await orderAPI.getMyOrders();
      const all = Array.isArray(data.orders) ? data.orders : [];
      // History = all orders except pure pending with no partner
      setOrders(all);
    } catch {
      setOrders([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }

  useEffect(() => {
    fetchOrders();
  }, []);

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const matchesFilter = activeFilter === "all" || o.status === activeFilter;
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        o.orderId.toLowerCase().includes(q) ||
        o.productDetails.toLowerCase().includes(q) ||
        o.routeFrom?.toLowerCase().includes(q) ||
        o.routeTo?.toLowerCase().includes(q) ||
        o.logistics?.companyName?.toLowerCase().includes(q);
      return matchesFilter && matchesSearch;
    });
  }, [orders, activeFilter, searchQuery]);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="h-8 w-48 bg-white rounded-lg animate-pulse" />
        <div className="bg-white rounded-2xl border border-[#E5E9EB]">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-16 border-b border-[#F5F5F5] animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#252C32]">
            Order History
          </h1>
          <p className="text-sm text-[#838383] mt-0.5">
            All your orders and their current status
          </p>
        </div>
        <button
          onClick={() => fetchOrders(true)}
          disabled={isRefreshing}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#E5E9EB] bg-white text-sm text-[#5B6871] hover:bg-[#F5F5F5] transition disabled:opacity-50"
        >
          <RefreshCw size={14} className={isRefreshing ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-[#E5E9EB] overflow-hidden">
        {/* Search */}
        <div className="p-4 border-b border-[#F5F5F5]">
          <div className="relative max-w-sm">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#B0B7C3]"
            />
            <input
              type="text"
              placeholder="Search by order, product, city, or partner..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-[#F5F5F5] text-sm placeholder:text-[#B0B7C3] outline-none focus:ring-2 focus:ring-primary/30 transition"
            />
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 px-4 py-2 border-b border-[#F5F5F5] overflow-x-auto">
          {FILTER_TABS.map((tab) => {
            const count =
              tab.value === "all"
                ? orders.length
                : orders.filter((o) => o.status === tab.value).length;
            return (
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
                {count > 0 && (
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
                      activeFilter === tab.value
                        ? "bg-white/20 text-white"
                        : "bg-[#F5F5F5] text-[#838383]"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Orders */}
        {filteredOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#F5F5F5] flex items-center justify-center mb-3">
              <Package size={24} className="text-[#B0B7C3]" />
            </div>
            <p className="text-sm font-medium text-[#252C32]">
              {searchQuery || activeFilter !== "all"
                ? "No orders match your filter"
                : "No orders yet"}
            </p>
            <p className="text-xs text-[#838383] mt-1">
              {searchQuery || activeFilter !== "all"
                ? "Try adjusting your search or filter"
                : "Your order history will appear here"}
            </p>
          </div>
        ) : (
          filteredOrders.map((order) => (
            <OrderRow key={order._id} order={order} />
          ))
        )}

        {/* Footer */}
        {filteredOrders.length > 0 && (
          <div className="px-5 py-3 border-t border-[#F5F5F5]">
            <p className="text-xs text-[#838383]">
              Showing{" "}
              <span className="font-medium text-[#252C32]">
                {filteredOrders.length}
              </span>{" "}
              of{" "}
              <span className="font-medium text-[#252C32]">
                {orders.length}
              </span>{" "}
              orders
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
