"use client";

import { useEffect, useState } from "react";
import { Drawer } from "antd";
import Link from "next/link";
import { primarySidebarItems, secondarySidebarItems } from "./nav-menu";
import { LogOut, Menu } from "lucide-react";
import Image from "next/image";
import { useTheme } from "@/contexts/ThemeContext";

const MobileSidebar = ({ pathname }: { pathname: string }) => {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [open, setOpen] = useState(false);

  const showDrawer = () => setOpen(true);
  const onClose = () => setOpen(false);

  // Close the drawer when navigating to a new route
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <aside className="lg:hidden group">
      <div className="w-full p-2 bg-white border-b border-gray-100 flex items-center gap-3">
        <Menu size={24} onClick={showDrawer} className="cursor-pointer text-[#5B6871]" />

        {/* Logo Section */}
        <Image
          src="/Logo.png"
          alt="logo"
          width={40}
          height={40}
          className="rounded-xl"
        />
      </div>

      <Drawer
        open={open}
        onClose={onClose}
        placement="left"
        size="default"
        styles={{
          wrapper: { width: 280 },
          mask: { background: isDark ? "rgba(0,0,0,0.7)" : undefined },
          section: { background: isDark ? "var(--rf-bg-card)" : undefined },
          header: { background: isDark ? "var(--rf-bg-card)" : undefined },
        }}
        classNames={{
          header: "",
          body: "flex flex-col gap-8",
        }}
      >
        <div className="overflow-y-auto grow scrollbar space-y-2">
          {/* Main Items */}
          <div className="flex flex-col gap-1.5">
            {primarySidebarItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 py-2.5 px-4 rounded-lg duration-200 transition-all! text-sm ${
                  pathname.includes(item.href)
                    ? "bg-white! text-primary! font-medium! hover:text-primary-dark!"
                    : "text-[#838383]! hover:bg-white! hover:text-primary!"
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
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 py-2.5 px-4 rounded-lg duration-200 transition-all! text-sm ${
                  pathname.includes(item.href)
                    ? "bg-white! text-primary! font-medium! hover:text-primary-dark!"
                    : "text-[#838383]! hover:bg-white! hover:text-primary!"
                }`}
              >
                {item.icon && <item.icon className="w-5 h-5" />}
                {item.label}
              </Link>
            ))}

            <Link
              href={"/auth"}
              className="flex items-center gap-2 py-2.5 px-4 rounded-lg duration-200 transition-all! text-sm text-[#838383]! hover:bg-red-100! hover:text-red-500!"
            >
              <LogOut className="w-5 h-5" />
              Logout
            </Link>
          </div>
        </div>
      </Drawer>
    </aside>
  );
};

export default MobileSidebar;
