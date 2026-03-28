"use client";

import { formatDistanceToNow } from "date-fns";
import { Loader2, MessageSquare } from "lucide-react";
import type { Conversation } from "@/lib/api";

interface ConversationListProps {
  conversations: Conversation[];
  selectedOrderId: string | null;
  onSelect: (orderId: string) => void;
  loading: boolean;
}

function previewText(c: Conversation): string {
  const last = c.lastMessage;
  if (!last) return "No messages yet";
  if (last.fileType === "image") return `${last.senderName}: Photo`;
  if (last.fileType === "document" || last.fileName)
    return `${last.senderName}: 📎 ${last.fileName || "File"}`;
  return `${last.senderName}: ${last.content || ""}`;
}

export default function ConversationList({
  conversations,
  selectedOrderId,
  onSelect,
  loading,
}: ConversationListProps) {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-2 text-[#9AA6AC]">
        <Loader2 size={22} className="animate-spin" />
        <p className="text-xs">Loading conversations…</p>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center gap-3">
        <div className="w-12 h-12 rounded-full bg-[#F5F7F8] flex items-center justify-center">
          <MessageSquare size={22} color="#9AA6AC" />
        </div>
        <div>
          <p className="text-sm font-medium text-[#252C32]">No chats yet</p>
          <p className="text-xs text-[#9AA6AC] mt-1">
            Conversations appear when you have orders that are accepted or in
            transit.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-[#EEF2F4]">
      {conversations.map((c) => {
        const selected = c.orderId === selectedOrderId;
        const lastAt = c.lastMessage?.sentAt
          ? formatDistanceToNow(new Date(c.lastMessage.sentAt), {
              addSuffix: true,
            })
          : "";

        return (
          <li key={c.orderId}>
            <button
              type="button"
              onClick={() => onSelect(c.orderId)}
              className={`w-full text-left px-4 py-3 transition hover:bg-[#F8FAFB] ${
                selected ? "bg-blue-50/80 hover:bg-blue-50/80" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <p
                  className={`text-sm font-semibold truncate ${
                    selected ? "text-blue-700" : "text-[#252C32]"
                  }`}
                >
                  {c.otherParty?.companyName || "Unknown"}
                </p>
                <div className="flex items-center gap-1.5 shrink-0">
                  {c.unreadCount > 0 && !selected && (
                    <span className="min-w-[18px] h-[18px] px-1 bg-blue-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                      {c.unreadCount > 99 ? "99+" : c.unreadCount}
                    </span>
                  )}
                  {lastAt ? (
                    <span className="text-[10px] text-[#9AA6AC] whitespace-nowrap">
                      {lastAt}
                    </span>
                  ) : null}
                </div>
              </div>
              <p className="text-[11px] text-[#9AA6AC] truncate mb-0.5">
                {c.orderTitle}
              </p>
              <p className="text-xs text-[#5B6871] line-clamp-2 leading-snug">
                {previewText(c)}
              </p>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
