"use client";

import Navbar from "@/components/manufaturer/common/Navbar";
// import Footer from "@/components/manufacturer/common/Footer";
import DesktopSidebar from "@/components/manufaturer/common/DesktopSidebar";
import MobileSidebar from "@/components/manufaturer/common/MobileSidebar";
import { usePathname } from "next/navigation";

export default function ManufacturerLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();

  return (
    <div className="w-full grid grid-cols-1 lg:grid-cols-5 xl:grid-cols-6 h-[100dvh] overflow-hidden">
      <DesktopSidebar pathname={pathname} />
      <MobileSidebar pathname={pathname} />
      <div className="lg:col-span-4 xl:col-span-5 w-full h-[100dvh] overflow-hidden flex flex-col">
        <Navbar pathname={pathname} />
        <div className="w-full h-[100dvh] bg-white overflow-y-auto flex-1">
          <div className="min-h-[100dvh] p-2 md:p-4 lg:p-5">{children}</div>
          {/* <Footer /> */}
        </div>
      </div>
    </div>
  );
}
