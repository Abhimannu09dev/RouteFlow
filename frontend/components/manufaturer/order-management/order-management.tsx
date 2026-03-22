"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { orderAPI } from "@/lib/api";
import {
  Plus,
  Search,
  Package,
  Clock,
  Truck,
  CheckCircle,
  XCircle,
  ChevronRight,
  RefreshCw,
  MapPin,
  Weight,
  Hash,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

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
  invoiceNeeded: boolean;
  vatBillNeeded: boolean;
  status: OrderStatus;
  routeFrom: string;
  routeTo: string;
  additionalInfo?: string;
  createdAt: string;
  updatedAt: string;
  logistics?: { companyName: string; email: string } | null;
};

// ── Status Config ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  OrderStatus,
  {
    label: string;
    color: string;
    bg: string;
    icon: React.ElementType;
  }
> = {
  pending: {
    label: "Pending",
    color: "text-amber-600",
    bg: "bg-amber-50 border-amber-200",
    icon: Clock,
  },
  accepted: {
    label: "Accepted",
    color: "text-blue-600",
    bg: "bg-blue-50 border-blue-200",
    icon: CheckCircle,
  },
  "in transit": {
    label: "In Transit",
    color: "text-purple-600",
    bg: "bg-purple-50 border-purple-200",
    icon: Truck,
  },
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
};

const FILTER_TABS: { label: string; value: "all" | OrderStatus }[] = [
  { label: "All Orders", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "Accepted", value: "accepted" },
  { label: "In Transit", value: "in transit" },
  { label: "Delivered", value: "delivered" },
  { label: "Cancelled", value: "cancelled" },
];

// ── Sub-components ────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: OrderStatus }) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${config.bg} ${config.color}`}
    >
      <Icon size={11} />
      {config.label}
    </span>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-[#E5E9EB] p-4 flex items-center gap-4">
      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}
      >
        <Icon size={18} className="text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-[#252C32]">{value}</p>
        <p className="text-xs text-[#838383]">{label}</p>
      </div>
    </div>
  );
}

function EmptyState({ filtered }: { filtered: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-2xl bg-[#F5F5F5] flex items-center justify-center mb-4">
        <Package size={28} className="text-[#B0B7C3]" />
      </div>
      <p className="text-sm font-medium text-[#252C32]">
        {filtered ? "No orders match your filter" : "No orders yet"}
      </p>
      <p className="text-xs text-[#838383] mt-1 mb-5">
        {filtered
          ? "Try a different status filter or search term"
          : "Place your first order to get started"}
      </p>
      {!filtered && (
        <Link
          href="/manufacturer/order-management/order-placement-form"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-white text-sm font-medium rounded-xl hover:bg-primary-dark transition"
        >
          <Plus size={15} />
          Place First Order
        </Link>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function OrderManagement() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | OrderStatus>("all");
  const [isRefreshing, setIsRefreshing] = useState(false);

  async function fetchOrders(silent = false) {
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);

    try {
      const data = await orderAPI.getOrders();
      setOrders(Array.isArray(data.orders) ? data.orders : []);
    } catch (error: any) {
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

  const stats = useMemo(
    () => ({
      total: orders.length,
      pending: orders.filter((o) => o.status === "pending").length,
      inTransit: orders.filter((o) => o.status === "in transit").length,
      delivered: orders.filter((o) => o.status === "delivered").length,
    }),
    [orders],
  );

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesFilter =
        activeFilter === "all" || order.status === activeFilter;
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        !query ||
        order.orderId.toLowerCase().includes(query) ||
        order.productDetails.toLowerCase().includes(query) ||
        order.routeFrom?.toLowerCase().includes(query) ||
        order.routeTo?.toLowerCase().includes(query);
      return matchesFilter && matchesSearch;
    });
  }, [orders, activeFilter, searchQuery]);

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("en-NP", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  function handleViewOrder(orderId: string) {
    router.push(`/manufacturer/order-management/${orderId}`);
  }

  // ── Loading skeleton ───────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="w-full flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <div className="h-6 w-40 bg-[#F5F5F5] rounded-lg animate-pulse" />
          <div className="h-9 w-32 bg-[#F5F5F5] rounded-xl animate-pulse" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-20 bg-[#F5F5F5] rounded-2xl animate-pulse"
            />
          ))}
        </div>
        <div className="bg-white rounded-2xl border border-[#E5E9EB] overflow-hidden">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-16 border-b border-[#F5F5F5] animate-pulse bg-white"
            />
          ))}
        </div>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="w-full flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#252C32]">
            Order Management
          </h1>
          <p className="text-sm text-[#838383] mt-0.5">
            Track and manage all your shipment orders
          </p>
        </div>
        <Link
          href="/manufacturer/order-management/order-placement-form"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary-dark text-white text-sm font-medium rounded-xl transition"
        >
          <Plus size={15} />
          New Order
        </Link>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Orders"
          value={stats.total}
          icon={Package}
          color="bg-[#252C32]"
        />
        <StatCard
          label="Pending"
          value={stats.pending}
          icon={Clock}
          color="bg-amber-400"
        />
        <StatCard
          label="In Transit"
          value={stats.inTransit}
          icon={Truck}
          color="bg-purple-500"
        />
        <StatCard
          label="Delivered"
          value={stats.delivered}
          icon={CheckCircle}
          color="bg-green-500"
        />
      </div>

      {/* Table card */}
      <div className="bg-white rounded-2xl border border-[#E5E9EB] overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-[#F5F5F5] flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#B0B7C3]"
            />
            <input
              type="text"
              placeholder="Search by order ID, product, or city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-[#F5F5F5] text-sm text-[#252C32] placeholder:text-[#B0B7C3] outline-none focus:ring-2 focus:ring-primary/30 transition"
            />
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

        {/* Content */}
        {filteredOrders.length === 0 ? (
          <EmptyState filtered={activeFilter !== "all" || searchQuery !== ""} />
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#F5F5F5]">
                    {[
                      "Order ID",
                      "Product",
                      "Route",
                      "Details",
                      "Logistics Partner",
                      "Status",
                      "Date",
                      "",
                    ].map((h) => (
                      <th
                        key={h}
                        className="text-left text-xs font-medium text-[#838383] px-4 py-3 whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((order) => (
                    <tr
                      key={order._id}
                      className="border-b border-[#F5F5F5] last:border-0 hover:bg-[#FAFAFA] transition"
                    >
                      {/* Order ID */}
                      <td className="px-4 py-3.5">
                        <span className="font-mono text-xs font-semibold text-[#252C32]">
                          #{order.orderId.replace("ORD-", "")}
                        </span>
                      </td>

                      {/* Product */}
                      <td className="px-4 py-3.5 max-w-[180px]">
                        <p className="text-[#252C32] font-medium truncate">
                          {order.productDetails}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-[#838383] flex items-center gap-1">
                            <Hash size={10} />
                            {order.quantity} units
                          </span>
                          <span className="text-xs text-[#838383] flex items-center gap-1">
                            <Weight size={10} />
                            {order.weight} kg
                          </span>
                        </div>
                      </td>

                      {/* Route */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5 text-xs text-[#252C32]">
                          <MapPin size={11} className="text-primary shrink-0" />
                          <span>{order.routeFrom || "—"}</span>
                          <ChevronRight size={11} className="text-[#B0B7C3]" />
                          <span>{order.routeTo || "—"}</span>
                        </div>
                      </td>

                      {/* Vehicle + Docs */}
                      <td className="px-4 py-3.5">
                        <p className="text-xs text-[#252C32] capitalize">
                          {order.vehicleType?.replace(/_/g, " ") || "—"}
                        </p>
                        <div className="flex gap-1 mt-1">
                          {order.invoiceNeeded && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-[#F5F5F5] text-[#5B6871] rounded-md">
                              Invoice
                            </span>
                          )}
                          {order.vatBillNeeded && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-[#F5F5F5] text-[#5B6871] rounded-md">
                              VAT
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Logistics Partner */}
                      <td className="px-4 py-3.5">
                        {order.logistics ? (
                          <div>
                            <p className="text-xs font-medium text-[#252C32]">
                              {order.logistics.companyName}
                            </p>
                            <p className="text-xs text-[#838383]">
                              {order.logistics.email}
                            </p>
                          </div>
                        ) : (
                          <span className="text-xs text-[#B0B7C3] italic">
                            Awaiting partner
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5">
                        <StatusBadge status={order.status} />
                      </td>

                      {/* Date */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <p className="text-xs text-[#838383]">
                          {formatDate(order.createdAt)}
                        </p>
                      </td>

                      {/* View — shows "View Bids" on pending, arrow on others */}
                      <td className="px-4 py-3.5">
                        <button
                          onClick={() => handleViewOrder(order.orderId)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                            order.status === "pending"
                              ? "bg-primary/10 text-primary hover:bg-primary/20"
                              : "hover:bg-[#F5F5F5] text-[#838383] hover:text-primary"
                          }`}
                        >
                          {order.status === "pending" ? (
                            "View Bids"
                          ) : (
                            <ChevronRight size={16} />
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden flex flex-col divide-y divide-[#F5F5F5]">
              {filteredOrders.map((order) => (
                <div
                  key={order._id}
                  className="p-4 hover:bg-[#FAFAFA] transition cursor-pointer"
                  onClick={() => handleViewOrder(order.orderId)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <span className="font-mono text-xs font-semibold text-[#252C32]">
                        #{order.orderId.replace("ORD-", "")}
                      </span>
                      <p className="text-sm font-medium text-[#252C32] mt-0.5">
                        {order.productDetails}
                      </p>
                    </div>
                    <StatusBadge status={order.status} />
                  </div>
                  <div className="flex items-center gap-3 text-xs text-[#838383]">
                    <span className="flex items-center gap-1">
                      <MapPin size={10} />
                      {order.routeFrom} → {order.routeTo}
                    </span>
                    <span>{formatDate(order.createdAt)}</span>
                  </div>
                  {order.logistics ? (
                    <p className="text-xs text-[#5B6871] mt-1">
                      Partner: {order.logistics.companyName}
                    </p>
                  ) : order.status === "pending" ? (
                    <p className="text-xs text-primary font-medium mt-1">
                      Tap to view bids →
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          </>
        )}

        {/* Footer */}
        {filteredOrders.length > 0 && (
          <div className="px-4 py-3 border-t border-[#F5F5F5]">
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
