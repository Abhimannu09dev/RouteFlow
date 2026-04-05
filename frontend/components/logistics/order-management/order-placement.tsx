"use client";

import { useEffect, useState, useMemo } from "react";
import { toast } from "react-toastify";
import { orderAPI, priceOfferAPI, type PaginationMeta } from "@/lib/api";
import { Package, RefreshCw, Search } from "lucide-react";
import Pagination from "@/components/shared/pagination";
import OrderCard, { type Order, type MyOffer } from "./order-card";
import SubmitOfferModal from "./submit-offer";

type OfferMap = Record<string, MyOffer>;

const ITEMS_PER_PAGE = 9; // 3-column grid looks best with 9

export default function OrdersPlacement() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    total: 0,
    page: 1,
    limit: ITEMS_PER_PAGE,
    totalPages: 1,
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [offerMap, setOfferMap] = useState<OfferMap>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeModal, setActiveModal] = useState<{
    orderId: string;
    orderDetails: string;
    expectedPrice?: number | null;
    existingOffer: MyOffer | null;
  } | null>(null);

  async function fetchOrders(page = currentPage, silent = false) {
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);

    try {
      const data = await orderAPI.getOrders({ page, limit: ITEMS_PER_PAGE });
      const fetched: Order[] = Array.isArray(data.orders) ? data.orders : [];
      setOrders(fetched);
      if (data.pagination) setPagination(data.pagination);

      // Fetch my offer for each order on this page
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
    } catch {
      if (silent) toast.error("Failed to refresh orders");
      setOrders([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }

  useEffect(() => {
    fetchOrders(currentPage);
  }, [currentPage]);

  // Reset to page 1 on search
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

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
              className="h-80 bg-[#F5F5F5] rounded-2xl animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
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
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-[#252C32]">
              Available Orders
            </h1>
            <p className="text-sm text-[#838383] mt-0.5">
              Submit a bid — the manufacturer chooses the winning logistics
              partner
            </p>
          </div>
          <button
            onClick={() => fetchOrders(currentPage, true)}
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
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-[#F5F5F5] text-sm placeholder:text-[#B0B7C3] outline-none focus:ring-2 focus:ring-primary/30 transition"
            />
          </div>
          <span className="text-xs text-[#838383] shrink-0">
            <span className="font-semibold text-[#252C32]">
              {pagination.total}
            </span>{" "}
            order{pagination.total !== 1 ? "s" : ""} available
          </span>
        </div>

        {/* Empty state */}
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
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredOrders.map((order) => (
                <OrderCard
                  key={order._id}
                  order={order}
                  myOffer={offerMap[order.orderId] || null}
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

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="bg-white rounded-2xl border border-[#E5E9EB] px-4">
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
          </>
        )}
      </div>
    </>
  );
}
