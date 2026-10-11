"use client";
import AppNavbar from "@/components/shared/AppNavbar";
import AppDesktopSidebar from "@/components/shared/AppDesktopSidebar";
import AppMobileSidebar from "@/components/shared/AppMobileSidebar";
import {
  primarySidebarItems,
  secondarySidebarItems,
} from "@/components/manufacturer/common/nav-menu";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

export default function ManufacturerLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const { loading, error } = useAuth("manufacturer");

  if (loading) {
    return (
      <div className="w-full h-dvh flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Verifying session...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-[100dvh] flex items-center justify-center bg-gray-50">
        <p className="text-sm text-red-500">Session error. Redirecting...</p>
      </div>
    );
  }

  return (
    <div className="w-full grid grid-cols-1 lg:grid-cols-5 xl:grid-cols-6 h-[100dvh] overflow-hidden">
      <AppDesktopSidebar pathname={pathname} primaryItems={primarySidebarItems} secondaryItems={secondarySidebarItems} />
      <AppMobileSidebar pathname={pathname} primaryItems={primarySidebarItems} secondaryItems={secondarySidebarItems} />
      <div className="lg:col-span-4 xl:col-span-5 w-full h-[100dvh] overflow-hidden flex flex-col">
        <AppNavbar pathname={pathname} role="manufacturer" primaryItems={primarySidebarItems} secondaryItems={secondarySidebarItems} />
        {/*
          KEY FIX: flex-1 + min-h-0 makes this div take exactly the remaining
          height after the navbar, allowing children to use h-full correctly.
          Previously min-h-[100dvh] meant h-full in children resolved to 0.
        */}
        <div className="flex-1 min-h-0 overflow-y-auto bg-white">
          <div className="h-full p-2 md:p-4 lg:p-5">{children}</div>
        </div>
      </div>
    </div>
  );
}
