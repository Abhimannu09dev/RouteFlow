"use client";

import { useEffect, useState, useMemo, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "react-toastify";
import { Search, RefreshCw, Building2 } from "lucide-react";
import { type User, FILTER_TABS, ROLE_TABS } from "./types";
import RejectModal from "./RejectModal";
import UserRow from "./UserRow";
import Pagination from "@/components/shared/pagination";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

type PaginationMeta = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

const ITEMS_PER_PAGE = 10;

async function apiFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...options.headers },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Request failed");
  return data;
}

function UserManagementContent() {
  const searchParams = useSearchParams();

  const [users, setUsers] = useState<User[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    total: 0,
    page: 1,
    limit: ITEMS_PER_PAGE,
    totalPages: 1,
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<User | null>(null);
  const [isRejecting, setIsRejecting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState(
    searchParams.get("status") || "",
  );
  const [roleFilter, setRoleFilter] = useState(searchParams.get("role") || "");

  const fetchUsers = useCallback(
    async (page = currentPage, silent = false) => {
      if (!silent) setIsLoading(true);
      else setIsRefreshing(true);

      try {
        const params = new URLSearchParams();
        if (statusFilter) params.set("status", statusFilter);
        if (roleFilter) params.set("role", roleFilter);
        if (searchQuery) params.set("search", searchQuery);
        params.set("page", String(page));
        params.set("limit", String(ITEMS_PER_PAGE));

        const data = await apiFetch(`/admin/users?${params.toString()}`);
        setUsers(Array.isArray(data.users) ? data.users : []);
        if (data.pagination) setPagination(data.pagination);
      } catch {
        if (silent) toast.error("Failed to refresh");
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [statusFilter, roleFilter, searchQuery, currentPage],
  );

  useEffect(() => {
    fetchUsers(currentPage);
  }, [currentPage]);
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, roleFilter, searchQuery]);

  async function handleApprove(userId: string) {
    setActionId(userId);
    try {
      await apiFetch(`/admin/users/${userId}/approve`, { method: "PUT" });
      toast.success("Account approved successfully!");
      setUsers((prev) =>
        prev.map((u) =>
          u._id === userId
            ? { ...u, isAccountVerified: true, rejectionReason: undefined }
            : u,
        ),
      );
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to approve");
    } finally {
      setActionId(null);
    }
  }

  async function handleRejectConfirm(reason: string) {
    if (!rejectTarget) return;
    setIsRejecting(true);
    try {
      await apiFetch(`/admin/users/${rejectTarget._id}/reject`, {
        method: "PUT",
        body: JSON.stringify({ reason }),
      });
      toast.success("Account rejected");
      setUsers((prev) =>
        prev.map((u) =>
          u._id === rejectTarget._id
            ? { ...u, isAccountVerified: false, rejectionReason: reason }
            : u,
        ),
      );
      setRejectTarget(null);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to reject");
    } finally {
      setIsRejecting(false);
    }
  }

  const pendingCount = useMemo(
    () =>
      users.filter(
        (u) => u.isVerified && !u.isAccountVerified && !u.rejectionReason,
      ).length,
    [users],
  );

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="h-8 w-56 bg-white rounded-lg animate-pulse" />
        <div className="bg-white rounded-2xl border border-[#E5E9EB]">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="h-16 border-b border-[#F5F5F5] animate-pulse bg-white"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      {rejectTarget && (
        <RejectModal
          user={rejectTarget}
          onClose={() => setRejectTarget(null)}
          onConfirm={handleRejectConfirm}
          isLoading={isRejecting}
        />
      )}

      <div className="flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-[#252C32]">
              User Management
            </h1>
            <p className="text-sm text-[#838383] mt-0.5">
              Review and verify company accounts
              {pendingCount > 0 && (
                <span className="ml-2 text-amber-600 font-medium">
                  · {pendingCount} pending review
                </span>
              )}
            </p>
          </div>
          <button
            onClick={() => fetchUsers(currentPage, true)}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#E5E9EB] bg-white text-sm text-[#5B6871] hover:bg-[#F5F5F5] transition disabled:opacity-50"
          >
            <RefreshCw
              size={14}
              className={isRefreshing ? "animate-spin" : ""}
            />
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
                placeholder="Search by company name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-[#F5F5F5] text-sm placeholder:text-[#B0B7C3] outline-none focus:ring-2 focus:ring-primary/30 transition"
              />
            </div>
          </div>

          <div className="flex gap-1 px-4 py-2 border-b border-[#F5F5F5] overflow-x-auto">
            {FILTER_TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setStatusFilter(tab.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition ${
                  statusFilter === tab.value
                    ? "bg-primary text-white"
                    : "text-[#5B6871] hover:bg-[#F5F5F5]"
                }`}
              >
                {tab.label}
              </button>
            ))}
            <div className="border-l border-[#E5E9EB] mx-1" />
            {ROLE_TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setRoleFilter(tab.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition ${
                  roleFilter === tab.value
                    ? "bg-[#252C32] text-white"
                    : "text-[#5B6871] hover:bg-[#F5F5F5]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-14 h-14 rounded-2xl bg-[#F5F5F5] flex items-center justify-center mb-3">
                <Building2 size={24} className="text-[#B0B7C3]" />
              </div>
              <p className="text-sm font-medium text-[#252C32]">
                No companies found
              </p>
              <p className="text-xs text-[#838383] mt-1">
                Try adjusting your filters
              </p>
            </div>
          ) : (
            users.map((user) => (
              <UserRow
                key={user._id}
                user={user}
                onApprove={handleApprove}
                onReject={setRejectTarget}
                actionId={actionId}
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
                itemLabel="companies"
                onPageChange={(page) => setCurrentPage(page)}
              />
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default function UserManagement() {
  return (
    <Suspense>
      <UserManagementContent />
    </Suspense>
  );
}
