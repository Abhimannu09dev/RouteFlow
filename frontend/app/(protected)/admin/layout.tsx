"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import {
  LayoutDashboard,
  Users,
  ShieldCheck,
  LogOut,
  HeartHandshake,
} from "lucide-react";

const sidebarItems = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    href: "/admin/dashboard",
  },
  { id: "users", label: "User Management", icon: Users, href: "/admin/users" },
];

const secondaryItems = [
  {
    id: "support",
    label: "Help & Support",
    icon: HeartHandshake,
    href: "/admin/support",
  },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { loading, error } = useAuth("admin" as any);

  async function handleLogout() {
    await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/auth/logout`,
      {
        method: "POST",
        credentials: "include",
      },
    );
    router.replace("/auth");
  }

  if (loading) {
    return (
      <div className="w-full h-[100dvh] flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Verifying session...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-[100dvh] flex items-center justify-center">
        <p className="text-sm text-red-500">Session error. Redirecting...</p>
      </div>
    );
  }

  return (
    <div className="w-full grid grid-cols-1 lg:grid-cols-5 xl:grid-cols-6 h-[100dvh] overflow-hidden">
      {/* Sidebar */}
      <nav className="hidden lg:flex w-full h-full overflow-y-auto bg-[#F6F8F9] py-4 px-4 flex-col border-r border-[#E5E9EB]">
        {/* Logo */}
        <div className="flex items-center mb-6 gap-3">
          <div className="w-9 h-9 rounded-lg bg-teal-600 flex items-center justify-center">
            <ShieldCheck size={18} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[#252C32]">RouteFlow</p>
            <p className="text-xs text-[#838383]">Admin Panel</p>
          </div>
        </div>

        {/* Primary nav */}
        <div className="flex flex-col gap-1.5 flex-1">
          {sidebarItems.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className={`flex items-center gap-2 py-2.5 px-4 rounded-lg text-sm transition ${
                pathname.includes(item.href)
                  ? "bg-white text-primary font-semibold"
                  : "text-[#838383] hover:bg-white hover:text-primary"
              }`}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </Link>
          ))}
        </div>

        {/* Secondary nav */}
        <div className="flex flex-col gap-1.5 mt-4">
          {secondaryItems.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className={`flex items-center gap-2 py-2.5 px-4 rounded-lg text-sm transition ${
                pathname.includes(item.href)
                  ? "bg-white text-primary font-semibold"
                  : "text-[#838383] hover:bg-white hover:text-primary"
              }`}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </Link>
          ))}
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 py-2.5 px-4 rounded-lg text-sm text-[#838383] hover:bg-red-100 hover:text-red-500 transition text-left"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </div>
      </nav>

      {/* Main content */}
      <div className="lg:col-span-4 xl:col-span-5 w-full h-[100dvh] overflow-hidden flex flex-col">
        {/* Top bar */}
        <header className="bg-white border-b border-[#E5E9EB] px-6 py-3 flex items-center justify-between shrink-0">
          <p className="text-sm font-medium text-[#252C32]">
            {sidebarItems.find((i) => pathname.includes(i.href))?.label ||
              "Admin"}
          </p>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-teal-100 flex items-center justify-center">
              <ShieldCheck size={14} className="text-teal-600" />
            </div>
            <span className="text-xs font-medium text-[#5B6871]">
              Super Admin
            </span>
          </div>
        </header>

        <div className="w-full flex-1 overflow-y-auto bg-[#F6F8F9]">
          <div className="p-4 md:p-6">{children}</div>
        </div>
      </div>
    </div>
  );
}
