import {
  LayoutDashboard,
  Package,
  Gavel,
  History,
  CreditCard,
  MessageSquare,
} from "lucide-react";
import { User, Settings, HelpCircle } from "lucide-react";

export const primarySidebarItems = [
  {
    labelKey: "nav.dashboard",
    label: "Dashboard",
    href: "/manufacturer/dashboard",
    icon: LayoutDashboard,
  },
  {
    labelKey: "nav.chats",
    label: "Chats",
    href: "/manufacturer/chats",
    icon: MessageSquare,
  },
  {
    labelKey: "nav.ordersPlacement",
    label: "Orders Placement",
    href: "/manufacturer/order-management",
    icon: Package,
  },
  {
    labelKey: "nav.bids",
    label: "Bids",
    href: "/manufacturer/bids",
    icon: Gavel,
  },
  {
    labelKey: "nav.history",
    label: "History",
    href: "/manufacturer/history",
    icon: History,
  },
  {
    labelKey: "nav.payments",
    label: "Payments",
    href: "/manufacturer/payments",
    icon: CreditCard,
  },
];

export const secondarySidebarItems = [
  {
    labelKey: "nav.helpSupport",
    label: "Help & Support",
    href: "/manufacturer/support",
    icon: HelpCircle,
  },
  {
    labelKey: "nav.profile",
    label: "Profile",
    href: "/manufacturer/profile",
    icon: User,
  },
  {
    labelKey: "nav.settings",
    label: "Settings",
    href: "/manufacturer/settings",
    icon: Settings,
  },
];
