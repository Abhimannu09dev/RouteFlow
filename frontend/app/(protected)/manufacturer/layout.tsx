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

  // Verifies the session cookie and checks role === "manufacturer"
  // Automatically redirects to /auth if not logged in
  // Automatically redirects to /logistics/dashboard if logged in as logistics
  const { loading, error } = useAuth("manufacturer");

  // Show a full-screen loader while the /auth/me request is in flight.
  // This prevents a flash of protected content before the redirect fires.
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

  // If there was a network error verifying the session, show a brief message
  // (the hook will also redirect to /auth, so this is just a fallback UI)
  if (error) {
    return (
      <div className="w-full h-[100dvh] flex items-center justify-center bg-gray-50">
        <p className="text-sm text-red-500">Session error. Redirecting...</p>
      </div>
    );
  }

  // Session is valid and role is confirmed — render the protected layout
  return (
    <div className="w-full grid grid-cols-1 lg:grid-cols-5 xl:grid-cols-6 h-[100dvh] overflow-hidden">
      <DesktopSidebar pathname={pathname} />
      <MobileSidebar pathname={pathname} />
      <div className="lg:col-span-4 xl:col-span-5 w-full h-[100dvh] overflow-hidden flex flex-col">
        <Navbar pathname={pathname} />
        <div className="w-full h-[100dvh] bg-white overflow-y-auto flex-1">
          <div className="min-h-[100dvh] p-2 md:p-4 lg:p-5">{children}</div>
        </div>
      </div>
    </div>
  );
}
