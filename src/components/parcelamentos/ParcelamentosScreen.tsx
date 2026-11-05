"use client";

import { useState } from "react";
import { CircleCheck, HandCoins, Layers, ListChecks, Plus } from "lucide-react";
import { brl, mesLabel, addMonths } from "@/lib/utils";
import { useParcelamentos } from "@/hooks/useParcelamentos";
import { useToast } from "@/components/ui/Toast";
import ConfirmModal from "@/components/ui/ConfirmModal";
import SectionCard, { EmptyRow } from "@/components/ui/SectionCard";
import StatCard from "@/components/ui/StatCard";
import { SectionSkeleton } from "@/components/ui/Skeleton";
import ItemRow from "@/components/lancamento/ItemRow";
import ParcelModal, { SITUACAO_TONE } from "./ParcelModal";
import type { Parcelamento, StatusParc } from "@/types";

const porParcela = (p: Parcelamento) => p.valor_total / (p.num_parcelas || 1);
const restantes = (p: Parcelamento) => Math.max(0, p.num_parcelas - p.parcelas_pagas);

// Período coberto pelas parcelas (ex: "jun/26 – mar/27"); vazio se não houver mês inicial.
function periodo(p: Parcelamento): string {
  if (!p.mes_inicial) return "";
  return `${mesLabel(p.mes_inicial)} – ${mesLabel(addMonths(p.mes_inicial, p.num_parcelas - 1))}`;
}

function progressClass(s: StatusParc) {
  return s === "Inadimplente" ? "bg-danger" : s === "Concluído" ? "bg-brand" : s === "Suspenso" ? "bg-warning" : "bg-income";
}

export default function ParcelamentosScreen() {
  const { loading, parcelas, add, update, remove } = useParcelamentos();
  const { show: toast } = useToast();
  const [modalId, setModalId] = useState<string | null | "new">(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const ativosList = parcelas.filter(p => p.situacao === "Ativo");
  const aReceber = ativosList.reduce((s, p) => s + porParcela(p) * restantes(p), 0);
  const recebido = ativosList.reduce((s, p) => s + porParcela(p) * p.parcelas_pagas, 0);

  const andamento = parcelas.filter(p => p.situacao !== "Concluído");
  const concluidos = parcelas.filter(p => p.situacao === "Concluído");

  const editing = modalId && modalId !== "new" ? parcelas.find(p => p.id === modalId) ?? null : null;

  async function handleSave(payload: Omit<Parcelamento, "id"|"user_id"|"created_at"|"updated_at">) {
    const id = modalId;
    setModalId(null);
    if (id === "new") {
      await add(payload);
      toast(`Parcelamento adicionado — ${payload.num_parcelas} parcelas lançadas nos meses`);
    } else if (id) {
      await update(id, payload);
      toast("Parcelamento atualizado — parcelas sincronizadas");
    }
  }

  async function handleDelete() {
    if (!confirmId) return;
    const id = confirmId;
    setConfirmId(null);
    setModalId(null);
    await remove(id);
    toast("Parcelamento removido");
  }

  function renderRow(p: Parcelamento) {
    const rst = restantes(p);
    const pct = Math.round((p.parcelas_pagas / (p.num_parcelas || 1)) * 100);
    return (
      <ItemRow
        key={p.id}
        icon={Layers}
        tone={p.situacao === "Concluído" ? "neutral" : "income"}
        title={p.cliente}
        titlePlaceholder="Sem cliente"
        subtitle={[p.desc, periodo(p)].filter(Boolean).join(" · ") || `${p.num_parcelas}× ${brl(porParcela(p))}`}
        value={brl(Number(p.valor_total))}
        status={{ label: p.situacao, tone: SITUACAO_TONE[p.situacao] ?? "ok", done: p.situacao === "Concluído" }}
        progress={{
          pct,
          barClass: progressClass(p.situacao),
          label: rst > 0
            ? `${p.parcelas_pagas}/${p.num_parcelas} · faltam ${brl(porParcela(p) * rst)}`
            : `${p.parcelas_pagas}/${p.num_parcelas} · quitado`,
        }}
        onOpen={() => setModalId(p.id)}
        onDelete={() => setConfirmId(p.id)}
      />
    );
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <header className="bg-card border-b border-border px-4 md:px-8 h-16 flex items-center justify-between gap-2 flex-shrink-0">
        <h1 className="text-lg font-semibold text-heading">Parcelamentos</h1>
        <button
          onClick={() => setModalId("new")}
          className="hidden md:flex bg-brand text-onbrand rounded-full pl-3 pr-4 py-2 text-sm font-semibold hover:bg-brand/90 active:scale-[.98] transition items-center gap-1.5"
        >
          <Plus size={17} strokeWidth={2.5} />
          Novo parcelamento
        </button>
      </header>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="max-w-3xl mx-auto px-3 md:px-8 py-4 md:py-6 pb-28 md:pb-10 space-y-4 md:space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <StatCard icon={HandCoins}   tone="income" label="A receber" value={brl(aReceber)}
              sub={`${ativosList.length} ${ativosList.length === 1 ? "parcelamento ativo" : "parcelamentos ativos"}`} />
            <StatCard icon={CircleCheck} tone="brand"  label="Recebido"  value={brl(recebido)} sub="dos ativos" />
          </div>

          {loading ? (
            <SectionSkeleton rows={4} />
          ) : (
            <>
              <SectionCard
                icon={Layers}
                tone="income"
                title="Em andamento"
                meta={andamento.length ? `${andamento.length} ${andamento.length === 1 ? "parcelamento" : "parcelamentos"}` : "Nenhum parcelamento"}
                onAdd={() => setModalId("new")}
              >
                {andamento.length === 0 ? (
                  <EmptyRow>Nenhum parcelamento em andamento. Cadastre um para lançar as parcelas automaticamente nos meses.</EmptyRow>
                ) : (
                  <div className="divide-y divide-border">{andamento.map(renderRow)}</div>
                )}
              </SectionCard>

              {concluidos.length > 0 && (
                <SectionCard
                  icon={ListChecks}
                  tone="neutral"
                  title="Concluídos"
                  meta={`${concluidos.length} ${concluidos.length === 1 ? "parcelamento quitado" : "parcelamentos quitados"}`}
                >
                  <div className="divide-y divide-border">{concluidos.map(renderRow)}</div>
                </SectionCard>
              )}
            </>
          )}
        </div>
      </div>

      {/* Botão flutuante (celular) */}
      {!loading && (
        <button
          type="button"
          onClick={() => setModalId("new")}
          aria-label="Novo parcelamento"
          className="md:hidden fixed z-sticky right-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] size-14 grid place-items-center rounded-2xl bg-brand text-onbrand shadow-[0_8px_24px_-4px] shadow-brand/50 active:scale-95 transition"
        >
          <Plus size={26} strokeWidth={2.5} />
        </button>
      )}

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
        message="As parcelas ainda não recebidas são apagadas dos lançamentos; as já recebidas ficam como entradas normais. Esta ação não pode ser desfeita."
        onConfirm={handleDelete}
        onCancel={() => setConfirmId(null)}
      />
    </div>
  );
}
