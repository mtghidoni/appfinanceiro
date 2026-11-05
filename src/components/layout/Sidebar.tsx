"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Download, FileSpreadsheet, LogOut, Moon, Sun, Trash2, Upload, Wallet, type LucideIcon,
} from "lucide-react";
import ConfirmModal from "@/components/ui/ConfirmModal";
import { useDataControls } from "@/hooks/useDataControls";
import { useTheme } from "@/hooks/useTheme";
import { NAV, isActive } from "./nav";

interface Props { userEmail: string; }

export default function Sidebar({ userEmail }: Props) {
  const pathname = usePathname();
  const { dark, toggle } = useTheme();
  const {
    busy, confirm, setConfirm, fileRef,
    handleSignOut, handleExcelClick, handleJSONClick,
    handleRestoreClick, handleFileChange, handleConfirm, cancelConfirm,
  } = useDataControls();

  return (
    <>
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

        <div className="px-3 pb-2">
          <p className="px-3 pb-1.5 text-xs font-medium text-muted">Dados</p>
          <SidebarBtn icon={FileSpreadsheet} onClick={handleExcelClick} label="Exportar Excel" disabled={busy} />
          <SidebarBtn icon={Download} onClick={handleJSONClick} label="Fazer backup" disabled={busy} />
          <SidebarBtn icon={Upload} onClick={handleRestoreClick} label="Restaurar backup" disabled={busy} />
          <SidebarBtn icon={Trash2} onClick={() => setConfirm("reset")} label="Apagar tudo" danger disabled={busy} />
        </div>

        <div className="px-3 py-3 border-t border-border space-y-0.5">
          <SidebarBtn icon={dark ? Sun : Moon} onClick={toggle} label={dark ? "Modo claro" : "Modo escuro"} />
          <div className="flex items-center gap-2 pl-3 pr-1 pt-1">
            <span className="flex-1 min-w-0 text-xs text-muted truncate" title={userEmail}>{userEmail}</span>
            <button
              onClick={handleSignOut}
              disabled={busy}
              aria-label="Sair"
              title="Sair"
              className="size-8 grid place-items-center rounded-lg text-muted hover:text-apptext hover:bg-thead transition-colors disabled:opacity-40"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Hidden file input for JSON restore */}
      <input
        ref={fileRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Confirm: restore */}
      <ConfirmModal
        open={confirm === "restore"}
        title="Restaurar backup?"
        message="Todos os dados atuais serão substituídos pelos dados do arquivo. Esta ação não pode ser desfeita."
        onConfirm={handleConfirm}
        onCancel={cancelConfirm}
      />

      {/* Confirm: reset */}
      <ConfirmModal
        open={confirm === "reset"}
        title="Apagar todos os dados?"
        message="Todos os lançamentos e parcelamentos serão apagados permanentemente. Faça um backup antes."
        onConfirm={handleConfirm}
        onCancel={cancelConfirm}
      />
    </>
  );
}

function SidebarBtn({
  icon: Icon, onClick, label, danger = false, disabled = false,
}: {
  icon: LucideIcon; onClick: () => void; label: string; danger?: boolean; disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-3 w-full px-3 py-2 rounded-xl text-[13px] font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
        danger
          ? "text-danger hover:bg-danger/10"
          : "text-muted hover:bg-thead hover:text-apptext"
      }`}
    >
      <Icon size={16} />
      {label}
    </button>
  );
}
