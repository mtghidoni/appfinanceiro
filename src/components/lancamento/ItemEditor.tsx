"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronRight, Layers, Link2, Trash2 } from "lucide-react";
import Modal from "@/components/ui/Modal";
import { TIPO_PARCELAMENTO } from "@/lib/constants";
import { brl, fmtInput, parseBrl } from "@/lib/utils";
import { iconFor } from "@/lib/icons";
import { CHIP_TONES } from "@/components/ui/chips";
import { KINDS, statusLabel, statusTone, type Kind } from "./kinds";

/** Campos editáveis comuns às quatro tabelas mensais. */
export interface Draft {
  desc: string;
  option: string;    // cat (gastos) ou tipo (entradas/movimentações)
  valor: number;
  status?: string;   // pago (gastos) ou recebido (entradas)
  parcela?: string;  // apenas entradas de parcelamento
}

interface Props {
  open: boolean;
  kind: Kind;
  initial: Draft | null;   // null = novo item
  linked?: boolean;        // entrada gerada por parcelamento: só a situação é editável
  onSave: (d: Draft) => void;
  onDelete?: () => void;
  onClose: () => void;
}

export default function ItemEditor({ open, kind, initial, linked = false, onSave, onDelete, onClose }: Props) {
  const meta = KINDS[kind];
  const isNew = !initial;
  const [desc, setDesc] = useState("");
  const [option, setOption] = useState<string>(meta.options[0]);
  const [valor, setValor] = useState("");
  const [status, setStatus] = useState<string | undefined>(meta.statuses?.[1]);
  const valorRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setDesc(initial?.desc ?? "");
    setOption(initial?.option ?? meta.options[0]);
    setValor(initial ? fmtInput(initial.valor) : "");
    setStatus(initial?.status ?? meta.statuses?.[1]); // novo item começa "Pendente"
    // Novo item: foca o valor para abrir o teclado numérico de imediato
    if (!initial) setTimeout(() => valorRef.current?.focus(), 60);
  }, [open, initial, kind]); // eslint-disable-line react-hooks/exhaustive-deps

  // Entradas antigas do tipo "Parcelamento cliente" (lançadas à mão) mantêm o tipo visível
  // para não perder a seleção ao editar; novas entradas não oferecem mais essa opção.
  const options = initial?.option && !meta.options.includes(initial.option)
    ? [...meta.options, initial.option]
    : meta.options;
  const canSave = linked || desc.trim() !== "" || parseBrl(valor) > 0;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSave) return;
    onSave({
      desc: desc.trim(),
      option,
      valor: parseBrl(valor),
      status,
      // O rótulo "5/10" só é mantido enquanto o tipo continuar sendo parcelamento.
      parcela: option === TIPO_PARCELAMENTO ? initial?.parcela ?? "" : "",
    });
  }

  const title = isNew ? `Nova ${meta.label}`.replace("Nova gasto", "Novo gasto") : `Editar ${meta.label}`;

  return (
    <Modal open={open} onClose={onClose} title={title} width="480px">
      <form onSubmit={submit} className="space-y-5">
        {linked ? (
          <div className="space-y-3">
            <div className="flex gap-2.5 text-sm text-muted bg-thead rounded-xl px-3.5 py-3 leading-relaxed">
              <Link2 size={16} className="text-brand shrink-0 mt-0.5" />
              <span>Parcela gerada pelo parcelamento. Valor, descrição e nº de parcelas são alterados na aba <strong className="text-apptext font-semibold">Parcelamentos</strong>.</span>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-[15px] font-medium truncate">{initial?.desc}</span>
              <span className="text-xl font-semibold tabular-nums">{brl(initial?.valor ?? 0)}</span>
            </div>
            {initial?.parcela && <p className="text-sm text-muted -mt-2">Parcela {initial.parcela}</p>}
          </div>
        ) : (
          <>
            {/* Valor em destaque */}
            <label className="block">
              <span className="block text-sm font-medium text-muted mb-1.5">Valor</span>
              <div className="flex items-baseline gap-2 border-b-2 border-border focus-within:border-accent transition-colors pb-1">
                <span className="text-2xl font-semibold text-muted">R$</span>
                <input
                  ref={valorRef}
                  type="text"
                  inputMode="decimal"
                  enterKeyHint="next"
                  placeholder="0,00"
                  value={valor}
                  onChange={e => setValor(e.target.value.replace(/[^\d.,]/g, ""))}
                  onBlur={() => setValor(v => (v ? fmtInput(parseBrl(v)) : ""))}
                  className="flex-1 min-w-0 bg-transparent outline-none text-[32px] leading-tight font-semibold tabular-nums tracking-tight placeholder:text-muted/50"
                />
              </div>
            </label>

            <label className="block">
              <span className="block text-sm font-medium text-muted mb-1.5">
                {kind === "entrada" ? "Cliente / descrição" : "Descrição"}
              </span>
              <input
                type="text"
                value={desc}
                onChange={e => setDesc(e.target.value)}
                placeholder={kind === "entrada" ? "Ex: Silva & Associados" : "Ex: Mercado"}
                className={FIELD}
              />
            </label>

            <fieldset>
              <legend className="block text-sm font-medium text-muted mb-2">{meta.optionLabel}</legend>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {options.map(o => {
                  const Icon = iconFor(o);
                  const active = o === option;
                  return (
                    <button
                      key={o}
                      type="button"
                      onClick={() => setOption(o)}
                      aria-pressed={active}
                      className={`flex flex-col items-center gap-1.5 rounded-xl border px-1.5 py-2.5 text-xs font-medium text-center leading-tight transition ${
                        active
                          ? "border-brand bg-brand/10 text-brand"
                          : "border-border text-muted hover:text-apptext hover:bg-thead"
                      }`}
                    >
                      <Icon size={18} />
                      <span className="line-clamp-2">{o}</span>
                    </button>
                  );
                })}
              </div>
            </fieldset>

            {kind === "entrada" && (
              <Link
                href="/parcelamentos"
                className="flex items-center gap-2.5 rounded-xl bg-thead px-3.5 py-3 text-sm text-muted hover:text-apptext transition-colors"
              >
                <Layers size={16} className="text-brand shrink-0" />
                <span className="flex-1">Cliente vai pagar em parcelas? Cadastre em <strong className="text-apptext font-semibold">Parcelamentos</strong> — as parcelas entram sozinhas em cada mês.</span>
                <ChevronRight size={16} className="shrink-0" />
              </Link>
            )}
          </>
        )}

        {meta.statuses && (
          <fieldset>
            <legend className="block text-sm font-medium text-muted mb-2">Situação</legend>
            <div className="grid grid-cols-3 gap-1 rounded-xl bg-thead p-1">
              {meta.statuses.map(s => {
                const active = s === status;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatus(s)}
                    aria-pressed={active}
                    className={`rounded-lg px-2 py-2 text-sm font-semibold transition ${
                      active ? CHIP_TONES[statusTone(s)] + " shadow-sm" : "text-muted hover:text-apptext"
                    }`}
                  >
                    {statusLabel(kind, s)}
                  </button>
                );
              })}
            </div>
          </fieldset>
        )}

        <div className="flex items-center gap-2 pt-1">
          {onDelete && !linked && (
            <button
              type="button"
              onClick={onDelete}
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-2.5 text-sm font-semibold text-danger hover:bg-danger/10 transition-colors"
            >
              <Trash2 size={16} />
              Excluir
            </button>
          )}
          <button
            type="submit"
            disabled={!canSave}
            className="ml-auto flex-1 sm:flex-none rounded-full bg-brand text-onbrand px-6 py-3 sm:py-2.5 text-[15px] sm:text-sm font-semibold hover:bg-brand/90 active:scale-[.98] transition disabled:opacity-40 disabled:pointer-events-none"
          >
            {isNew ? "Adicionar" : "Salvar"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

const FIELD =
  "w-full border border-border rounded-xl px-3.5 py-3 text-base bg-bg text-apptext outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 focus:bg-card transition placeholder:text-muted/70";
