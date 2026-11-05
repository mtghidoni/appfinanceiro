"use client";

import { useState } from "react";
import {
  ChevronRight, House, Info, Link2, PiggyBank, Plus, ShoppingBag, TrendingUp, type LucideIcon,
} from "lucide-react";
import { MESES } from "@/lib/constants";
import { brl } from "@/lib/utils";
import { iconFor } from "@/lib/icons";
import { useLancamento } from "@/hooks/useLancamento";
import { useToast } from "@/components/ui/Toast";
import Modal from "@/components/ui/Modal";
import MonthStepper from "@/components/ui/MonthStepper";
import SectionCard, { EmptyRow, TONE_CHIP } from "@/components/ui/SectionCard";
import { Skeleton, SectionSkeleton } from "@/components/ui/Skeleton";
import type { Entrada, GastoFixo, GastoVariado, Movimentacao } from "@/types";
import MonthSummary from "./MonthSummary";
import ItemRow from "./ItemRow";
import ItemEditor, { type Draft } from "./ItemEditor";
import { KINDS, nextStatus, statusLabel, statusTone, type Kind } from "./kinds";

type AnyRow = GastoFixo | GastoVariado | Entrada | Movimentacao;

const sum = (rows: { valor: number }[]) => rows.reduce((s, it) => s + Number(it.valor), 0);

const SECTION: Record<Kind, { icon: LucideIcon; title: string; empty: string }> = {
  entrada: { icon: TrendingUp,  title: "Entradas",                 empty: "Nenhuma entrada neste mês." },
  fixo:    { icon: House,       title: "Gastos fixos",             empty: "Nenhum gasto fixo neste mês." },
  variado: { icon: ShoppingBag, title: "Gastos variados",          empty: "Nenhum gasto variado neste mês." },
  mov:     { icon: PiggyBank,   title: "Movimentações de reserva", empty: "Nenhuma movimentação neste mês." },
};

// --- Conversões entre as linhas do banco e o rascunho do editor ---
function toDraft(kind: Kind, r: AnyRow): Draft {
  if (kind === "entrada") {
    const e = r as Entrada;
    return { desc: e.desc, option: e.tipo, valor: Number(e.valor), status: e.recebido, parcela: e.parcela ?? "" };
  }
  if (kind === "mov") {
    const m = r as Movimentacao;
    return { desc: m.desc, option: m.tipo, valor: Number(m.valor) };
  }
  const g = r as GastoFixo;
  return { desc: g.desc, option: g.cat, valor: Number(g.valor), status: g.pago };
}

function fromDraft(kind: Kind, d: Draft, linked: boolean): Record<string, unknown> {
  if (kind === "entrada") {
    if (linked) return { recebido: d.status };
    return { desc: d.desc, tipo: d.option, valor: d.valor, recebido: d.status, parcela: d.parcela ?? "" };
  }
  if (kind === "mov") return { desc: d.desc, tipo: d.option, valor: d.valor };
  return { desc: d.desc, cat: d.option, valor: d.valor, pago: d.status };
}

function optionOf(kind: Kind, r: AnyRow): string {
  return kind === "entrada" || kind === "mov" ? (r as Entrada).tipo : (r as GastoFixo).cat;
}

function statusOf(kind: Kind, r: AnyRow): string | undefined {
  if (kind === "entrada") return (r as Entrada).recebido;
  if (kind === "mov") return undefined;
  return (r as GastoFixo).pago;
}

export default function LancamentoScreen() {
  const now = new Date();
  const [mes, setMes] = useState(MESES[now.getMonth()]);
  const [ano, setAno] = useState(now.getFullYear());
  const [editor, setEditor] = useState<{ kind: Kind; id: string | null } | null>(null);
  const [chooser, setChooser] = useState(false);
  const { show: toast } = useToast();

  const { loading, fixos, variados, entradas, movs, api } = useLancamento(mes, ano);
  const rowsOf: Record<Kind, AnyRow[]> = { entrada: entradas, fixo: fixos, variado: variados, mov: movs };

  const gastos = [...fixos, ...variados];
  const totalReceita = sum(entradas);
  const totalRecebido = sum(entradas.filter(e => e.recebido === "OK"));
  const totalGastos = sum(gastos);
  const totalPago = sum(gastos.filter(g => g.pago === "OK"));

  const editing = editor?.id ? rowsOf[editor.kind].find(r => r.id === editor.id) ?? null : null;
  const editingLinked = editor?.kind === "entrada" && !!(editing as Entrada | null)?.parcelamento_id;

  function openNew(kind: Kind) {
    setChooser(false);
    setEditor({ kind, id: null });
  }

  async function handleSave(d: Draft) {
    if (!editor) return;
    const { kind, id } = editor;
    setEditor(null);
    const patch = fromDraft(kind, d, editingLinked);
    if (id) await api[kind].save(id, patch as never);
    else {
      await api[kind].create(patch as never);
      toast(`${capitalize(KINDS[kind].label)} adicionada`.replace("Gasto fixo adicionada", "Gasto fixo adicionado").replace("Gasto variado adicionada", "Gasto variado adicionado"));
    }
  }

  async function handleDelete(kind: Kind, id: string) {
    setEditor(null);
    const removed = await api[kind].remove(id);
    if (!removed) return;
    const nome = (removed as { desc?: string }).desc || KINDS[kind].label;
    toast(`“${nome}” excluído`, {
      action: { label: "Desfazer", onClick: () => { api[kind].restore(removed as never); } },
    });
  }

  function toggleStatus(kind: Kind, r: AnyRow) {
    const field = kind === "entrada" ? "recebido" : "pago";
    api[kind].save(r.id, { [field]: nextStatus(statusOf(kind, r) ?? "") } as never);
  }

  function renderSection(kind: Kind) {
    const rows = rowsOf[kind];
    const s = SECTION[kind];
    const tone = KINDS[kind].tone;
    const done = rows.filter(r => statusOf(kind, r) === "OK").length;
    const meta =
      kind === "mov" ? (
        <span className="inline-flex items-center gap-1"><Info size={12} className="shrink-0" />Não entram no cálculo do saldo do mês</span>
      ) : rows.length === 0 ? "Nenhum item"
        : `${done} de ${rows.length} ${kind === "entrada" ? "recebidas" : "pagos"}`;

    return (
      <SectionCard
        key={kind}
        icon={s.icon}
        tone={tone}
        title={s.title}
        meta={meta}
        total={kind === "mov" ? undefined : brl(sum(rows))}
        onAdd={() => openNew(kind)}
      >
        {rows.length === 0 ? (
          <EmptyRow>{s.empty}</EmptyRow>
        ) : (
          <div className="divide-y divide-border">
            {rows.map(r => {
              const linked = kind === "entrada" && !!(r as Entrada).parcelamento_id;
              const option = optionOf(kind, r);
              const st = statusOf(kind, r);
              const parcela = kind === "entrada" ? (r as Entrada).parcela : "";
              return (
                <ItemRow
                  key={r.id}
                  icon={iconFor(option)}
                  tone={tone}
                  title={r.desc}
                  titlePlaceholder={kind === "entrada" ? "Sem cliente / descrição" : "Sem descrição"}
                  subtitle={parcela ? `${option} · ${parcela}` : option}
                  value={brl(Number(r.valor))}
                  muted={Number(r.valor) === 0}
                  badge={linked ? <Link2 size={14} className="text-brand shrink-0" aria-label="Gerado por parcelamento" /> : undefined}
                  status={st ? {
                    label: statusLabel(kind, st),
                    tone: statusTone(st),
                    done: st === "OK",
                    hint: st === "OK" ? "Toque para marcar como pendente" : `Toque para marcar como ${statusLabel(kind, "OK").toLowerCase()}`,
                    onToggle: () => toggleStatus(kind, r),
                  } : undefined}
                  onOpen={() => setEditor({ kind, id: r.id })}
                  onDelete={linked ? undefined : () => handleDelete(kind, r.id)}
                />
              );
            })}
          </div>
        )}
      </SectionCard>
    );
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Header */}
      <header className="bg-card border-b border-border px-3 md:px-8 h-16 flex items-center justify-center sm:justify-between gap-2 flex-shrink-0">
        <h1 className="hidden sm:block text-lg font-semibold text-heading">Lançamentos</h1>
        <MonthStepper mes={mes} ano={ano} onChange={(m, a) => { setMes(m); setAno(a); }} />
      </header>

      {/* Body */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="max-w-3xl mx-auto px-3 md:px-8 py-4 md:py-6 pb-28 md:pb-10 space-y-4 md:space-y-5">
          {loading ? (
            <>
              <div className="bg-card border border-border rounded-2xl p-5 md:p-6 grid gap-6 md:grid-cols-2">
                <div className="space-y-3">
                  <Skeleton className="h-3.5 w-24" />
                  <Skeleton className="h-10 w-56" />
                  <Skeleton className="h-3.5 w-64" />
                </div>
                <div className="space-y-5">
                  <Skeleton className="h-2.5 w-full" />
                  <Skeleton className="h-2.5 w-full" />
                </div>
              </div>
              <SectionSkeleton rows={5} />
              <SectionSkeleton rows={3} />
            </>
          ) : (
            <>
              <MonthSummary receita={totalReceita} recebido={totalRecebido} gastos={totalGastos} pago={totalPago} />
              {(["entrada", "fixo", "variado", "mov"] as Kind[]).map(renderSection)}
            </>
          )}
        </div>
      </div>

      {/* Botão flutuante (celular) */}
      {!loading && (
        <button
          type="button"
          onClick={() => setChooser(true)}
          aria-label="Adicionar lançamento"
          className="md:hidden fixed z-sticky right-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] size-14 grid place-items-center rounded-2xl bg-brand text-onbrand shadow-[0_8px_24px_-4px] shadow-brand/50 active:scale-95 transition"
        >
          <Plus size={26} strokeWidth={2.5} />
        </button>
      )}

      {/* Escolha do tipo de lançamento */}
      <Modal open={chooser} onClose={() => setChooser(false)} title="Adicionar" width="400px">
        <div className="space-y-1 -mx-2">
          {(["entrada", "fixo", "variado", "mov"] as Kind[]).map(k => {
            const Icon = SECTION[k].icon;
            return (
              <button
                key={k}
                type="button"
                onClick={() => openNew(k)}
                className="w-full flex items-center gap-3 px-2 py-2.5 rounded-xl hover:bg-thead active:bg-thead transition-colors text-left"
              >
                <span className={`size-10 grid place-items-center rounded-xl ${TONE_CHIP[KINDS[k].tone]}`}>
                  <Icon size={19} />
                </span>
                <span className="flex-1 text-[15px] font-medium">{capitalize(KINDS[k].label)}</span>
                <ChevronRight size={18} className="text-muted" />
              </button>
            );
          })}
        </div>
      </Modal>

      {editor && (
        <ItemEditor
          open
          kind={editor.kind}
          initial={editing ? toDraft(editor.kind, editing) : null}
          linked={editingLinked}
          onSave={handleSave}
          onDelete={editing ? () => handleDelete(editor.kind, editing.id) : undefined}
          onClose={() => setEditor(null)}
        />
      )}
    </div>
  );
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
