"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { orderAPI } from "@/lib/api";
import {
  Package,
  Clock,
  Truck,
  CheckCircle,
  Plus,
  ChevronRight,
  MapPin,
  TrendingUp,
  ShieldAlert,
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
  status: OrderStatus;
  routeFrom: string;
  routeTo: string;
  createdAt: string;
  logistics?: { companyName: string } | null;
};

const STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; color: string; bg: string }
> = {
  pending: {
    label: "Pending",
    color: "text-amber-600",
    bg: "bg-amber-50 border-amber-200",
  },
  accepted: {
    label: "Accepted",
    color: "text-blue-600",
    bg: "bg-blue-50 border-blue-200",
  },
  "in transit": {
    label: "In Transit",
    color: "text-purple-600",
    bg: "bg-purple-50 border-purple-200",
  },
  delivered: {
    label: "Delivered",
    color: "text-green-600",
    bg: "bg-green-50 border-green-200",
  },
  cancelled: {
    label: "Cancelled",
    color: "text-red-500",
    bg: "bg-red-50 border-red-200",
  },
};

function StatusBadge({ status }: { status: OrderStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${cfg.bg} ${cfg.color}`}
    >
      {cfg.label}
    </span>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  onClick,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-2xl border border-[#E5E9EB] p-5 flex items-center gap-4 transition ${
        onClick ? "cursor-pointer hover:shadow-md hover:border-primary/30" : ""
      }`}
    >
      <div
        className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${color}`}
      >
        <Icon size={20} className="text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-[#252C32]">{value}</p>
        <p className="text-xs text-[#838383]">{label}</p>
      </div>
    </div>
  );
}

export default function ManufacturerDashboard() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchOrders() {
      try {
        const data = await orderAPI.getMyOrders();
        setOrders(Array.isArray(data.orders) ? data.orders : []);
      } catch {
        setOrders([]);
      } finally {
        setIsLoading(false);
      }
    }
    fetchOrders();
  }, []);

  const stats = useMemo(
    () => ({
      total: orders.length,
      pending: orders.filter((o) => o.status === "pending").length,
      active: orders.filter(
        (o) => o.status === "accepted" || o.status === "in transit",
      ).length,
      delivered: orders.filter((o) => o.status === "delivered").length,
    }),
    [orders],
  );

  // Show 5 most recent orders
  const recentOrders = orders.slice(0, 5);

  // Orders that need attention — pending with no logistics partner yet
  const needsAttention = orders.filter(
    (o) => o.status === "pending" && !o.logistics,
  ).length;

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString("en-NP", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-5">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-white rounded-2xl animate-pulse" />
          ))}
        </div>
        <div className="h-64 bg-white rounded-2xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#252C32]">Dashboard</h1>
          <p className="text-sm text-[#838383] mt-0.5">
            Overview of your shipment activity
          </p>
        </div>
        <button
          onClick={() =>
            router.push("/manufacturer/order-management/order-placement-form")
          }
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary-dark text-white text-sm font-medium rounded-xl transition"
        >
          <Plus size={15} />
          New Order
        </button>
      </div>

      {/* Attention banner — orders awaiting bids */}
      {needsAttention > 0 && (
        <button
          onClick={() => router.push("/manufacturer/order-management")}
          className="w-full flex items-center justify-between px-5 py-4 bg-amber-50 border-2 border-amber-200 rounded-2xl hover:bg-amber-100 transition"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-400 flex items-center justify-center shrink-0">
              <ShieldAlert size={18} className="text-white" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-amber-700">
                {needsAttention} order{needsAttention > 1 ? "s" : ""} awaiting
                price offers
              </p>
              <p className="text-xs text-amber-600">
                Click to view and accept logistics bids
              </p>
            </div>
          </div>
          <span className="text-xs font-medium text-amber-600">View →</span>
        </button>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Orders"
          value={stats.total}
          icon={Package}
          color="bg-[#252C32]"
          onClick={() => router.push("/manufacturer/order-management")}
        />
        <StatCard
          label="Pending"
          value={stats.pending}
          icon={Clock}
          color="bg-amber-400"
          onClick={() => router.push("/manufacturer/order-management")}
        />
        <StatCard
          label="In Progress"
          value={stats.active}
          icon={Truck}
          color="bg-purple-500"
        />
        <StatCard
          label="Delivered"
          value={stats.delivered}
          icon={CheckCircle}
          color="bg-green-500"
          onClick={() => router.push("/manufacturer/history")}
        />
      </div>

      {/* Recent orders */}
      <div className="bg-white rounded-2xl border border-[#E5E9EB] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#F5F5F5]">
          <div className="flex items-center gap-2">
            <TrendingUp size={16} className="text-primary" />
            <p className="text-sm font-semibold text-[#252C32]">
              Recent Orders
            </p>
          </div>
          <button
            onClick={() => router.push("/manufacturer/order-management")}
            className="text-xs text-primary font-medium hover:underline"
          >
            View all
          </button>
        </div>

        {recentOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#F5F5F5] flex items-center justify-center mb-3">
              <Package size={24} className="text-[#B0B7C3]" />
            </div>
            <p className="text-sm font-medium text-[#252C32]">No orders yet</p>
            <p className="text-xs text-[#838383] mt-1 mb-4">
              Place your first order to get started
            </p>
            <button
              onClick={() =>
                router.push(
                  "/manufacturer/order-management/order-placement-form",
                )
              }
              className="px-4 py-2 bg-primary text-white text-xs font-medium rounded-xl hover:bg-primary-dark transition"
            >
              Place First Order
            </button>
          </div>
        ) : (
          <div className="divide-y divide-[#F5F5F5]">
            {recentOrders.map((order) => (
              <div
                key={order._id}
                onClick={() => router.push("/manufacturer/order-management")}
                className="flex items-center justify-between px-5 py-4 hover:bg-[#FAFAFA] cursor-pointer transition"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs font-bold text-[#252C32]">
                      #{order.orderId.replace("ORD-", "")}
                    </span>
                    <StatusBadge status={order.status} />
                  </div>
                  <p className="text-sm text-[#252C32] truncate">
                    {order.productDetails}
                  </p>
                  <div className="flex items-center gap-1 mt-0.5 text-xs text-[#838383]">
                    <MapPin size={10} />
                    <span>
                      {order.routeFrom} → {order.routeTo}
                    </span>
                  </div>
                </div>
                <div className="text-right ml-4 shrink-0">
                  <p className="text-xs text-[#838383]">
                    {formatDate(order.createdAt)}
                  </p>
                  {order.logistics ? (
                    <p className="text-xs text-primary font-medium mt-0.5">
                      {order.logistics.companyName}
                    </p>
                  ) : (
                    <p className="text-xs text-[#B0B7C3] mt-0.5 italic">
                      Awaiting bids
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
