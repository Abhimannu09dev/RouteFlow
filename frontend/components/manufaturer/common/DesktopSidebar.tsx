"use client";

import { LogOut, Truck } from "lucide-react";
import Link from "next/link";
import { primarySidebarItems, secondarySidebarItems } from "./nav-menu";

export default function DesktopSidebar({ pathname }: { pathname: string }) {
  return (
    <nav className="hidden lg:flex w-full h-full overflow-y-auto bg-white py-6 px-4 flex-col border-r border-slate-200 z-10">
      {/* Logo Section */}
      <div className="flex items-center mb-8 gap-3 px-2">
        <div className="p-2 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
          <Truck className="w-6 h-6" />
        </div>
        <p className="text-xl font-bold tracking-tight text-slate-900">
          RouteFlow
        </p>
      </div>

      {/* Main Items */}
      <div className="flex flex-col gap-1.5">
        {primarySidebarItems.map((item) => {
          const isActive = pathname.includes(item.href);
          return (
            <Link
              key={item.id}
              href={item.href}
              className={`flex items-center gap-3 py-2.5 px-3 rounded-xl transition-all duration-200 text-[14px] ${
                isActive
                  ? "bg-primary/10 text-primary font-semibold" // The premium "pill" look
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900 font-medium"
              }`}
            >
              {item.icon && (
                <item.icon
                  className={`w-5 h-5 transition-colors ${isActive ? "text-primary" : "text-slate-400"}`}
                />
              )}
              {item.label}
            </Link>
          );
        })}
      </div>

      {/* Secondary Items - Pushed to bottom using mt-auto */}
      <div className="flex flex-col space-y-1 mt-auto pt-6 border-t border-slate-100">
        {secondarySidebarItems.map((item) => {
          const isActive = pathname.includes(item.href);
          return (
            <Link
              key={item.id}
              href={item.href}
              className={`flex items-center gap-3 py-2.5 px-3 rounded-xl transition-all duration-200 text-[14px] ${
                isActive
                  ? "bg-primary/10 text-primary font-semibold"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900 font-medium"
              }`}
            >
              {item.icon && (
                <item.icon
                  className={`w-5 h-5 transition-colors ${isActive ? "text-primary" : "text-slate-400"}`}
                />
              )}
              {item.label}
            </Link>
          );
        })}

        <Link
          href={"/auth"}
          className="flex items-center gap-3 py-2.5 px-3 mt-2 rounded-xl transition-all duration-200 text-[14px] text-slate-500 font-medium hover:bg-red-50 hover:text-red-600"
        >
          <LogOut className="w-5 h-5 text-slate-400 group-hover:text-red-500 transition-colors" />
          Logout
        </Link>
      </div>
    </nav>
  );
}
