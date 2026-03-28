"use client";
import { useEffect, useState, useCallback } from "react";
import { ArrowLeft, MessageSquare } from "lucide-react";
import { io } from "socket.io-client";
import { chatAPI, type Conversation } from "@/lib/api";
import ConversationList from "./conversation-list";
import ChatWindow from "./chat-window";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

interface ChatPageProps {
  role: "manufacturer" | "logistics";
}

export default function ChatPage({ role }: ChatPageProps) {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileView, setMobileView] = useState<"list" | "chat">("list");

  useEffect(() => {
    fetch(`${API_BASE_URL}/auth/me`, { credentials: "include" })
      .then((r) => r.json())
      .then((u) => {
        if (u?.id) setCurrentUserId(u.id);
      })
      .catch(() => {});
  }, []);

  const fetchConversations = useCallback(async () => {
    try {
      const data = await chatAPI.getConversations();
      setConversations(data.conversations);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Keep sidebar previews / unread counts in sync when messages arrive in any thread
  useEffect(() => {
    const s = io(API_BASE_URL, { withCredentials: true });
    const refresh = () => {
      chatAPI.getConversations().then((data) => {
        setConversations(data.conversations);
      });
    };
    s.on("message_received", refresh);
    s.on("messages_read", refresh);
    return () => {
      s.disconnect();
    };
  }, []);

  function handleSelect(orderId: string) {
    setSelectedId(orderId);
    setConversations((prev) =>
      prev.map((c) => (c.orderId === orderId ? { ...c, unreadCount: 0 } : c)),
    );
    setMobileView("chat");
  }

  const selectedConv =
    conversations.find((c) => c.orderId === selectedId) ?? null;

  return (
    /*
      -m-2 md:-m-4 lg:-m-5 cancels the layout's p-2 md:p-4 lg:p-5 padding.
      h-full now resolves correctly because the layout uses flex-1 + min-h-0.
    */
    <div className="flex overflow-hidden bg-[#F8FAFB] -m-2 md:-m-4 lg:-m-5 h-full">
      {/* ── Left panel ─────────────────────────────────────────────────────── */}
      <aside
        className={`
          w-full md:w-80 lg:w-96 bg-white border-r border-[#E5E9EB] flex flex-col shrink-0
          ${mobileView === "chat" ? "hidden md:flex" : "flex"}
        `}
      >
        <div className="px-4 py-4 border-b border-[#E5E9EB]">
          <h2 className="text-base font-semibold text-[#252C32]">Messages</h2>
          <p className="text-xs text-[#9AA6AC] mt-0.5">
            Chats linked to your active orders
          </p>
        </div>
        <div className="flex-1 overflow-y-auto">
          <ConversationList
            conversations={conversations}
            selectedOrderId={selectedId}
            onSelect={handleSelect}
            loading={loading}
          />
        </div>
      </aside>

      {/* ── Right panel ────────────────────────────────────────────────────── */}
      <main
        className={`
          flex-1 flex flex-col overflow-hidden
          ${mobileView === "list" ? "hidden md:flex" : "flex"}
        `}
      >
        <div className="md:hidden px-4 py-2 border-b border-[#E5E9EB] bg-white">
          <button
            onClick={() => setMobileView("list")}
            className="flex items-center gap-1.5 text-sm text-[#5B6871] hover:text-[#252C32] transition"
          >
            <ArrowLeft size={16} />
            Back to messages
          </button>
        </div>

        {selectedConv && currentUserId ? (
          <ChatWindow
            key={selectedConv.orderId}
            conversation={selectedConv}
            currentUserId={currentUserId}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-8">
            <div className="w-16 h-16 rounded-full bg-[#F5F7F8] flex items-center justify-center">
              <MessageSquare size={28} color="#9AA6AC" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#252C32]">
                Select a conversation
              </p>
              <p className="text-xs text-[#9AA6AC] mt-1 max-w-xs">
                Choose a chat from the left panel to start messaging. Chats are
                available for orders with status{" "}
                <span className="font-medium">Accepted</span> or{" "}
                <span className="font-medium">In Transit</span>.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
