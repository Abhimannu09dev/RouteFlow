"use client";
import Navbar from "@/components/manufaturer/common/Navbar";
import DesktopSidebar from "@/components/manufaturer/common/DesktopSidebar";
import MobileSidebar from "@/components/manufaturer/common/MobileSidebar";
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
      <div className="w-full h-[100dvh] flex items-center justify-center bg-gray-50">
        <p className="text-sm text-red-500">Session error. Redirecting...</p>
      </div>
    );
  }

  return (
    <div className="w-full grid grid-cols-1 lg:grid-cols-5 xl:grid-cols-6 h-[100dvh] overflow-hidden">
      <DesktopSidebar pathname={pathname} />
      <MobileSidebar pathname={pathname} />
      <div className="lg:col-span-4 xl:col-span-5 w-full h-[100dvh] overflow-hidden flex flex-col">
        <Navbar pathname={pathname} />
        {/*
          KEY FIX: flex-1 + min-h-0 makes this div take exactly the remaining
          height after the navbar, allowing children to use h-full correctly.
          Previously min-h-[100dvh] meant h-full in children resolved to 0.
        */}
        <div className="flex-1 min-h-0 overflow-y-auto bg-white">
          <div className="min-h-full p-2 md:p-4 lg:p-5">{children}</div>
        </div>
      </div>
    </div>
  );
}
