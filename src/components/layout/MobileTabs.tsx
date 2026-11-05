"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV, isActive } from "./nav";

export default function MobileTabs() {
  const pathname = usePathname();

  return (
    <nav className="flex md:hidden bg-card border-t border-border order-10 pb-safe" aria-label="Principal">
      {NAV.map(({ href, icon: Icon, short }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex-1 flex flex-col items-center gap-1 pt-2 pb-1.5 text-[11px] font-medium transition-colors ${active ? "text-brand" : "text-muted"}`}
          >
            <span className={`h-7 w-14 grid place-items-center rounded-full transition-colors ${active ? "bg-brand/10" : ""}`}>
              <Icon size={20} strokeWidth={active ? 2.25 : 2} />
            </span>
            {short}
          </Link>
        );
      })}
    </nav>
  );
}
