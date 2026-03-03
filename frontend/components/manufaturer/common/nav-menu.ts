import {
  CalendarArrowUp,
  FileClock,
  HeartHandshake,
  HouseIcon,
  BadgeDollarSign,
  Settings,
  MessageCircleMore,
  User,
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
    id: "order-placement",
    label: "Orders Placement",
    icon: CalendarArrowUp,
    href: "/manufacturer/order-placement",
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
    id: "profile",
    label: "Profile",
    icon: User,
    href: "/manufacturer/profile",
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
