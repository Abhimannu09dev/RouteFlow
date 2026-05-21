"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { orderAPI, type PaginationMeta } from "@/lib/api";
import Pagination from "@/components/shared/pagination";
import { Dropdown, type MenuProps } from "antd";
import {
  Package,
  MapPin,
  Truck,
  CheckCircle,
  Clock,
  XCircle,
  RefreshCw,
  Search,
  Building2,
  MoreVertical,
  ExternalLink,
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
  const router = useRouter();
  const isUpdating = updatingId === order.orderId;

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString("en-NP", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  const menuItems: MenuProps["items"] = [
    {
      key: "view",
      label: "View Details",
      icon: <ExternalLink size={13} />,
      onClick: () =>
        router.push(`/logistics/orders-placement/${order.orderId}`),
    },
    ...(order.status === "accepted"
      ? [
          { type: "divider" as const },
          {
            key: "in-transit",
            label: isUpdating ? "Updating..." : "Mark as In Transit",
            icon: isUpdating ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <Truck size={13} />
            ),
            disabled: isUpdating,
            onClick: () => onStatusUpdate(order.orderId, "in transit"),
          },
        ]
      : []),
    ...(order.status === "in transit"
      ? [
          { type: "divider" as const },
          {
            key: "delivered",
            label: isUpdating ? "Updating..." : "Mark as Delivered",
            icon: isUpdating ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <CheckCircle size={13} />
            ),
            disabled: isUpdating,
            onClick: () => onStatusUpdate(order.orderId, "delivered"),
          },
          {
            key: "cancelled",
            label: "Cancel Order",
            icon: <XCircle size={13} />,
            disabled: isUpdating,
            danger: true,
            onClick: () => onStatusUpdate(order.orderId, "cancelled"),
          },
        ]
      : []),
  ];

  return (
    <div className="border-b border-[#F5F5F5] last:border-0">
      <div className="flex items-center gap-4 px-5 py-4 hover:bg-[#FAFAFA] transition">
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
          <Dropdown
            menu={{ items: menuItems }}
            trigger={["click"]}
            placement="bottomRight"
          >
            <button
              className="p-1.5 rounded-lg hover:bg-[#F5F5F5] text-[#838383] hover:text-[#252C32] transition"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical size={16} />
            </button>
          </Dropdown>
        </div>
      </div>
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
      const params: { page: number; limit: number; status?: string } = {
        page, limit: ITEMS_PER_PAGE,
      };
      if (activeFilter !== "all") params.status = activeFilter;

      const data = await orderAPI.getMyOrders(params);
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
    if (!searchQuery.trim()) return orders;
    const q = searchQuery.toLowerCase();
    return orders.filter((o) =>
      o.orderId.toLowerCase().includes(q) ||
      o.productDetails.toLowerCase().includes(q) ||
      o.routeFrom.toLowerCase().includes(q) ||
      o.routeTo.toLowerCase().includes(q) ||
      o.manufacturer.companyName.toLowerCase().includes(q)
    );
  }, [orders, searchQuery]);

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
