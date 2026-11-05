"use client";

import { useEffect } from "react";
import {
  Download, FileSpreadsheet, LogOut, Moon, Sun, Trash2, Upload, type LucideIcon,
} from "lucide-react";
import ConfirmModal from "@/components/ui/ConfirmModal";
import { useDataControls } from "@/hooks/useDataControls";
import { useTheme } from "@/hooks/useTheme";

interface Props {
  open: boolean;
  onClose: () => void;
  userEmail?: string;
}

export default function MobileMenu({ open, onClose, userEmail }: Props) {
  const { dark, toggle } = useTheme();
  const {
    busy, confirm, setConfirm, fileRef,
    handleSignOut, handleExcelClick, handleJSONClick,
    handleRestoreClick, handleFileChange, handleConfirm, cancelConfirm,
  } = useDataControls();

  // Trava o scroll do fundo enquanto o menu está aberto
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 bg-black/45 z-overlay md:hidden"
          onClick={onClose}
        >
          <div
            className="absolute bottom-0 inset-x-0 bg-card rounded-t-3xl px-3 pt-3 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-[0_-10px_40px_rgba(0,0,0,.25)]"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-border rounded-full mx-auto mb-4" />

            <MenuRow icon={dark ? Sun : Moon} label={dark ? "Modo claro" : "Modo escuro"} onClick={toggle} />
            <p className="px-3 pt-3 pb-1 text-xs font-medium text-muted">Dados</p>
            <MenuRow icon={FileSpreadsheet} label="Exportar Excel"   onClick={handleExcelClick}   disabled={busy} />
            <MenuRow icon={Download}        label="Fazer backup"     onClick={handleJSONClick}    disabled={busy} />
            <MenuRow icon={Upload}          label="Restaurar backup" onClick={handleRestoreClick} disabled={busy} />
            <MenuRow icon={Trash2}          label="Apagar tudo"      onClick={() => setConfirm("reset")} danger disabled={busy} />
            <div className="my-2 border-t border-border" />
            <MenuRow icon={LogOut}          label="Sair"             onClick={handleSignOut}      disabled={busy} />

            {userEmail && (
              <div className="text-xs text-muted text-center mt-3 truncate">{userEmail}</div>
            )}
          </div>
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleFileChange}
      />

      <ConfirmModal
        open={confirm === "restore"}
        title="Restaurar backup?"
        message="Todos os dados atuais serão substituídos pelos dados do arquivo. Esta ação não pode ser desfeita."
        onConfirm={handleConfirm}
        onCancel={cancelConfirm}
      />
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

function MenuRow({
  icon: Icon, label, onClick, danger = false, disabled = false,
}: {
  icon: LucideIcon; label: string; onClick: () => void; danger?: boolean; disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-3.5 w-full px-3 py-3 rounded-xl text-[15px] font-medium transition-colors disabled:opacity-40 ${
        danger ? "text-danger active:bg-danger/10" : "text-apptext active:bg-rowhover"
      }`}
    >
      <Icon size={20} className={danger ? "" : "text-muted"} />
      {label}
    </button>
  );
}
