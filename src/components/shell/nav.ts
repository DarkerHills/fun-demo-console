import {
  ArrowLeftRight,
  BarChart3,
  Blocks,
  KeyRound,
  LayoutGrid,
  PanelsTopLeft,
  Route,
  Settings,
  Webhook,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: "attention" | "webhooks";
}

export const NAV: { group: string; items: NavItem[] }[] = [
  {
    group: "Workspace",
    items: [
      { href: "/overview", label: "Overview", icon: LayoutGrid },
      { href: "/transactions", label: "Transactions", icon: ArrowLeftRight, badge: "attention" },
      { href: "/checkout", label: "Checkout", icon: PanelsTopLeft },
      { href: "/routes", label: "Payment routes", icon: Route },
      { href: "/analytics", label: "Analytics", icon: BarChart3 },
    ],
  },
  {
    group: "Developers",
    items: [
      { href: "/integrations", label: "Integrations", icon: Blocks },
      { href: "/webhooks", label: "Webhooks", icon: Webhook, badge: "webhooks" },
      { href: "/api-keys", label: "API keys", icon: KeyRound },
    ],
  },
];

export const SETTINGS_NAV: NavItem = { href: "/settings", label: "Settings", icon: Settings };
