"use client";
import { useEffect, useState } from "react";
import {
  LifeBuoy,
  Send,
  ChevronDown,
  ChevronUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  MessageSquareText,
} from "lucide-react";
import { toast } from "react-toastify";
import { format } from "date-fns";
import { supportAPI, type SupportTicket } from "@/lib/api";

const CATEGORIES = [
  { value: "general", label: "General Inquiry" },
  { value: "technical", label: "Technical Issue" },
  { value: "billing", label: "Billing & Payments" },
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

function CategoryBadge({ category }: { category: string }) {
  const label = CATEGORIES.find((c) => c.value === category)?.label ?? category;
  return (
    <span className="inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full bg-[#F5F7F8] text-[#5B6871] border border-[#E5E9EB]">
      {label}
    </span>
  );
}

function SubmitTicketForm({
  onSubmitted,
}: {
  onSubmitted: (ticket: SupportTicket) => void;
}) {
  const [form, setForm] = useState({
    subject: "",
    message: "",
    category: "general",
  });
  const [loading, setLoading] = useState(false);

  function handleChange(
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.subject.trim() || !form.message.trim()) {
      toast.error("Please fill in all fields");
      return;
    }
    setLoading(true);
    try {
      const data = await supportAPI.createTicket(
        form.subject,
        form.message,
        form.category,
      );
      toast.success("Support ticket submitted! We'll get back to you soon.");
      onSubmitted(data.ticket);
      setForm({ subject: "", message: "", category: "general" });
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to submit ticket",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white border border-[#E5E9EB] rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 border-b border-[#E5E9EB] flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center shrink-0">
          <LifeBuoy size={18} className="text-teal-500" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-[#252C32]">
            Submit a Support Ticket
          </h2>
          <p className="text-xs text-[#9AA6AC] mt-0.5">
            Our admin team will respond as soon as possible
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-4">
        {/* Category */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-[#5B6871]">Category</label>
          <select
            name="category"
            value={form.category}
            onChange={handleChange}
            className="h-10 px-3 rounded-xl border border-[#E5E9EB] text-sm text-[#252C32] bg-white focus:outline-none focus:ring-2 focus:ring-teal-100 focus:border-teal-400 transition"
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        {/* Subject */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-[#5B6871]">Subject</label>
          <input
            type="text"
            name="subject"
            value={form.subject}
            onChange={handleChange}
            placeholder="Brief description of your issue"
            maxLength={120}
            className="h-10 px-3 rounded-xl border border-[#E5E9EB] text-sm text-[#252C32] placeholder-[#9AA6AC] focus:outline-none focus:ring-2 focus:ring-teal-100 focus:border-teal-400 transition"
          />
        </div>

        {/* Message */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-[#5B6871]">Message</label>
          <textarea
            name="message"
            value={form.message}
            onChange={handleChange}
            placeholder="Describe your issue in detail..."
            rows={5}
            maxLength={2000}
            className="px-3 py-2.5 rounded-xl border border-[#E5E9EB] text-sm text-[#252C32] placeholder-[#9AA6AC] focus:outline-none focus:ring-2 focus:ring-teal-100 focus:border-teal-400 transition resize-none"
          />
          <span className="text-[10px] text-[#9AA6AC] self-end">
            {form.message.length}/2000
          </span>
        </div>

        <button
          type="submit"
          disabled={loading || !form.subject.trim() || !form.message.trim()}
          className="h-10 px-6 rounded-xl bg-teal-500 hover:bg-teal-600 text-white text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-2 w-fit"
        >
          {loading ? (
            <Loader2 size={15} className="animate-spin" />
          ) : (
            <Send size={15} />
          )}
          Submit Ticket
        </button>
      </form>
    </div>
  );
}

function TicketRow({ ticket }: { ticket: SupportTicket }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-[#E5E9EB] rounded-xl overflow-hidden">
      {/* Summary row */}
      <button
        onClick={() => setExpanded((p) => !p)}
        className="w-full text-left px-4 py-3.5 flex items-center gap-3 hover:bg-[#F8FAFB] transition"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-[#252C32] truncate">
              {ticket.subject}
            </span>
            <CategoryBadge category={ticket.category} />
          </div>
          <p className="text-xs text-[#9AA6AC] mt-0.5">
            Submitted{" "}
            {format(new Date(ticket.createdAt), "dd MMM yyyy, hh:mm a")}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <StatusBadge status={ticket.status} />
          {expanded ? (
            <ChevronUp size={15} className="text-[#9AA6AC]" />
          ) : (
            <ChevronDown size={15} className="text-[#9AA6AC]" />
          )}
        </div>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-4 pb-4 flex flex-col gap-3 border-t border-[#F5F7F8]">
          {/* Original message */}
          <div className="mt-3">
            <p className="text-xs font-medium text-[#5B6871] mb-1.5">
              Your message
            </p>
            <p className="text-sm text-[#252C32] bg-[#F8FAFB] rounded-xl px-4 py-3 leading-relaxed whitespace-pre-wrap">
              {ticket.message}
            </p>
          </div>

          {/* Admin reply */}
          {ticket.adminReply ? (
            <div>
              <p className="text-xs font-medium text-[#5B6871] mb-1.5 flex items-center gap-1.5">
                <MessageSquareText size={12} />
                Admin reply
                {ticket.repliedAt && (
                  <span className="text-[#9AA6AC] font-normal">
                    ·{" "}
                    {format(new Date(ticket.repliedAt), "dd MMM yyyy, hh:mm a")}
                  </span>
                )}
              </p>
              <p className="text-sm text-[#252C32] bg-teal-50 border border-teal-100 rounded-xl px-4 py-3 leading-relaxed whitespace-pre-wrap">
                {ticket.adminReply}
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-[#9AA6AC] bg-[#F8FAFB] rounded-xl px-4 py-3">
              <Clock size={13} />
              Awaiting admin response...
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PastTickets({
  tickets,
  loading,
}: {
  tickets: SupportTicket[];
  loading: boolean;
}) {
  return (
    <div className="bg-white border border-[#E5E9EB] rounded-2xl overflow-hidden">
      <div className="px-6 py-5 border-b border-[#E5E9EB] flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-[#252C32]">Your Tickets</h2>
          <p className="text-xs text-[#9AA6AC] mt-0.5">
            Track the status of your support requests
          </p>
        </div>
        {tickets.length > 0 && (
          <span className="text-xs font-medium text-[#5B6871] bg-[#F5F7F8] border border-[#E5E9EB] px-2.5 py-1 rounded-full">
            {tickets.length} ticket{tickets.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      <div className="px-6 py-5">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-[#9AA6AC]">
            <Loader2 size={15} className="animate-spin" /> Loading tickets...
          </div>
        ) : tickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
            <div className="w-12 h-12 rounded-full bg-[#F5F7F8] flex items-center justify-center">
              <LifeBuoy size={22} className="text-[#9AA6AC]" />
            </div>
            <p className="text-sm font-medium text-[#5B6871]">No tickets yet</p>
            <p className="text-xs text-[#9AA6AC]">
              Submit a ticket above and we&apos;ll get back to you soon
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {tickets.map((t) => (
              <TicketRow key={t._id} ticket={t} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function HelpSupportPage({
  role,
}: {
  role: "manufacturer" | "logistics";
}) {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supportAPI
      .getMyTickets()
      .then((data) => setTickets(data.tickets))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function handleNewTicket(ticket: SupportTicket) {
    setTickets((prev) => [ticket, ...prev]);
  }

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-5 py-2">
      <div>
        <h1 className="text-lg font-semibold text-[#252C32]">
          Help &amp; Support
        </h1>
        <p className="text-sm text-[#9AA6AC] mt-0.5">
          Need help? Submit a ticket and our admin team will respond shortly.
        </p>
      </div>
      <SubmitTicketForm onSubmitted={handleNewTicket} />
      <PastTickets tickets={tickets} loading={loading} />
    </div>
  );
}
