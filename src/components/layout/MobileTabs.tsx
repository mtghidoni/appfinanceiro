"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import MobileMenu from "./MobileMenu";
import { NAV, isActive } from "./nav";

interface Props { userEmail?: string; }

const TAB_CLS = "flex-1 flex flex-col items-center gap-1 pt-2 pb-1.5 text-[11px] font-medium transition-colors";

export default function MobileTabs({ userEmail }: Props) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <nav className="flex md:hidden bg-card border-t border-border order-10 pb-safe" aria-label="Principal">
        {NAV.map(({ href, icon: Icon, short }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`${TAB_CLS} ${active ? "text-brand" : "text-muted"}`}
            >
              <span className={`h-7 w-14 grid place-items-center rounded-full transition-colors ${active ? "bg-brand/10" : ""}`}>
                <Icon size={20} strokeWidth={active ? 2.25 : 2} />
              </span>
              {short}
            </Link>
          );
        })}
        <button
          onClick={() => setMenuOpen(true)}
          className={`${TAB_CLS} ${menuOpen ? "text-brand" : "text-muted"}`}
        >
          <span className={`h-7 w-14 grid place-items-center rounded-full transition-colors ${menuOpen ? "bg-brand/10" : ""}`}>
            <Menu size={20} />
          </span>
          Menu
        </button>
      </nav>

      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} userEmail={userEmail} />
    </>
  );
}
