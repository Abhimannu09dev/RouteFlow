import {
  CalendarArrowUp,
  FileClock,
  HeartHandshake,
  HouseIcon,
  BadgeDollarSign,
  Settings,
  MessageCircleMore,
} from "lucide-react";

export const primarySidebarItems = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: HouseIcon,
    href: "/manufacturer/dashboard",
  },
  {
    id: "chats",
    label: "Chats",
    icon: MessageCircleMore,
    href: "/manufacturer/chats",
  },
  {
    id: "orders-placement",
    label: "Orders Placement",
    icon: CalendarArrowUp,
    href: "/manufacturer/orders-placement",
  },
  {
    id: "history",
    label: "History",
    icon: FileClock,
    href: "/manufacturer/history",
  },
  {
    id: "payments",
    label: "Payments",
    icon: BadgeDollarSign,
    href: "/manufacturer/payments",
  },
  {
    id: "settings",
    label: "Settings",
    icon: Settings,
    href: "/manufacturer/settings",
  },
];

export const secondarySidebarItems = [
  {
    id: "help-support",
    label: "Help & Support",
    icon: HeartHandshake,
    href: "/manufacturer/support",
  },
];
