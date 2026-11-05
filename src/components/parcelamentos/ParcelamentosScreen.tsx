"use client";

import { useState } from "react";
import { CircleCheck, HandCoins, Layers, Pencil, Plus, X } from "lucide-react";
import { brl, mesLabel, addMonths } from "@/lib/utils";
import { useParcelamentos } from "@/hooks/useParcelamentos";
import { useToast } from "@/components/ui/Toast";
import ConfirmModal from "@/components/ui/ConfirmModal";
import MobileItemCard, { CHIP_TONES, type ChipTone } from "@/components/ui/MobileItemCard";
import StatCard from "@/components/ui/StatCard";
import { SectionSkeleton } from "@/components/ui/Skeleton";
import ParcelModal from "./ParcelModal";
import type { Parcelamento, StatusParc } from "@/types";

export default function ParcelamentosScreen() {
  return <Inner />;
}

function Inner() {
  const { loading, parcelas, add, update, remove } = useParcelamentos();
  const { show: toast } = useToast();
  const [modalId, setModalId] = useState<string | null | "new">(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const aReceber = parcelas.filter(p => p.situacao === "Ativo")
    .reduce((s, p) => s + (p.valor_total / p.num_parcelas) * Math.max(0, p.num_parcelas - p.parcelas_pagas), 0);
  const recebido = parcelas.filter(p => p.situacao === "Ativo")
    .reduce((s, p) => s + (p.valor_total / p.num_parcelas) * p.parcelas_pagas, 0);
  const ativos = parcelas.filter(p => p.situacao === "Ativo").length;

  const editing = modalId && modalId !== "new"
    ? parcelas.find(p => p.id === modalId) ?? null
    : null;

  async function handleSave(payload: Omit<Parcelamento, "id"|"user_id"|"created_at"|"updated_at">) {
    if (modalId === "new") {
      await add(payload);
      toast(`Parcelamento adicionado — ${payload.num_parcelas} parcelas lançadas nos meses`);
    } else if (modalId) {
      await update(modalId, payload);
      toast("Parcelamento atualizado — parcelas sincronizadas");
    }
    setModalId(null);
  }

  async function handleDelete() {
    if (!confirmId) return;
    await remove(confirmId);
    setConfirmId(null);
    setModalId(null);
    toast("Removido");
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Header */}
      <header className="bg-card border-b border-border px-4 md:px-8 h-16 flex items-center justify-between gap-2 flex-shrink-0">
        <h1 className="text-lg font-semibold text-heading">Parcelamentos</h1>
        <button
          onClick={() => setModalId("new")}
          className="bg-brand text-onbrand rounded-full pl-3 pr-4 py-2 text-sm font-semibold hover:bg-brand/90 active:scale-[.98] transition flex items-center gap-1.5"
        >
          <Plus size={17} strokeWidth={2.5} />
          Novo
        </button>
      </header>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
       <div className="max-w-6xl mx-auto px-3 md:px-8 py-4 md:py-6 pb-10 space-y-4">
        {/* Resumo */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <StatCard icon={HandCoins}   tone="income"  label="A receber" value={brl(aReceber)} />
          <StatCard icon={CircleCheck} tone="brand"   label="Recebido"  value={brl(recebido)} />
          <div className="col-span-2 md:col-span-1">
            <StatCard icon={Layers}    tone="neutral" label="Parcelamentos ativos" value={String(ativos)} />
          </div>
        </div>

        {loading ? (
          <SectionSkeleton rows={4} />
        ) : (
          <>
            {/* Desktop: tabela */}
            <div className="hidden md:block bg-card border border-border rounded-2xl overflow-hidden">
              <div className={`grid ${PARC_COLS} gap-2 px-5 py-2.5 bg-thead/60 border-b border-border`}>
                {["Cliente","Total","Parcela","Recebido","A receber","Situação","Progresso",""].map((h,i) => (
                  <span key={i} className={`text-xs font-medium text-muted ${i >= 1 && i <= 4 ? "text-right" : ""}`}>{h}</span>
                ))}
              </div>
              {parcelas.length === 0 ? (
                <div className="px-8 py-10 text-center text-muted text-sm">
                  Nenhum parcelamento ainda. Use “Novo” para cadastrar o primeiro.
                </div>
              ) : parcelas.map(p => (
                <ParcelRow
                  key={p.id}
                  p={p}
                  onEdit={() => setModalId(p.id)}
                  onDelete={() => setConfirmId(p.id)}
                />
              ))}
            </div>

            {/* Mobile: cards expansíveis com swipe para excluir */}
            <div className="md:hidden bg-card border border-border rounded-2xl overflow-hidden divide-y divide-border">
              {parcelas.length === 0 ? (
                <div className="px-6 py-10 text-center text-muted text-sm">
                  Nenhum parcelamento ainda. Toque em “Novo” para cadastrar o primeiro.
                </div>
              ) : parcelas.map(p => (
                <ParcelCard
                  key={p.id}
                  p={p}
                  onEdit={() => setModalId(p.id)}
                  onDelete={() => setConfirmId(p.id)}
                />
              ))}
            </div>
          </>
        )}
       </div>
      </div>

      <ParcelModal
        open={modalId !== null}
        initial={editing}
        onSave={handleSave}
        onDelete={editing ? () => setConfirmId(editing.id) : undefined}
        onClose={() => setModalId(null)}
      />

      <ConfirmModal
        open={confirmId !== null}
        title="Remover parcelamento?"
        message="Esta ação não pode ser desfeita."
        onConfirm={handleDelete}
        onCancel={() => setConfirmId(null)}
      />
    </div>
  );
}

const PARC_COLS = "grid-cols-[2fr_1fr_.7fr_1fr_1fr_.9fr_1fr_32px]";

const BADGE_TONE: Record<StatusParc, ChipTone> = {
  Ativo:        "ok",
  Concluído:    "info",
  Inadimplente: "bad",
  Suspenso:     "warn",
};

function progressClass(s: StatusParc) {
  return s === "Inadimplente" ? "bg-danger" : s === "Concluído" ? "bg-brand" : s === "Suspenso" ? "bg-warning" : "bg-income";
}

// Período coberto pelas parcelas (ex: "jun/26 – mar/27"); vazio se não houver mês inicial.
function periodo(p: Parcelamento): string {
  if (!p.mes_inicial) return "";
  return `${mesLabel(p.mes_inicial)} – ${mesLabel(addMonths(p.mes_inicial, p.num_parcelas - 1))}`;
}

function ParcelRow({ p, onEdit, onDelete }: {
  p: Parcelamento; onEdit: () => void; onDelete: () => void;
}) {
  const vp = p.valor_total / (p.num_parcelas || 1);
  const rst = Math.max(0, p.num_parcelas - p.parcelas_pagas);
  const pct = Math.round(p.parcelas_pagas / (p.num_parcelas || 1) * 100);

  return (
    <div
      className={`group grid ${PARC_COLS} gap-2 px-5 py-3 border-b border-border last:border-0 hover:bg-rowhover cursor-pointer items-center transition-colors`}
      onClick={onEdit}
    >
      <span className="min-w-0">
        <span className="block text-sm font-medium truncate">{p.cliente}</span>
        <span className="block text-xs text-muted truncate">
          {[p.desc, periodo(p)].filter(Boolean).join(" · ")}
        </span>
      </span>
      <span className="text-sm tabular-nums text-right">{brl(p.valor_total)}</span>
      <span className="text-sm tabular-nums text-right text-muted">{brl(vp)}</span>
      <span className="text-sm tabular-nums text-right">{brl(vp * p.parcelas_pagas)}</span>
      <span className="text-sm tabular-nums text-right font-medium">{brl(vp * rst)}</span>
      <span>
        <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${CHIP_TONES[BADGE_TONE[p.situacao] ?? "ok"]}`}>
          {p.situacao}
        </span>
      </span>
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-thead rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${progressClass(p.situacao)}`} style={{ width: `${pct}%` }} />
        </div>
        <span className="text-xs tabular-nums text-muted w-9 text-right">{p.parcelas_pagas}/{p.num_parcelas}</span>
      </div>
      <button
        onClick={e => { e.stopPropagation(); onDelete(); }}
        aria-label="Remover parcelamento"
        className="size-8 grid place-items-center rounded-lg text-muted opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:text-danger hover:bg-danger/10 transition"
      ><X size={16} /></button>
    </div>
  );
}

function ParcelCard({ p, onEdit, onDelete }: {
  p: Parcelamento; onEdit: () => void; onDelete: () => void;
}) {
  const vp = p.valor_total / (p.num_parcelas || 1);
  const rst = Math.max(0, p.num_parcelas - p.parcelas_pagas);
  const pct = Math.round(p.parcelas_pagas / (p.num_parcelas || 1) * 100);

  return (
    <MobileItemCard
      title={p.cliente}
      titlePlaceholder="Sem cliente"
      subtitle={[p.desc, periodo(p)].filter(Boolean).join(" · ") || `${p.parcelas_pagas}/${p.num_parcelas} parcelas`}
      value={brl(p.valor_total)}
      chip={p.situacao}
      chipTone={BADGE_TONE[p.situacao] ?? "ok"}
      onDelete={onDelete}
    >
      <div className="flex items-center gap-2.5">
        <div className="flex-1 h-1.5 bg-thead rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${progressClass(p.situacao)}`} style={{ width: `${pct}%` }} />
        </div>
        <span className="tabular-nums text-xs text-muted">{p.parcelas_pagas}/{p.num_parcelas} pagas</span>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
        <CardStat label="Por parcela" value={brl(vp)} />
        <CardStat label="Restantes" value={String(rst)} />
        <CardStat label="Recebido" value={brl(vp * p.parcelas_pagas)} />
        <CardStat label="A receber" value={brl(vp * rst)} />
      </div>
      <button
        onClick={onEdit}
        className="w-full flex items-center justify-center gap-2 bg-brand text-onbrand rounded-xl py-2.5 text-sm font-semibold active:opacity-80 transition-opacity"
      >
        <Pencil size={15} />
        Editar parcelamento
      </button>
    </MobileItemCard>
  );
}

function CardStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[13px] text-muted">{label}</span>
      <span className="tabular-nums text-sm font-semibold">{value}</span>
    </div>
  );
}
