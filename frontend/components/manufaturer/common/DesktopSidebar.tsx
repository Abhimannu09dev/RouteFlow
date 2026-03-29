"use client";
import Link from "next/link";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { primarySidebarItems, secondarySidebarItems } from "./nav-menu";
import { authAPI } from "@/lib/api";
import "@/lib/i18n";

export default function DesktopSidebar({ pathname }: { pathname: string }) {
  const router = useRouter();
  const { t } = useTranslation();

  async function handleLogout() {
    await authAPI.logout();
    router.replace("/auth?action=sign-in");
  }

  return (
    <aside className="hidden lg:flex w-full h-full overflow-y-auto bg-[#F6F8F9] py-4 px-4 flex-col border-r border-[#E5E9EB]">
      {/* Logo */}
      <div className="flex items-center gap-2 mb-6 px-2">
        <div className="w-8 h-8 rounded-lg bg-teal-500 flex items-center justify-center shrink-0">
          <span className="text-white font-bold text-sm">R</span>
        </div>
        <span className="font-semibold text-[#252C32] text-sm">RouteFlow</span>
      </div>

      {/* Primary nav */}
      <nav className="flex flex-col gap-1 flex-1">
        {primarySidebarItems.map((item) => {
          const isActive = pathname.includes(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition ${
                isActive
                  ? "bg-white text-teal-600 font-semibold shadow-sm"
                  : "text-[#5B6871] hover:bg-white hover:text-[#252C32]"
              }`}
            >
              <item.icon size={17} />
              {t(item.labelKey)}
            </Link>
          );
        })}
      </nav>

      {/* Secondary nav */}
      <div className="flex flex-col gap-1 mt-4 border-t border-[#E5E9EB] pt-4">
        {secondarySidebarItems.map((item) => {
          const isActive = pathname.includes(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition ${
                isActive
                  ? "bg-white text-teal-600 font-semibold shadow-sm"
                  : "text-[#5B6871] hover:bg-white hover:text-[#252C32]"
              }`}
            >
              <item.icon size={17} />
              {t(item.labelKey)}
            </Link>
          );
        })}
        <button
          onClick={handleLogout}
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-[#5B6871] hover:bg-red-50 hover:text-red-500 transition text-left"
        >
          <LogOut size={17} />
          {t("nav.logout")}
        </button>
      </div>
    </aside>
  );
}
