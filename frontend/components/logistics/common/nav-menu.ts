import {
  LayoutDashboard,
  Truck,
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
    href: "/logistics/dashboard",
    icon: LayoutDashboard,
  },
  {
    labelKey: "nav.chats",
    label: "Chats",
    href: "/logistics/chats",
    icon: MessageSquare,
  },
  {
    labelKey: "nav.ordersPlacement",
    label: "Orders Placement",
    href: "/logistics/orders-placement",
    icon: Truck,
  },
  {
    labelKey: "nav.bids",
    label: "My Bids",
    href: "/logistics/bids",
    icon: Gavel,
  },
  {
    labelKey: "nav.history",
    label: "History",
    href: "/logistics/history",
    icon: History,
  },
  {
    labelKey: "nav.payments",
    label: "Payments",
    href: "/logistics/payments",
    icon: CreditCard,
  },
];

export const secondarySidebarItems = [
  {
    labelKey: "nav.helpSupport",
    label: "Help & Support",
    href: "/logistics/help",
    icon: HelpCircle,
  },
  {
    labelKey: "nav.profile",
    label: "Profile",
    href: "/logistics/profile",
    icon: User,
  },
  {
    labelKey: "nav.settings",
    label: "Settings",
    href: "/logistics/settings",
    icon: Settings,
  },
];
