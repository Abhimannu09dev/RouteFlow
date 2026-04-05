"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "react-toastify";
import {
  RefreshCw,
  LifeBuoy,
  ChevronDown,
  ChevronUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Send,
  Building2,
} from "lucide-react";
import { format } from "date-fns";
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

// ── Types ─────────────────────────────────────────────────────────────────────

type Ticket = {
  _id: string;
  subject: string;
  message: string;
  category: "general" | "technical" | "billing";
  status: "open" | "in-progress" | "resolved";
  adminReply: string | null;
  repliedAt: string | null;
  createdAt: string;
  userId: { _id: string; companyName: string; email: string; role: string };
};

// ── Config ────────────────────────────────────────────────────────────────────

const STATUS_TABS = [
  { value: "", label: "All" },
  { value: "open", label: "Open" },
  { value: "in-progress", label: "In Progress" },
  { value: "resolved", label: "Resolved" },
];

const CATEGORY_TABS = [
  { value: "", label: "All Categories" },
  { value: "general", label: "General" },
  { value: "technical", label: "Technical" },
  { value: "billing", label: "Billing" },
];

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; icon: React.ElementType }
> = {
  open: {
    label: "Open",
    color: "bg-blue-50 text-blue-600 border-blue-100",
    icon: AlertCircle,
  },
  "in-progress": {
    label: "In Progress",
    color: "bg-amber-50 text-amber-600 border-amber-100",
    icon: Clock,
  },
  resolved: {
    label: "Resolved",
    color: "bg-green-50 text-green-600 border-green-100",
    icon: CheckCircle2,
  },
};

// ── StatusBadge ───────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.open;
  const Icon = cfg.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border ${cfg.color}`}
    >
      <Icon size={11} />
      {cfg.label}
    </span>
  );
}

// ── TicketRow ─────────────────────────────────────────────────────────────────

function TicketRow({
  ticket,
  onUpdated,
}: {
  ticket: Ticket;
  onUpdated: (updated: Ticket) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [reply, setReply] = useState(ticket.adminReply || "");
  const [status, setStatus] = useState(ticket.status);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const data = await apiFetch(`/admin/support-tickets/${ticket._id}`, {
        method: "PUT",
        body: JSON.stringify({ status, adminReply: reply.trim() || undefined }),
      });
      onUpdated(data.ticket);
      toast.success("Ticket updated");
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update ticket",
      );
    } finally {
      setSaving(false);
    }
  }

  const isDirty =
    status !== ticket.status ||
    reply.trim() !== (ticket.adminReply || "").trim();

  return (
    <div
      className={`border-b border-[#F5F5F5] last:border-0 transition ${expanded ? "bg-[#FAFAFA]" : "bg-white hover:bg-[#F9FAFB]"}`}
    >
      <button
        onClick={() => setExpanded((p) => !p)}
        className="w-full text-left px-5 py-4 flex items-center gap-4"
      >
        <div className="w-9 h-9 rounded-xl bg-[#F5F5F5] flex items-center justify-center shrink-0">
          <Building2 size={16} className="text-[#838383]" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-[#252C32] truncate">
              {ticket.subject}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-[#F5F5F5] text-[#838383] border border-[#E5E9EB] capitalize">
              {ticket.category}
            </span>
          </div>
          <p className="text-xs text-[#838383] mt-0.5">
            <span className="font-medium text-[#5B6871]">
              {ticket.userId?.companyName}
            </span>
            {" · "}
            <span className="capitalize">{ticket.userId?.role}</span>
            {" · "}
            {format(new Date(ticket.createdAt), "dd MMM yyyy, hh:mm a")}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <StatusBadge status={ticket.status} />
          {expanded ? (
            <ChevronUp size={15} className="text-[#838383]" />
          ) : (
            <ChevronDown size={15} className="text-[#838383]" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="px-5 pb-5 flex flex-col gap-4 border-t border-[#F5F5F5]">
          <div className="mt-4">
            <p className="text-xs font-semibold text-[#838383] uppercase tracking-wider mb-2">
              User Message
            </p>
            <p className="text-sm text-[#252C32] bg-white border border-[#E5E9EB] rounded-xl px-4 py-3 leading-relaxed whitespace-pre-wrap">
              {ticket.message}
            </p>
            <p className="text-xs text-[#838383] mt-1.5">
              From: {ticket.userId?.email}
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <p className="text-xs font-semibold text-[#838383] uppercase tracking-wider">
              Admin Response
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-[#838383]">Status:</span>
              {(["open", "in-progress", "resolved"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatus(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition border ${
                    status === s
                      ? STATUS_CONFIG[s].color
                      : "border-[#E5E9EB] text-[#838383] hover:bg-[#F5F5F5]"
                  }`}
                >
                  {STATUS_CONFIG[s].label}
                </button>
              ))}
            </div>
            <textarea
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder="Write a reply to the user..."
              rows={4}
              className="w-full px-4 py-3 rounded-xl border border-[#E5E9EB] text-sm text-[#252C32] placeholder-[#B0B7C3] focus:outline-none focus:ring-2 focus:ring-teal-100 focus:border-teal-400 transition resize-none bg-white"
            />
            {ticket.repliedAt && (
              <p className="text-xs text-[#838383]">
                Last replied{" "}
                {format(new Date(ticket.repliedAt), "dd MMM yyyy, hh:mm a")}
              </p>
            )}
            <button
              onClick={handleSave}
              disabled={saving || !isDirty}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#252C32] hover:bg-[#1a1f24] text-white text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed transition w-fit"
            >
              {saving ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Send size={14} />
              )}
              {saving ? "Saving..." : "Save & Reply"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function AdminSupportTickets() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    total: 0,
    page: 1,
    limit: ITEMS_PER_PAGE,
    totalPages: 1,
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  const fetchTickets = useCallback(
    async (page = currentPage, silent = false) => {
      if (!silent) setIsLoading(true);
      else setIsRefreshing(true);

      try {
        const params = new URLSearchParams();
        if (statusFilter) params.set("status", statusFilter);
        if (categoryFilter) params.set("category", categoryFilter);
        params.set("page", String(page));
        params.set("limit", String(ITEMS_PER_PAGE));

        const data = await apiFetch(
          `/admin/support-tickets?${params.toString()}`,
        );
        setTickets(Array.isArray(data.tickets) ? data.tickets : []);
        if (data.pagination) setPagination(data.pagination);
      } catch {
        if (silent) toast.error("Failed to refresh");
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [statusFilter, categoryFilter, currentPage],
  );

  useEffect(() => {
    fetchTickets(currentPage);
  }, [currentPage]);
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, categoryFilter]);

  function handleUpdated(updated: Ticket) {
    setTickets((prev) =>
      prev.map((t) => (t._id === updated._id ? updated : t)),
    );
  }

  const openCount = tickets.filter((t) => t.status === "open").length;

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="h-8 w-56 bg-white rounded-lg animate-pulse" />
        <div className="bg-white rounded-2xl border border-[#E5E9EB]">
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

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#252C32]">
            Support Tickets
          </h1>
          <p className="text-sm text-[#838383] mt-0.5">
            Manage and respond to user support requests
            {openCount > 0 && (
              <span className="ml-2 text-amber-600 font-medium">
                · {openCount} open
              </span>
            )}
          </p>
        </div>
        <button
          onClick={() => fetchTickets(currentPage, true)}
          disabled={isRefreshing}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#E5E9EB] bg-white text-sm text-[#5B6871] hover:bg-[#F5F5F5] transition disabled:opacity-50"
        >
          <RefreshCw size={14} className={isRefreshing ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-[#E5E9EB] overflow-hidden">
        <div className="flex gap-1 px-4 py-2 border-b border-[#F5F5F5] overflow-x-auto">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition ${
                statusFilter === tab.value
                  ? "bg-[#252C32] text-white"
                  : "text-[#5B6871] hover:bg-[#F5F5F5]"
              }`}
            >
              {tab.label}
            </button>
          ))}
          <div className="border-l border-[#E5E9EB] mx-1" />
          {CATEGORY_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setCategoryFilter(tab.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition ${
                categoryFilter === tab.value
                  ? "bg-teal-500 text-white"
                  : "text-[#5B6871] hover:bg-[#F5F5F5]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {tickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#F5F5F5] flex items-center justify-center mb-3">
              <LifeBuoy size={24} className="text-[#B0B7C3]" />
            </div>
            <p className="text-sm font-medium text-[#252C32]">
              No tickets found
            </p>
            <p className="text-xs text-[#838383] mt-1">
              Try adjusting your filters
            </p>
          </div>
        ) : (
          tickets.map((ticket) => (
            <TicketRow
              key={ticket._id}
              ticket={ticket}
              onUpdated={handleUpdated}
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
              itemLabel="tickets"
              onPageChange={(page) => setCurrentPage(page)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
