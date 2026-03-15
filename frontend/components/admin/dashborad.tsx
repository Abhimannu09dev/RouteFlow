"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  Truck,
  Package,
  CheckCircle,
  Clock,
  ShieldAlert,
  TrendingUp,
  Building2,
} from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

async function apiFetch(path: string) {
  const res = await fetch(`${API_BASE}${path}`, { credentials: "include" });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Request failed");
  return data;
}

type Stats = {
  totalUsers: number;
  pendingVerification: number;
  verifiedUsers: number;
  manufacturers: number;
  logistics: number;
  totalOrders: number;
  pendingOrders: number;
  deliveredOrders: number;
};

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  onClick,
  urgent,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
  onClick?: () => void;
  urgent?: boolean;
}) {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-2xl border p-5 flex items-center gap-4 transition ${
        onClick ? "cursor-pointer hover:shadow-md hover:border-primary/30" : ""
      } ${urgent && value > 0 ? "border-amber-200 bg-amber-50/50" : "border-[#E5E9EB]"}`}
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
      {urgent && value > 0 && (
        <span className="ml-auto text-xs font-semibold text-amber-600 bg-amber-100 px-2 py-1 rounded-full">
          Action needed
        </span>
      )}
    </div>
  );
}

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    apiFetch("/admin/stats")
      .then((d) => setStats(d.stats))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-5">
        <div className="h-8 w-48 bg-white rounded-lg animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-24 bg-white rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-[#252C32]">
          Admin Dashboard
        </h1>
        <p className="text-sm text-[#838383] mt-0.5">
          Platform overview and pending actions
        </p>
      </div>

      {/* Urgent banner */}
      {stats && stats.pendingVerification > 0 && (
        <button
          onClick={() => router.push("/admin/users?status=pending")}
          className="w-full flex items-center justify-between px-5 py-4 bg-amber-50 border-2 border-amber-200 rounded-2xl hover:bg-amber-100 transition"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-400 flex items-center justify-center">
              <ShieldAlert size={18} className="text-white" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-amber-700">
                {stats.pendingVerification} company verification
                {stats.pendingVerification > 1 ? "s" : ""} pending
              </p>
              <p className="text-xs text-amber-600">
                Click to review and approve or reject
              </p>
            </div>
          </div>
          <span className="text-xs font-medium text-amber-600">Review →</span>
        </button>
      )}

      {/* Users stats */}
      <div>
        <p className="text-xs font-semibold text-[#838383] uppercase tracking-wider mb-3 flex items-center gap-2">
          <Users size={13} /> Users
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Companies"
            value={stats?.totalUsers || 0}
            icon={Building2}
            color="bg-[#252C32]"
            onClick={() => router.push("/admin/users")}
          />
          <StatCard
            label="Pending Approval"
            value={stats?.pendingVerification || 0}
            icon={ShieldAlert}
            color="bg-amber-400"
            onClick={() => router.push("/admin/users?status=pending")}
            urgent
          />
          <StatCard
            label="Verified"
            value={stats?.verifiedUsers || 0}
            icon={CheckCircle}
            color="bg-green-500"
            onClick={() => router.push("/admin/users?status=verified")}
          />
          <StatCard
            label="Manufacturers"
            value={stats?.manufacturers || 0}
            icon={Building2}
            color="bg-blue-500"
            onClick={() => router.push("/admin/users?role=manufacturer")}
          />
        </div>
      </div>

      {/* Orders stats */}
      <div>
        <p className="text-xs font-semibold text-[#838383] uppercase tracking-wider mb-3 flex items-center gap-2">
          <Package size={13} /> Orders
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Orders"
            value={stats?.totalOrders || 0}
            icon={Package}
            color="bg-[#252C32]"
          />
          <StatCard
            label="Pending"
            value={stats?.pendingOrders || 0}
            icon={Clock}
            color="bg-amber-400"
          />
          <StatCard
            label="Delivered"
            value={stats?.deliveredOrders || 0}
            icon={TrendingUp}
            color="bg-green-500"
          />
          <StatCard
            label="Logistics Cos."
            value={stats?.logistics || 0}
            icon={Truck}
            color="bg-purple-500"
            onClick={() => router.push("/admin/users?role=logistics")}
          />
        </div>
      </div>
    </div>
  );
}
