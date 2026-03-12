"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { orderAPI } from "@/lib/api";
import {
  Truck,
  Package,
  CheckCircle,
  Clock,
  ChevronRight,
  MapPin,
  TrendingUp,
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
  createdAt: string;
  manufacturer: { companyName: string; email: string };
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
  sub,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
  sub?: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-[#E5E9EB] p-5 flex items-center gap-4">
      <div
        className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${color}`}
      >
        <Icon size={20} className="text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-[#252C32]">{value}</p>
        <p className="text-xs text-[#838383]">{label}</p>
        {sub && (
          <p className="text-xs text-primary font-medium mt-0.5">{sub}</p>
        )}
      </div>
    </div>
  );
}

export default function LogisticsDashboard() {
  const router = useRouter();
  const [myOrders, setMyOrders] = useState<Order[]>([]);
  const [availableCount, setAvailableCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [myRes, availRes] = await Promise.all([
          orderAPI.getMyOrders(),
          orderAPI.getOrders(),
        ]);
        setMyOrders(Array.isArray(myRes.orders) ? myRes.orders : []);
        setAvailableCount(
          Array.isArray(availRes.orders) ? availRes.orders.length : 0,
        );
      } catch {
        setMyOrders([]);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);

  const stats = useMemo(
    () => ({
      total: myOrders.length,
      active: myOrders.filter((o) => o.status === "in transit").length,
      delivered: myOrders.filter((o) => o.status === "delivered").length,
      accepted: myOrders.filter((o) => o.status === "accepted").length,
    }),
    [myOrders],
  );

  const recentOrders = myOrders.slice(0, 5);

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
            <div
              key={i}
              className="h-20 bg-[#F5F5F5] rounded-2xl animate-pulse"
            />
          ))}
        </div>
        <div className="h-64 bg-[#F5F5F5] rounded-2xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-[#252C32]">Dashboard</h1>
        <p className="text-sm text-[#838383] mt-0.5">
          Overview of your logistics activity
        </p>
      </div>

      {/* Available orders banner */}
      {availableCount > 0 && (
        <button
          onClick={() => router.push("/logistics/orders-placement")}
          className="w-full flex items-center justify-between px-5 py-4 bg-primary/5 border-2 border-primary/20 rounded-2xl hover:bg-primary/10 transition"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
              <Package size={18} className="text-white" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-[#252C32]">
                {availableCount} new order{availableCount > 1 ? "s" : ""}{" "}
                available
              </p>
              <p className="text-xs text-[#838383]">
                Tap to browse and accept open orders
              </p>
            </div>
          </div>
          <ChevronRight size={18} className="text-primary" />
        </button>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Accepted"
          value={stats.total}
          icon={Package}
          color="bg-[#252C32]"
        />
        <StatCard
          label="In Transit"
          value={stats.active}
          icon={Truck}
          color="bg-purple-500"
        />
        <StatCard
          label="Delivered"
          value={stats.delivered}
          icon={CheckCircle}
          color="bg-green-500"
        />
        <StatCard
          label="Awaiting Pickup"
          value={stats.accepted}
          icon={Clock}
          color="bg-blue-500"
        />
      </div>

      {/* Recent Orders */}
      <div className="bg-white rounded-2xl border border-[#E5E9EB] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#F5F5F5]">
          <div className="flex items-center gap-2">
            <TrendingUp size={16} className="text-primary" />
            <p className="text-sm font-semibold text-[#252C32]">
              Recent Orders
            </p>
          </div>
          <button
            onClick={() => router.push("/logistics/history")}
            className="text-xs text-primary font-medium hover:underline"
          >
            View all
          </button>
        </div>

        {recentOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#F5F5F5] flex items-center justify-center mb-3">
              <Truck size={24} className="text-[#B0B7C3]" />
            </div>
            <p className="text-sm font-medium text-[#252C32]">No orders yet</p>
            <p className="text-xs text-[#838383] mt-1 mb-4">
              Accept your first order to get started
            </p>
            <button
              onClick={() => router.push("/logistics/orders-placement")}
              className="px-4 py-2 bg-primary text-white text-xs font-medium rounded-xl hover:bg-primary-dark transition"
            >
              Browse Available Orders
            </button>
          </div>
        ) : (
          <div className="divide-y divide-[#F5F5F5]">
            {recentOrders.map((order) => (
              <div
                key={order._id}
                onClick={() =>
                  router.push(`/logistics/history/${order.orderId}`)
                }
                className="flex items-center justify-between px-5 py-4 hover:bg-[#FAFAFA] cursor-pointer transition"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs font-semibold text-[#252C32]">
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
                  <p className="text-xs text-[#5B6871] mt-0.5">
                    {order.manufacturer.companyName}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
