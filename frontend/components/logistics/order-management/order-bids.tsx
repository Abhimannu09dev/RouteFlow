"use client";

import { useEffect, useState, useMemo } from "react";
import { toast } from "react-toastify";
import { priceOfferAPI } from "@/lib/api";
import {
  Gavel,
  MapPin,
  Clock,
  CheckCircle,
  XCircle,
  Search,
  RefreshCw,
  Trophy,
  Building2,
} from "lucide-react";

//  Types

type OrderInOffer = {
  _id: string;
  orderId: string;
  productDetails: string;
  status: string;
  routeFrom: string;
  routeTo: string;
  expectedPrice?: number | null;
  createdAt: string;
  manufacturer: { companyName: string; email: string };
};

type MyOffer = {
  _id: string;
  order: OrderInOffer;
  proposedPrice: number;
  estimatedDeliveryDays: number;
  note: string;
  status: string;
  createdAt: string;
};

//  Offer Status Badge

function OfferStatusBadge({ status }: { status: string }) {
  const config: Record<
    string,
    { label: string; color: string; bg: string; icon: React.ElementType }
  > = {
    pending: {
      label: "Pending",
      color: "text-amber-600",
      bg: "bg-amber-50 border-amber-200",
      icon: Clock,
    },
    accepted: {
      label: "Accepted",
      color: "text-green-600",
      bg: "bg-green-50 border-green-200",
      icon: CheckCircle,
    },
    rejected: {
      label: "Not Selected",
      color: "text-red-500",
      bg: "bg-red-50 border-red-200",
      icon: XCircle,
    },
    withdrawn: {
      label: "Withdrawn",
      color: "text-[#838383]",
      bg: "bg-[#F5F5F5] border-[#E5E9EB]",
      icon: XCircle,
    },
  };
  const cfg = config[status] || config.pending;
  const Icon = cfg.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${cfg.bg} ${cfg.color}`}
    >
      <Icon size={10} />
      {cfg.label}
    </span>
  );
}

//  Bid Row

function BidRow({ offer }: { offer: MyOffer }) {
  const order = offer.order;
  const isAccepted = offer.status === "accepted";

  const priceDiff =
    order.expectedPrice != null
      ? offer.proposedPrice - order.expectedPrice
      : null;

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString("en-NP", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  return (
    <div
      className={`p-5 border-b border-[#F5F5F5] last:border-0 transition ${
        isAccepted ? "bg-green-50/50" : "hover:bg-[#FAFAFA]"
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        {/* Order info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="font-mono text-xs font-bold text-[#252C32]">
              #{order.orderId.replace("ORD-", "")}
            </span>
            <OfferStatusBadge status={offer.status} />
            {isAccepted && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-500 text-white text-[10px] font-bold rounded-full">
                <Trophy size={9} />
                Won
              </span>
            )}
          </div>
          <p className="text-sm font-medium text-[#252C32] truncate">
            {order.productDetails}
          </p>
          <div className="flex items-center gap-3 mt-0.5 text-xs text-[#838383] flex-wrap">
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

        {/* Price comparison */}
        <div className="flex items-center gap-6 shrink-0">
          <div className="text-right">
            <p className="text-[10px] text-[#838383]">Expected</p>
            <p className="text-sm font-semibold text-[#252C32]">
              {order.expectedPrice
                ? `NPR ${order.expectedPrice.toLocaleString()}`
                : "Open"}
            </p>
          </div>

          <div className="text-right">
            <p className="text-[10px] text-[#838383]">Your Bid</p>
            <p className="text-sm font-bold text-primary">
              NPR {offer.proposedPrice.toLocaleString()}
            </p>
            {priceDiff !== null && (
              <p
                className={`text-[10px] font-medium ${
                  priceDiff > 0 ? "text-amber-500" : "text-green-500"
                }`}
              >
                {priceDiff > 0
                  ? `+NPR ${priceDiff.toLocaleString()}`
                  : `-NPR ${Math.abs(priceDiff).toLocaleString()}`}
              </p>
            )}
          </div>

          <div className="text-right hidden sm:block">
            <p className="text-[10px] text-[#838383]">Delivery</p>
            <p className="text-sm font-semibold text-[#252C32]">
              {offer.estimatedDeliveryDays}d
            </p>
          </div>

          <div className="text-right hidden sm:block">
            <p className="text-[10px] text-[#838383]">Bid Date</p>
            <p className="text-xs text-[#252C32]">
              {formatDate(offer.createdAt)}
            </p>
          </div>
        </div>
      </div>

      {offer.note && (
        <p className="text-xs text-[#838383] bg-white border border-[#E5E9EB] rounded-xl px-3 py-2 mt-3 leading-relaxed">
          📝 {offer.note}
        </p>
      )}
    </div>
  );
}

//  Main Component

export default function LogisticsBids() {
  const [offers, setOffers] = useState<MyOffer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<
    "all" | "pending" | "accepted" | "rejected" | "withdrawn"
  >("all");

  async function fetchData(silent = false) {
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);

    try {
      const res = await priceOfferAPI.getMyOffers();
      const sorted = (res.offers || []).sort((a: MyOffer, b: MyOffer) => {
        const order = ["accepted", "pending", "rejected", "withdrawn"];
        return order.indexOf(a.status) - order.indexOf(b.status);
      });
      setOffers(sorted);
    } catch {
      if (silent) toast.error("Failed to refresh");
      setOffers([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  const stats = useMemo(
    () => ({
      total: offers.length,
      pending: offers.filter((o) => o.status === "pending").length,
      accepted: offers.filter((o) => o.status === "accepted").length,
      rejected: offers.filter((o) => o.status === "rejected").length,
    }),
    [offers],
  );

  const filteredOffers = useMemo(() => {
    return offers.filter((offer) => {
      const matchesFilter =
        activeFilter === "all" || offer.status === activeFilter;
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        offer.order.orderId.toLowerCase().includes(q) ||
        offer.order.productDetails.toLowerCase().includes(q) ||
        offer.order.routeFrom?.toLowerCase().includes(q) ||
        offer.order.routeTo?.toLowerCase().includes(q) ||
        offer.order.manufacturer.companyName.toLowerCase().includes(q);
      return matchesFilter && matchesSearch;
    });
  }, [offers, activeFilter, searchQuery]);

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

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#252C32]">My Bids</h1>
          <p className="text-sm text-[#838383] mt-0.5">
            All price offers you have submitted
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
            label: "Total Bids",
            value: stats.total,
            color: "bg-[#252C32]",
            icon: Gavel,
          },
          {
            label: "Pending",
            value: stats.pending,
            color: "bg-amber-400",
            icon: Clock,
          },
          {
            label: "Won",
            value: stats.accepted,
            color: "bg-green-500",
            icon: CheckCircle,
          },
          {
            label: "Not Selected",
            value: stats.rejected,
            color: "bg-[#838383]",
            icon: XCircle,
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
        {/* Search */}
        <div className="p-4 border-b border-[#F5F5F5]">
          <div className="relative max-w-sm">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#B0B7C3]"
            />
            <input
              type="text"
              placeholder="Search by order, product, city, or company..."
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
              label: "Pending",
              value: "pending" as const,
              count: stats.pending,
            },
            { label: "Won", value: "accepted" as const, count: stats.accepted },
            {
              label: "Not Selected",
              value: "rejected" as const,
              count: stats.rejected,
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

        {/* Rows */}
        {filteredOffers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#F5F5F5] flex items-center justify-center mb-3">
              <Gavel size={24} className="text-[#B0B7C3]" />
            </div>
            <p className="text-sm font-medium text-[#252C32]">No bids found</p>
            <p className="text-xs text-[#838383] mt-1">
              {searchQuery || activeFilter !== "all"
                ? "Try adjusting your search or filter"
                : "Go to Available Orders to place your first bid"}
            </p>
          </div>
        ) : (
          filteredOffers.map((offer) => (
            <BidRow key={offer._id} offer={offer} />
          ))
        )}

        {filteredOffers.length > 0 && (
          <div className="px-5 py-3 border-t border-[#F5F5F5]">
            <p className="text-xs text-[#838383]">
              Showing{" "}
              <span className="font-medium text-[#252C32]">
                {filteredOffers.length}
              </span>{" "}
              of{" "}
              <span className="font-medium text-[#252C32]">
                {offers.length}
              </span>{" "}
              bids
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
