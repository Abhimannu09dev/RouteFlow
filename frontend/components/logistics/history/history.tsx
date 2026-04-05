"use client";

import { useEffect, useState, useMemo } from "react";
import { toast } from "react-toastify";
import { orderAPI, type PaginationMeta } from "@/lib/api";
import Pagination from "@/components/shared/pagination";
import {
  Package,
  MapPin,
  Truck,
  CheckCircle,
  Clock,
  XCircle,
  RefreshCw,
  Search,
  ChevronRight,
  Building2,
  Hash,
  Weight,
  ChevronDown,
  Loader2,
} from "lucide-react";

type OrderStatus = "accepted" | "in transit" | "delivered" | "cancelled";

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
  manufacturer: { companyName: string; email: string };
};

const STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; color: string; bg: string; icon: React.ElementType }
> = {
  accepted: {
    label: "Accepted",
    color: "text-blue-600",
    bg: "bg-blue-50 border-blue-200",
    icon: Clock,
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

const STATUS_TRANSITIONS: Record<
  string,
  { label: string; next: OrderStatus; color: string }[]
> = {
  accepted: [
    {
      label: "Mark as In Transit",
      next: "in transit",
      color: "bg-purple-500 hover:bg-purple-600",
    },
  ],
  "in transit": [
    {
      label: "Mark as Delivered",
      next: "delivered",
      color: "bg-green-500 hover:bg-green-600",
    },
    {
      label: "Cancel Order",
      next: "cancelled",
      color: "bg-red-400 hover:bg-red-500",
    },
  ],
  delivered: [],
  cancelled: [],
};

const FILTER_TABS: { label: string; value: "all" | OrderStatus }[] = [
  { label: "All", value: "all" },
  { label: "Accepted", value: "accepted" },
  { label: "In Transit", value: "in transit" },
  { label: "Delivered", value: "delivered" },
  { label: "Cancelled", value: "cancelled" },
];

const ITEMS_PER_PAGE = 10;

function StatusBadge({ status }: { status: OrderStatus }) {
  const cfg = STATUS_CONFIG[status];
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

function OrderRow({
  order,
  onStatusUpdate,
  updatingId,
}: {
  order: Order;
  onStatusUpdate: (orderId: string, status: OrderStatus) => void;
  updatingId: string | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const transitions = STATUS_TRANSITIONS[order.status] ?? [];
  const isUpdating = updatingId === order.orderId;

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString("en-NP", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  return (
    <div className="border-b border-[#F5F5F5] last:border-0">
      <div
        className="flex items-center gap-4 px-5 py-4 hover:bg-[#FAFAFA] cursor-pointer transition"
        onClick={() => setExpanded((p) => !p)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
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
            <span className="flex items-center gap-1">
              <Building2 size={10} />
              {order.manufacturer.companyName}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <p className="text-xs text-[#838383] hidden sm:block">
            {formatDate(order.createdAt)}
          </p>
          <ChevronDown
            size={16}
            className={`text-[#838383] transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
          />
        </div>
      </div>

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
                {order.vehicleType.replace("_", " ")}
              </p>
            </div>
            <div>
              <p className="text-xs text-[#838383]">Last Updated</p>
              <p className="text-sm font-medium text-[#252C32] mt-0.5">
                {formatDate(order.updatedAt)}
              </p>
            </div>
          </div>

          {(order.invoiceNeeded || order.vatBillNeeded) && (
            <div className="flex gap-2 mb-4">
              {order.invoiceNeeded && (
                <span className="text-xs px-2.5 py-1 bg-white border border-[#E5E9EB] rounded-lg text-[#5B6871]">
                  Invoice Required
                </span>
              )}
              {order.vatBillNeeded && (
                <span className="text-xs px-2.5 py-1 bg-white border border-[#E5E9EB] rounded-lg text-[#5B6871]">
                  VAT Bill Required
                </span>
              )}
            </div>
          )}

          {order.additionalInfo && (
            <p className="text-xs text-[#838383] bg-white border border-[#E5E9EB] rounded-xl px-3 py-2 mb-4 leading-relaxed">
              📝 {order.additionalInfo}
            </p>
          )}

          {transitions.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2 border-t border-[#E5E9EB]">
              <p className="w-full text-xs text-[#838383] mb-1">
                Update Status:
              </p>
              {transitions.map((t) => (
                <button
                  key={t.next}
                  onClick={(e) => {
                    e.stopPropagation();
                    onStatusUpdate(order.orderId, t.next);
                  }}
                  disabled={isUpdating}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-white text-xs font-medium transition disabled:opacity-60 ${t.color}`}
                >
                  {isUpdating ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <ChevronRight size={13} />
                  )}
                  {t.label}
                </button>
              ))}
            </div>
          )}

          {transitions.length === 0 && (
            <div
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium border mt-2 ${STATUS_CONFIG[order.status].bg} ${STATUS_CONFIG[order.status].color}`}
            >
              {order.status === "delivered"
                ? "✅ This order has been delivered successfully."
                : "❌ This order was cancelled."}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function LogisticsHistory() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    total: 0,
    page: 1,
    limit: ITEMS_PER_PAGE,
    totalPages: 1,
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<"all" | OrderStatus>("all");
  const [searchQuery, setSearchQuery] = useState("");

  async function fetchOrders(page = currentPage, silent = false) {
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);
    try {
      const data = await orderAPI.getMyOrders({ page, limit: ITEMS_PER_PAGE });
      setOrders(Array.isArray(data.orders) ? data.orders : []);
      if (data.pagination) setPagination(data.pagination);
    } catch {
      if (silent) toast.error("Failed to refresh");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }

  useEffect(() => {
    fetchOrders(currentPage);
  }, [currentPage]);
  useEffect(() => {
    setCurrentPage(1);
  }, [activeFilter, searchQuery]);

  async function handleStatusUpdate(orderId: string, status: OrderStatus) {
    setUpdatingId(orderId);
    try {
      const data = await orderAPI.updateStatus(orderId, status);
      setOrders((prev) =>
        prev.map((o) => (o.orderId === orderId ? { ...o, ...data.order } : o)),
      );
      toast.success(`Order marked as ${status}`);
    } catch (error: unknown) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update status",
      );
    } finally {
      setUpdatingId(null);
    }
  }

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const matchesFilter = activeFilter === "all" || o.status === activeFilter;
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        o.orderId.toLowerCase().includes(q) ||
        o.productDetails.toLowerCase().includes(q) ||
        o.routeFrom.toLowerCase().includes(q) ||
        o.routeTo.toLowerCase().includes(q) ||
        o.manufacturer.companyName.toLowerCase().includes(q);
      return matchesFilter && matchesSearch;
    });
  }, [orders, activeFilter, searchQuery]);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="h-8 w-48 bg-[#F5F5F5] rounded-lg animate-pulse" />
        <div className="bg-white rounded-2xl border border-[#E5E9EB] overflow-hidden">
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#252C32]">
            Order History
          </h1>
          <p className="text-sm text-[#838383] mt-0.5">
            Manage and update your accepted orders
          </p>
        </div>
        <button
          onClick={() => fetchOrders(currentPage, true)}
          disabled={isRefreshing}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#E5E9EB] text-sm text-[#5B6871] hover:bg-[#F5F5F5] transition disabled:opacity-50"
        >
          <RefreshCw size={14} className={isRefreshing ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-[#E5E9EB] overflow-hidden">
        <div className="p-4 border-b border-[#F5F5F5]">
          <div className="relative max-w-sm">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#B0B7C3]"
            />
            <input
              type="text"
              placeholder="Search orders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-[#F5F5F5] text-sm text-[#252C32] placeholder:text-[#B0B7C3] outline-none focus:ring-2 focus:ring-primary/30 transition"
            />
          </div>
        </div>

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
                : "Accept orders from the Orders Placement tab"}
            </p>
          </div>
        ) : (
          filteredOrders.map((order) => (
            <OrderRow
              key={order._id}
              order={order}
              onStatusUpdate={handleStatusUpdate}
              updatingId={updatingId}
            />
          ))
        )}

        {pagination.totalPages > 1 && (
          <div className="px-4 border-t border-[#F5F5F5]">
            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              totalItems={pagination.total}
              itemsPerPage={ITEMS_PER_PAGE}
              itemLabel="orders"
              onPageChange={(page) => setCurrentPage(page)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
