import { ChartColumn, Layers, ReceiptText, type LucideIcon } from "lucide-react";

export const NAV: { href: string; icon: LucideIcon; label: string; short: string }[] = [
  { href: "/lancamento",    icon: ReceiptText, label: "Lançamentos",   short: "Lançamentos" },
  { href: "/parcelamentos", icon: Layers,      label: "Parcelamentos", short: "Parcelas" },
  { href: "/dashboard",     icon: ChartColumn, label: "Dashboard",     short: "Dashboard" },
];

export function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/");
}
