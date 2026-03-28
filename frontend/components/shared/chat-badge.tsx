"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { MessageSquare } from "lucide-react";
import { io } from "socket.io-client";
import { chatAPI } from "@/lib/api";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

interface ChatBadgeProps {
  role: "manufacturer" | "logistics";
}

export default function ChatBadge({ role }: ChatBadgeProps) {
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnread = useCallback(async () => {
    try {
      const data = await chatAPI.getUnreadCount();
      setUnreadCount(data.count);
    } catch {
      // silently fail — badge just stays at 0
    }
  }, []);

  useEffect(() => {
    fetchUnread();

    // Connect socket to listen for incoming messages so badge updates live
    const s = io(BACKEND_URL, { withCredentials: true });

    s.on("message_received", () => {
      // Bump unread count on any new incoming message
      setUnreadCount((prev) => prev + 1);
    });

    s.on("messages_read", () => {
      // Re-fetch accurate count after reads
      fetchUnread();
    });

    return () => {
      s.disconnect();
    };
  }, [fetchUnread]);

  const handleClick = () => {
    router.push(`/${role}/chats`);
  };

  return (
    <button
      onClick={handleClick}
      className="relative p-1.5 rounded-lg hover:bg-[#F5F5F5] transition"
      title="Messages"
    >
      <MessageSquare size={18} color="#5B6871" />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-0.5 bg-blue-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </button>
  );
}
