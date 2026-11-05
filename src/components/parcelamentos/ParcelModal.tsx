"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarRange, Minus, Plus, Trash2 } from "lucide-react";
import Modal from "@/components/ui/Modal";
import MonthStepper from "@/components/ui/MonthStepper";
import { CHIP_TONES, type ChipTone } from "@/components/ui/chips";
import { STATUS_PARC, MESES } from "@/lib/constants";
import { parseBrl, brl, fmtInput, mesKey, parseMesKey, addMonths, mesLabel } from "@/lib/utils";
import { installmentValues } from "@/hooks/useParcelamentos";
import type { Parcelamento, StatusParc } from "@/types";

interface Props {
  open: boolean;
  initial: Parcelamento | null;
  onSave: (payload: Omit<Parcelamento, "id"|"user_id"|"created_at"|"updated_at">) => void;
  onDelete?: () => void;
  onClose: () => void;
}

export const SITUACAO_TONE: Record<StatusParc, ChipTone> = {
  Ativo:        "ok",
  Concluído:    "info",
  Inadimplente: "bad",
  Suspenso:     "warn",
};

export default function ParcelModal({ open, initial, onSave, onDelete, onClose }: Props) {
  const now = new Date();
  const [cliente, setCliente] = useState("");
  const [desc, setDesc] = useState("");
  const [valorTotal, setValorTotal] = useState("");
  const [numParcelas, setNumParcelas] = useState(1);
  const [parcelasPagas, setParcelasPagas] = useState(0);
  const [situacao, setSituacao] = useState<StatusParc>("Ativo");
  const [mesIni, setMesIni] = useState(MESES[now.getMonth()]);
  const [anoIni, setAnoIni] = useState(now.getFullYear());
  const valorRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const hoje = new Date();
    if (initial) {
      setCliente(initial.cliente);
      setDesc(initial.desc);
      setValorTotal(fmtInput(Number(initial.valor_total)));
      setNumParcelas(initial.num_parcelas);
      setParcelasPagas(initial.parcelas_pagas);
      setSituacao(initial.situacao);
      if (initial.mes_inicial) {
        const { mes, ano } = parseMesKey(initial.mes_inicial);
        setMesIni(mes); setAnoIni(ano);
      } else {
        setMesIni(MESES[hoje.getMonth()]); setAnoIni(hoje.getFullYear());
      }
    } else {
      setCliente(""); setDesc(""); setValorTotal("");
      setNumParcelas(1); setParcelasPagas(0); setSituacao("Ativo");
      setMesIni(MESES[hoje.getMonth()]); setAnoIni(hoje.getFullYear());
      setTimeout(() => valorRef.current?.focus(), 60);
    }
  }, [initial, open]);

  const n = Math.max(1, numParcelas || 1);
  const mesInicialKey = mesKey(mesIni, anoIni);
  const valorPorParcela = installmentValues(parseBrl(valorTotal), n)[0] ?? 0;
  const mesFimKey = addMonths(mesInicialKey, n - 1);
  const canSave = cliente.trim() !== "";

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSave) return;
    // Na edição, parcelas_pagas é derivado dos lançamentos mensais — preserva o valor atual.
    // Na criação, o campo serve como "semente" das primeiras parcelas já recebidas.
    const pg = Math.min(initial ? initial.parcelas_pagas : parcelasPagas, n);
    const sit: StatusParc = pg === n && n > 0 ? "Concluído" : situacao;
    onSave({
      cliente: cliente.trim(), desc: desc.trim(), valor_total: parseBrl(valorTotal),
      num_parcelas: n, parcelas_pagas: pg, situacao: sit, mes_inicial: mesInicialKey,
    });
  }

  return (
    <Modal open={open} onClose={onClose} title={initial ? "Editar parcelamento" : "Novo parcelamento"} width="480px">
      <form onSubmit={submit} className="space-y-5">
        {/* Valor total em destaque */}
        <label className="block">
          <span className="block text-sm font-medium text-muted mb-1.5">Valor total</span>
          <div className="flex items-baseline gap-2 border-b-2 border-border focus-within:border-accent transition-colors pb-1">
            <span className="text-2xl font-semibold text-muted">R$</span>
            <input
              ref={valorRef}
              type="text"
              inputMode="decimal"
              placeholder="0,00"
              value={valorTotal}
              onChange={e => setValorTotal(e.target.value.replace(/[^\d.,]/g, ""))}
              onBlur={() => setValorTotal(v => (v ? fmtInput(parseBrl(v)) : ""))}
              className="flex-1 min-w-0 bg-transparent outline-none text-[32px] leading-tight font-semibold tabular-nums tracking-tight placeholder:text-muted/50"
            />
          </div>
        </label>

        <label className="block">
          <span className="block text-sm font-medium text-muted mb-1.5">Cliente</span>
          <input value={cliente} onChange={e => setCliente(e.target.value)} placeholder="Ex: Maria Souza" className={FIELD} />
        </label>

        <label className="block">
          <span className="block text-sm font-medium text-muted mb-1.5">Descrição</span>
          <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Ex: Honorários do processo" className={FIELD} />
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <span className="block text-sm font-medium text-muted mb-1.5">Nº de parcelas</span>
            <Counter value={n} min={1} max={360} onChange={setNumParcelas} label="parcelas" />
          </div>
          <div>
            <span className="block text-sm font-medium text-muted mb-1.5">
              {initial ? "Recebidas" : "Já recebidas"}
            </span>
            {initial ? (
              <p className="h-12 flex items-center text-sm text-muted">
                {initial.parcelas_pagas} de {n} — marque nos lançamentos
              </p>
            ) : (
              <Counter value={Math.min(parcelasPagas, n)} min={0} max={n} onChange={setParcelasPagas} label="parcelas já recebidas" />
            )}
          </div>
        </div>

        <div>
          <span className="block text-sm font-medium text-muted mb-1.5">1ª parcela em</span>
          <div className="flex items-center justify-center rounded-xl border border-border bg-bg py-1.5">
            <MonthStepper mes={mesIni} ano={anoIni} onChange={(m, a) => { setMesIni(m); setAnoIni(a); }} />
          </div>
        </div>

        <fieldset>
          <legend className="block text-sm font-medium text-muted mb-2">Situação</legend>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 rounded-xl bg-thead p-1">
            {STATUS_PARC.map(s => {
              const active = s === situacao;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSituacao(s)}
                  aria-pressed={active}
                  className={`rounded-lg px-2 py-2 text-sm font-semibold transition ${
                    active ? CHIP_TONES[SITUACAO_TONE[s]] + " shadow-sm" : "text-muted hover:text-apptext"
                  }`}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </fieldset>

        {/* Prévia do auto-lançamento */}
        <div className="flex gap-3 rounded-xl bg-thead px-4 py-3">
          <CalendarRange size={18} className="text-brand shrink-0 mt-0.5" />
          <div className="text-sm leading-relaxed">
            <p>
              <strong className="font-semibold tabular-nums">{n}× {brl(valorPorParcela)}</strong>
              <span className="text-muted"> · {mesLabel(mesInicialKey)} a {mesLabel(mesFimKey)}</span>
            </p>
            <p className="text-xs text-muted mt-0.5">As parcelas entram automaticamente como entradas nos respectivos meses.</p>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-1">
          {onDelete && (
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
            {initial ? "Salvar" : "Adicionar"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function Counter({ value, min, max, onChange, label }: {
  value: number; min: number; max: number; onChange: (v: number) => void; label: string;
}) {
  const btn = "size-12 grid place-items-center text-muted hover:text-apptext hover:bg-thead active:scale-95 transition disabled:opacity-30 disabled:pointer-events-none";
  return (
    <div className="flex items-center rounded-xl border border-border bg-bg overflow-hidden">
      <button type="button" className={btn} onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} aria-label={`Menos ${label}`}>
        <Minus size={18} />
      </button>
      <input
        type="text"
        inputMode="numeric"
        value={value}
        onChange={e => {
          const v = parseInt(e.target.value.replace(/\D/g, "")) || 0;
          onChange(Math.min(max, v));
        }}
        onBlur={() => { if (value < min) onChange(min); }}
        aria-label={label}
        className="flex-1 min-w-0 h-12 bg-transparent text-center text-[17px] font-semibold tabular-nums outline-none"
      />
      <button type="button" className={btn} onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} aria-label={`Mais ${label}`}>
        <Plus size={18} />
      </button>
    </div>
  );
}

const FIELD =
  "w-full border border-border rounded-xl px-3.5 py-3 text-base bg-bg text-apptext outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 focus:bg-card transition placeholder:text-muted/70";
