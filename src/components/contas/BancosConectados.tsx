"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { AlertTriangle, Link2, Plug, RefreshCw, Unplug } from "lucide-react";
import SectionCard from "@/components/ui/SectionCard";
import type { PluggyItem } from "@/types";

// O widget usa window: carrega só no navegador.
const PluggyConnect = dynamic(() => import("react-pluggy-connect").then(m => m.PluggyConnect), { ssr: false });

const STATUS_COM_ERRO = new Set(["LOGIN_ERROR", "OUTDATED", "WAITING_USER_ACTION", "WAITING_USER_INPUT"]);

function haQuanto(iso: string | null) {
  if (!iso) return "nunca sincronizado";
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (min < 1) return "sincronizado agora";
  if (min < 60) return `sincronizado há ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `sincronizado há ${h} h`;
  const d = Math.round(h / 24);
  return `sincronizado há ${d} ${d === 1 ? "dia" : "dias"}`;
}

interface Props {
  itens: PluggyItem[];
  sincronizando: Set<string>;
  nomeDe?: (userId: string) => string;
  onConectar: () => void;
  onSincronizar: (item: PluggyItem) => void;
  onReconectar: (item: PluggyItem) => void;
  onDesconectar: (item: PluggyItem) => void;
}

/** Lista de bancos conectados pela Pluggy, com sincronizar / reconectar / desconectar. */
export function BancosConectados({ itens, sincronizando, nomeDe, onConectar, onSincronizar, onReconectar, onDesconectar }: Props) {
  return (
    <SectionCard
      icon={Link2}
      tone="brand"
      title="Bancos conectados"
      meta={itens.length ? "Contas, saldos e transações chegam sozinhos" : "Conecte pelo Open Finance, com segurança"}
      onAdd={onConectar}
    >
      {itens.length === 0 ? (
        <button type="button" onClick={onConectar}
          className="w-full flex items-center gap-3 px-4 md:px-5 py-3.5 text-left hover:bg-rowhover transition-colors">
          <Plug size={18} className="text-brand shrink-0" />
          <span className="text-sm text-muted leading-relaxed">
            Conecte seu banco ou cartão para o app buscar as transações automaticamente, sem precisar importar extrato.
          </span>
        </button>
      ) : (
        <div className="divide-y divide-border">
          {itens.map(i => {
            const busy = sincronizando.has(i.id);
            const comErro = STATUS_COM_ERRO.has(i.status);
            return (
              <div key={i.id} className="flex items-center gap-3 px-4 md:px-5 py-3">
                {i.conector_logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={i.conector_logo} alt="" className="size-9 shrink-0 rounded-xl object-contain bg-white border border-border" />
                ) : (
                  <span className="size-9 shrink-0 grid place-items-center rounded-xl bg-brand/10 text-brand"><Link2 size={18} /></span>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-medium truncate">
                    {i.conector || "Banco"}
                    {nomeDe && <span className="text-muted font-normal"> · {nomeDe(i.user_id)}</span>}
                  </p>
                  {comErro ? (
                    <p className="text-[13px] text-danger flex items-center gap-1 truncate">
                      <AlertTriangle size={13} className="shrink-0" />
                      <span className="truncate">{i.erro || "Precisa reconectar"}</span>
                    </p>
                  ) : (
                    <p className="text-[13px] text-muted truncate">
                      {busy ? "Sincronizando…" : i.status === "UPDATING" ? "O banco está enviando os dados…" : haQuanto(i.ultima_sync)}
                    </p>
                  )}
                </div>
                {comErro ? (
                  <button type="button" onClick={() => onReconectar(i)}
                    className="shrink-0 rounded-full bg-brand text-onbrand px-3 py-1.5 text-[13px] font-semibold hover:bg-brand/90 transition">
                    Reconectar
                  </button>
                ) : (
                  <button type="button" onClick={() => onSincronizar(i)} disabled={busy}
                    aria-label={`Sincronizar ${i.conector}`} title="Sincronizar agora"
                    className="shrink-0 size-9 grid place-items-center rounded-xl border border-border hover:bg-thead transition-colors disabled:opacity-50">
                    <RefreshCw size={16} className={busy ? "animate-spin" : ""} />
                  </button>
                )}
                <button type="button" onClick={() => onDesconectar(i)} disabled={busy}
                  aria-label={`Desconectar ${i.conector}`} title="Desconectar"
                  className="shrink-0 size-9 grid place-items-center rounded-xl text-muted hover:text-danger hover:bg-danger/10 transition-colors disabled:opacity-50">
                  <Unplug size={16} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </SectionCard>
  );
}

interface WidgetProps {
  token: string;
  /** id da Pluggy da conexão a reconectar (modo atualização). */
  updateItem?: string;
  dark: boolean;
  onSuccess: (itemId: string) => void;
  onError: (msg: string) => void;
  onClose: () => void;
}

/** Janela da Pluggy onde a pessoa escolhe o banco e autoriza o acesso. */
export function PluggyWidget({ token, updateItem, dark, onSuccess, onError, onClose }: WidgetProps) {
  const [fechado, setFechado] = useState(false);
  if (fechado) return null;
  const fechar = () => { setFechado(true); onClose(); };
  return (
    <PluggyConnect
      connectToken={token}
      updateItem={updateItem}
      includeSandbox={process.env.NEXT_PUBLIC_PLUGGY_SANDBOX === "true"}
      language="pt"
      countries={["BR"]}
      theme={dark ? "dark" : "light"}
      onSuccess={({ item }) => { setFechado(true); onSuccess(item.id); }}
      onError={({ message }) => onError(message)}
      onClose={fechar}
      onLoadError={e => { onError(e.message); fechar(); }}
    />
  );
}
