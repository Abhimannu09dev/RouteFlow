"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { User } from "lucide-react";
import {
  primarySidebarItems,
  secondarySidebarItems,
} from "@/components/manufaturer/common/nav-menu";
import NotificationPanel from "@/components/shared/notification-panel";
import ChatBadge from "@/components/shared/chat-badge";
import { authAPI } from "@/lib/api";

const Navbar = ({ pathname }: { pathname: string }) => {
  const router = useRouter();
  const userRef = useRef<HTMLDivElement>(null);
  const [showUser, setShowUser] = useState(false);

  // Resolve page title from nav-menu
  let title =
    primarySidebarItems.find((item) => pathname.includes(item.href))?.label ||
    "";
  if (!title)
    title =
      secondarySidebarItems.find((item) => pathname.includes(item.href))
        ?.label || "";

  // Close user dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userRef.current && !userRef.current.contains(event.target as Node)) {
        setShowUser(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleLogout() {
    await authAPI.logout();
    router.replace("/auth?action=sign-in");
  }

  return (
    <header className="bg-white border-b border-[#E5E9EB] p-3 lg:px-8 sticky top-0 z-10">
      <div className="flex flex-row justify-between items-center">
        <p className="text-lg font-medium text-[#252C32]">{title}</p>
        <div className="flex flex-row items-center gap-3 text-[#5B6871] select-none">
          {/* Chat badge */}
          <ChatBadge role="manufacturer" />
          {/* Real-time notification bell */}
          <NotificationPanel role="manufacturer" />
          {/* User dropdown */}
          <div className="relative" ref={userRef}>
            <button
              onClick={() => setShowUser((prev) => !prev)}
              className="p-1.5 rounded-lg hover:bg-[#F5F5F5] transition"
            >
              <User size={18} color="#5B6871" />
            </button>
            {showUser && (
              <div className="absolute top-10 right-0 w-52 bg-white border border-[#E5E9EB] rounded-2xl shadow-lg p-3 flex flex-col gap-1 text-sm z-50">
                <Link
                  href="/manufacturer/profile"
                  onClick={() => setShowUser(false)}
                  className="px-3 py-2 rounded-xl hover:bg-[#F5F5F5] text-[#252C32] transition"
                >
                  Profile
                </Link>
                <Link
                  href="/manufacturer/settings"
                  onClick={() => setShowUser(false)}
                  className="px-3 py-2 rounded-xl hover:bg-[#F5F5F5] text-[#252C32] transition"
                >
                  Settings
                </Link>
                <hr className="border-[#E5E9EB] my-1" />
                <button
                  onClick={handleLogout}
                  className="px-3 py-2 rounded-xl hover:bg-red-50 text-red-500 transition text-left"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
