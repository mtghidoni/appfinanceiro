"use client";

import {
  ChevronRight, Download, FileSpreadsheet, LogOut, Moon, Sun, SunMoon, Trash2, Upload, type LucideIcon,
} from "lucide-react";
import ConfirmModal from "@/components/ui/ConfirmModal";
import { useDataControls } from "@/hooks/useDataControls";
import { useTheme, type ThemeMode } from "@/hooks/useTheme";

const TEMAS: { v: ThemeMode; label: string; icon: LucideIcon }[] = [
  { v: "light", label: "Claro", icon: Sun },
  { v: "dark", label: "Escuro", icon: Moon },
  { v: "system", label: "Automático", icon: SunMoon },
];

export default function ConfiguracoesScreen({ userEmail }: { userEmail: string }) {
  const { mode, setMode } = useTheme();
  const {
    busy, confirm, setConfirm, fileRef,
    handleSignOut, handleExcelClick, handleJSONClick,
    handleRestoreClick, handleFileChange, handleConfirm, cancelConfirm,
  } = useDataControls();

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <header className="bg-card border-b border-border px-4 md:px-8 h-16 flex items-center flex-shrink-0">
        <h1 className="text-lg font-semibold text-heading">Configurações</h1>
      </header>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="max-w-2xl mx-auto px-3 md:px-8 py-4 md:py-6 pb-10 space-y-6">
          <Group title="Conta">
            <div className="flex items-center gap-3 px-4 py-3.5">
              <span className="size-10 grid place-items-center rounded-full bg-brand/10 text-brand text-[15px] font-semibold uppercase">
                {userEmail.charAt(0) || "?"}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted">Conectado como</p>
                <p className="text-[15px] font-medium truncate">{userEmail}</p>
              </div>
            </div>
            <Row icon={LogOut} label="Sair" onClick={handleSignOut} disabled={busy} />
          </Group>

          <Group title="Aparência">
            <div className="px-4 py-3.5">
              <p className="text-[15px] font-medium mb-2.5">Tema</p>
              <div className="grid grid-cols-3 gap-1 rounded-xl bg-thead p-1" role="group" aria-label="Tema">
                {TEMAS.map(({ v, label, icon: Icon }) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setMode(v)}
                    aria-pressed={mode === v}
                    className={`flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-sm font-medium transition ${
                      mode === v ? "bg-card text-apptext shadow-sm" : "text-muted hover:text-apptext"
                    }`}
                  >
                    <Icon size={16} />
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </Group>

          <Group title="Dados" footer="O backup guarda todos os lançamentos e parcelamentos num arquivo .json que pode ser restaurado depois.">
            <Row icon={FileSpreadsheet} label="Exportar para Excel" hint="Planilha com todos os meses" onClick={handleExcelClick} disabled={busy} />
            <Row icon={Download} label="Fazer backup" hint="Baixa um arquivo .json" onClick={handleJSONClick} disabled={busy} />
            <Row icon={Upload} label="Restaurar backup" hint="Substitui os dados atuais pelos do arquivo" onClick={handleRestoreClick} disabled={busy} />
          </Group>

          <Group title="Zona de perigo">
            <Row icon={Trash2} label="Apagar todos os dados" hint="Lançamentos e parcelamentos, sem volta" onClick={() => setConfirm("reset")} danger disabled={busy} />
          </Group>
        </div>
      </div>

      <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleFileChange} />
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
    </div>
  );
}

function Group({ title, footer, children }: { title: string; footer?: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="px-1 mb-2 text-sm font-semibold text-muted">{title}</h2>
      <div className="bg-card border border-border rounded-2xl overflow-hidden divide-y divide-border">{children}</div>
      {footer && <p className="px-1 mt-2 text-xs text-muted leading-relaxed">{footer}</p>}
    </section>
  );
}

function Row({ icon: Icon, label, hint, onClick, danger = false, disabled = false }: {
  icon: LucideIcon; label: string; hint?: string; onClick: () => void; danger?: boolean; disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-rowhover active:bg-rowhover transition-colors disabled:opacity-40 disabled:pointer-events-none"
    >
      <span className={`size-9 grid place-items-center rounded-xl ${danger ? "bg-danger/10 text-danger" : "bg-thead text-muted"}`}>
        <Icon size={18} />
      </span>
      <span className="flex-1 min-w-0">
        <span className={`block text-[15px] font-medium ${danger ? "text-danger" : ""}`}>{label}</span>
        {hint && <span className="block text-[13px] text-muted truncate">{hint}</span>}
      </span>
      <ChevronRight size={18} className="text-muted shrink-0" />
    </button>
  );
}
