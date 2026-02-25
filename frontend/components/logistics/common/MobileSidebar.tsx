"use client";

import { useEffect, useState } from "react";
import { Drawer } from "antd";
import Link from "next/link";
import { primarySidebarItems, secondarySidebarItems } from "./nav-menu";
import { LogOut, Menu, Truck } from "lucide-react";

const MobileSidebar = ({ pathname }: { pathname: string }) => {
  const [open, setOpen] = useState(false);

  const showDrawer = () => {
    setOpen(true);
  };

  const onClose = () => {
    setOpen(false);
  };

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <aside className="lg:hidden group">
      <div className="w-full p-2 bg-white border-b-1 border-gray-100 flex items-center gap-3">
        <Menu size={24} onClick={showDrawer} className="cursor-pointer" />

        {/* Logo Section */}
        <div className="flex items-center gap-2">
          <Truck className="p-1.5 rounded-md bg-primary/10 text-primary w-8 h-8" />
          <p className=" text-lg font-medium text-gray-900">RouteFlow</p>
        </div>
      </div>

      <Drawer
        open={open}
        onClose={onClose}
        placement="left"
        width={280}
        getContainer={false}
        classNames={{
          header: "",
          body: "flex flex-col gap-8",
        }}
      >
        <div className="overflow-y-auto flex-grow scrollbar space-y-2">
          {/* Main Items */}
          <div className="flex flex-col gap-1.5">
            {primarySidebarItems.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className={`flex items-center gap-2 py-2.5 px-4 rounded-lg duration-200 !transition-all text-sm ${
                  pathname.includes(item.href)
                    ? "!bg-white !text-primary !font-medium hover:text-primary-dark"
                    : "!text-[#838383] hover:!bg-white hover:!text-primary"
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
                className={`flex items-center gap-2 py-2.5 px-4 rounded-lg duration-200 !transition-all text-sm ${
                  pathname.includes(item.href)
                    ? "!bg-white !text-primary !font-medium hover:text-primary-dark"
                    : "!text-[#838383] hover:!bg-white hover:!text-primary"
                }`}
              >
                {item.icon && <item.icon className="w-5 h-5" />}
                {item.label}
              </Link>
            ))}

            <Link
              href={"/auth"}
              className={`flex items-center gap-2 py-2.5 px-4 rounded-lg duration-200 !transition-all text-sm !text-[#838383] hover:!bg-red-100 hover:!text-red-500`}
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
