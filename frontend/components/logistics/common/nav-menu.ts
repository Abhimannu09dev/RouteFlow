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
    href: "/logistics/dashboard",
  },
  {
    id: "chats",
    label: "Chats",
    icon: MessageCircleMore,
    href: "/logistics/chats",
  },
  {
    id: "orders-placement",
    label: "Orders Placement",
    icon: CalendarArrowUp,
    href: "/logistics/orders-placement",
  },
  {
    id: "history",
    label: "History",
    icon: FileClock,
    href: "/logistics/history",
  },
  {
    id: "payments",
    label: "Payments",
    icon: BadgeDollarSign,
    href: "/logistics/payments",
  },
  {
    id: "settings",
    label: "Settings",
    icon: Settings,
    href: "/logistics/settings",
  },
];

export const secondarySidebarItems = [
  {
    id: "help-support",
    label: "Help & Support",
    icon: HeartHandshake,
    href: "/logistics/support",
  },
];
