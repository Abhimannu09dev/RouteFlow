"use client";

import { LogOut, Truck } from "lucide-react";
import Link from "next/link";
import { primarySidebarItems, secondarySidebarItems } from "./nav-menu";

export default function DesktopSidebar({ pathname }: { pathname: string }) {
  return (
    <nav className="hidden lg:flex w-full h-full overflow-y-auto bg-[#F6F8F9] py-2 lg:py-4 px-2 lg:px-4 flex-col border-r border-[#E5E9EB]">
      {/* Logo Section */}
      <div className="flex items-center mb-6 gap-4">
        <Truck className="p-2 rounded-lg bg-cyan-600 text-white w-9 h-9" />
        <p className=" text-lg font-medium text-gray-900">RouteFlow</p>
      </div>

      {/* Main Items */}
      <div className="flex flex-col gap-1.5">
        {primarySidebarItems.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className={`flex items-center gap-2 py-2.5 px-4 rounded-lg duration-200 transition text-sm ${
              pathname.includes(item.href)
                ? "bg-white text-primary font-semibold"
                : "text-[#838383] hover:bg-white hover:text-primary"
            }`}
          >
            {item.icon && <item.icon className="w-5 h-5" />}
            {item.label}
          </Link>
        ))}
      </div>

      {/* Secondary Items */}
      <div className="flex flex-col space-y-2 mt-7">
        {secondarySidebarItems.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className={`flex items-center gap-2 py-2.5 px-4 rounded-lg duration-200 transition-all text-sm ${
              pathname.includes(item.href)
                ? "bg-white text-primary font-semibold"
                : "text-[#838383] hover:bg-white hover:text-primary"
            }`}
          >
            {item.icon && <item.icon className="w-5 h-5" />}
            {item.label}
          </Link>
        ))}

        <Link
          href={"/auth"}
          className={`flex items-center gap-2 py-2.5 px-4 rounded-lg duration-200 transition-all text-sm text-[#838383] hover:bg-red-100 hover:text-red-500`}
        >
          <LogOut className="w-5 h-5" />
          Logout
        </Link>
      </div>
    </nav>
  );
}
