"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Wallet } from "lucide-react";
import { NAV, isActive } from "./nav";

interface Props { userEmail: string; }

export default function Sidebar({ userEmail }: Props) {
  const pathname = usePathname();

  return (
    <aside className="w-[244px] bg-card border-r border-border flex-col flex-shrink-0 z-sticky hidden md:flex">
      <div className="px-5 h-16 flex items-center gap-2.5">
        <span className="size-8 grid place-items-center rounded-[10px] bg-brand text-onbrand">
          <Wallet size={17} strokeWidth={2.25} />
        </span>
        <span className="text-[15px] font-semibold text-heading leading-tight">Controle Financeiro</span>
      </div>

      <nav className="px-3 pt-3 flex-1 space-y-0.5" aria-label="Principal">
        {NAV.map(({ href, icon: Icon, label }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
                active
                  ? "bg-brand/10 text-brand font-semibold"
                  : "text-muted font-medium hover:bg-thead hover:text-apptext"
              }`}
            >
              <Icon size={18} strokeWidth={active ? 2.25 : 2} />
              {label}
            </Link>
          );
        })}
      </nav>

      <Link
        href="/configuracoes"
        className="mx-3 mb-3 flex items-center gap-2.5 rounded-xl px-3 py-2.5 hover:bg-thead transition-colors"
        title="Conta e configurações"
      >
        <span className="size-8 shrink-0 grid place-items-center rounded-full bg-brand/10 text-brand text-sm font-semibold uppercase">
          {userEmail.charAt(0) || "?"}
        </span>
        <span className="min-w-0 text-xs text-muted truncate">{userEmail}</span>
      </Link>
    </aside>
  );
}
