"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck, Package, Gavel, Truck, X } from "lucide-react";
import { io, Socket } from "socket.io-client";
import { toast } from "react-toastify";

type Notification = {
  _id: string;
  type: string;
  title: string;
  message: string;
  orderId?: string;
  isRead: boolean;
  createdAt: string;
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

async function apiFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...options.headers },
  });
  return res.json();
}

//  Notification icon by type

function NotifIcon({ type }: { type: string }) {
  const config: Record<string, { icon: React.ElementType; color: string }> = {
    new_bid: { icon: Gavel, color: "text-amber-500  bg-amber-50" },
    bid_accepted: { icon: CheckCheck, color: "text-green-500  bg-green-50" },
    bid_rejected: { icon: X, color: "text-red-400    bg-red-50" },
    order_accepted: { icon: CheckCheck, color: "text-green-500  bg-green-50" },
    new_order: { icon: Package, color: "text-blue-500   bg-blue-50" },
    status_update: { icon: Truck, color: "text-purple-500 bg-purple-50" },
  };
  const cfg = config[type] || {
    icon: Bell,
    color: "text-[#838383] bg-[#F5F5F5]",
  };
  const Icon = cfg.icon;
  return (
    <div
      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${cfg.color.split(" ")[1]}`}
    >
      <Icon size={15} className={cfg.color.split(" ")[0]} />
    </div>
  );
}

//  Main Component

type Props = {
  role: "manufacturer" | "logistics" | "admin";
};

export default function NotificationPanel({ role }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  //  Fetch notifications from REST API

  const fetchNotifications = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await apiFetch("/notifications");
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch {
      // silent fail
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  //  Socket.io — listen for real-time notifications

  useEffect(() => {
    const socket = io(API_BASE, {
      withCredentials: true, // sends HTTP-Only cookie
    });

    socketRef.current = socket;

    socket.on("notification", (notif: Notification) => {
      // Prepend new notification and increment unread count
      setNotifications((prev) => [notif, ...prev]);
      setUnreadCount((prev) => prev + 1);
      // Show toast so user is alerted even when panel is closed
      toast.info(notif.title, {
        position: "top-right",
        autoClose: 4000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
      });
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  //  Close on outside click

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  //  Mark single as read

  async function handleMarkRead(notif: Notification) {
    if (!notif.isRead) {
      await apiFetch(`/notifications/${notif._id}/read`, { method: "PUT" });
      setNotifications((prev) =>
        prev.map((n) => (n._id === notif._id ? { ...n, isRead: true } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }

    // Navigate to the related order if applicable
    if (notif.orderId) {
      setOpen(false);
      if (role === "manufacturer") {
        router.push(`/manufacturer/order-management/${notif.orderId}`);
      } else if (role === "logistics") {
        router.push("/logistics/history");
      }
    }
  }

  //  Mark all as read

  async function handleMarkAllRead() {
    await apiFetch("/notifications/read-all", { method: "PUT" });
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
  }

  function formatTime(d: string) {
    const diff = Date.now() - new Date(d).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  //  Render

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        onClick={() => setOpen((p) => !p)}
        className="relative p-1.5 rounded-lg hover:bg-[#F5F5F5] text-[#5B6871] transition"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 top-10 w-80 bg-white rounded-2xl border border-[#E5E9EB] shadow-lg z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#F5F5F5]">
            <p className="text-sm font-semibold text-[#252C32]">
              Notifications
              {unreadCount > 0 && (
                <span className="ml-2 text-xs font-medium text-red-500">
                  {unreadCount} new
                </span>
              )}
            </p>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                <CheckCheck size={12} />
                Mark all read
              </button>
            )}
          </div>

          {/* Notification list */}
          <div className="max-h-80 overflow-y-auto">
            {isLoading ? (
              <div className="flex flex-col gap-2 p-3">
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className="h-14 bg-[#F5F5F5] rounded-xl animate-pulse"
                  />
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <Bell size={24} className="text-[#B0B7C3] mb-2" />
                <p className="text-xs text-[#838383]">No notifications yet</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif._id}
                  onClick={() => handleMarkRead(notif)}
                  className={`flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-[#FAFAFA] transition border-b border-[#F5F5F5] last:border-0 ${
                    !notif.isRead ? "bg-blue-50/40" : ""
                  }`}
                >
                  <NotifIcon type={notif.type} />
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-xs font-semibold text-[#252C32] ${!notif.isRead ? "text-primary" : ""}`}
                    >
                      {notif.title}
                    </p>
                    <p className="text-xs text-[#838383] mt-0.5 leading-relaxed line-clamp-2">
                      {notif.message}
                    </p>
                    <p className="text-[10px] text-[#B0B7C3] mt-1">
                      {formatTime(notif.createdAt)}
                    </p>
                  </div>
                  {!notif.isRead && (
                    <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
