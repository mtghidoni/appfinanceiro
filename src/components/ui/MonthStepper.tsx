"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { MESES } from "@/lib/constants";

interface Props {
  mes: string;
  ano: number;
  onChange: (mes: string, ano: number) => void;
}

/** Navegação entre meses no formato ‹ Novembro 2026 ›, com atalho para o mês atual. */
export default function MonthStepper({ mes, ano, onChange }: Props) {
  const idx = MESES.indexOf(mes);
  const now = new Date();
  const isCurrent = idx === now.getMonth() && ano === now.getFullYear();

  function step(delta: number) {
    const total = ano * 12 + idx + delta;
    onChange(MESES[((total % 12) + 12) % 12], Math.floor(total / 12));
  }

  const btn =
    "size-9 grid place-items-center rounded-full text-muted hover:text-apptext hover:bg-thead active:scale-95 transition";

  return (
    <div className="flex items-center gap-1">
      <button type="button" onClick={() => step(-1)} className={btn} aria-label="Mês anterior">
        <ChevronLeft size={18} strokeWidth={2.25} />
      </button>
      <div className="min-w-[9.5rem] text-center leading-tight" aria-live="polite">
        <span className="text-[15px] font-semibold text-heading">{mes}</span>{" "}
        <span className="text-[15px] font-medium text-muted tabular-nums">{ano}</span>
      </div>
      <button type="button" onClick={() => step(1)} className={btn} aria-label="Próximo mês">
        <ChevronRight size={18} strokeWidth={2.25} />
      </button>
      {!isCurrent && (
        <button
          type="button"
          onClick={() => onChange(MESES[now.getMonth()], now.getFullYear())}
          className="ml-1 rounded-full border border-border px-3 py-1 text-xs font-medium text-brand hover:bg-brand/10 transition-colors"
        >
          Hoje
        </button>
      )}
    </div>
  );
}
