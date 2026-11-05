"use client";

import { useRef, useState } from "react";
import { ChevronDown, Trash2 } from "lucide-react";

export type ChipTone = "ok" | "warn" | "bad" | "info" | "neutral";

export const CHIP_TONES: Record<ChipTone, string> = {
  ok:      "bg-success-soft text-success-ink",
  warn:    "bg-warning-soft text-warning-ink",
  bad:     "bg-danger-soft text-danger-ink",
  info:    "bg-info-soft text-info-ink",
  neutral: "bg-thead text-muted",
};

export function toneForPago(s: string): ChipTone {
  return s === "OK" ? "ok" : s === "Pendente" ? "warn" : "bad";
}

// Classes compartilhadas dos campos do editor expandido (iguais às das tabelas desktop)
export const FIELD_CLS = "border border-border rounded-lg px-3 py-2.5 font-sans text-[15px] bg-bg text-apptext w-full outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 focus:bg-card transition";
export const FIELD_MONO_CLS = "border border-border rounded-lg px-3 py-2.5 tabular-nums text-[15px] text-right bg-bg text-apptext w-full outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 focus:bg-card transition";

export function CardField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-muted mb-1.5">{label}</span>
      {children}
    </label>
  );
}

interface Props {
  title: string;
  titlePlaceholder?: string;
  subtitle?: string;
  value: string;
  chip?: string;
  chipTone?: ChipTone;
  onChipTap?: () => void;
  onDelete: () => void;
  disableDelete?: boolean; // desativa o swipe-para-excluir (ex: parcelas geradas)
  badge?: React.ReactNode;  // marcador opcional ao lado do título (ex: ícone de vínculo)
  children: React.ReactNode; // editor exibido ao expandir
}

const REVEAL_W = 88; // largura da área "Excluir" revelada pelo swipe

/**
 * Card de item para telas pequenas: toque expande o editor,
 * swipe para a esquerda revela o botão de excluir.
 */
export default function MobileItemCard({
  title, titlePlaceholder = "Sem descrição", subtitle, value,
  chip, chipTone = "neutral", onChipTap, onDelete, disableDelete = false, badge, children,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [offset, setOffset] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [dragging, setDragging] = useState(false);
  const offsetRef = useRef(0); // espelho síncrono de `offset` — o state pode estar defasado no touchend
  const start = useRef<{ x: number; y: number; base: number } | null>(null);
  const axis = useRef<"h" | "v" | null>(null);
  const moved = useRef(false);

  function setOffsetSync(v: number) {
    offsetRef.current = v;
    setOffset(v);
  }

  function onTouchStart(e: React.TouchEvent) {
    const t = e.touches[0];
    start.current = { x: t.clientX, y: t.clientY, base: revealed ? -REVEAL_W : 0 };
    axis.current = null;
    moved.current = false;
    setDragging(true);
  }

  function onTouchMove(e: React.TouchEvent) {
    if (!start.current) return;
    const t = e.touches[0];
    const dx = t.clientX - start.current.x;
    const dy = t.clientY - start.current.y;
    // Decide o eixo do gesto uma única vez, para não roubar o scroll vertical
    if (!axis.current) {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
      axis.current = Math.abs(dx) > Math.abs(dy) ? "h" : "v";
    }
    if (axis.current === "v") return;
    moved.current = true;
    if (disableDelete) return; // sem swipe-para-excluir neste card
    setOffsetSync(Math.min(0, Math.max(-REVEAL_W, start.current.base + dx)));
  }

  function onTouchEnd() {
    setDragging(false);
    if (axis.current === "h") {
      const open = offsetRef.current < -REVEAL_W / 2;
      setRevealed(open);
      setOffsetSync(open ? -REVEAL_W : 0);
    }
    start.current = null;
    axis.current = null;
  }

  function handleTap() {
    if (moved.current) { moved.current = false; return; }
    if (revealed) {
      setRevealed(false);
      setOffset(0);
      return;
    }
    setExpanded(x => !x);
  }

  return (
    <div className="relative overflow-hidden bg-card">
      {/* Área de excluir, revelada pelo swipe */}
      {!disableDelete && (
        <button
          onClick={onDelete}
          tabIndex={revealed ? 0 : -1}
          aria-hidden={!revealed}
          className="absolute inset-y-0 right-0 flex flex-col items-center justify-center gap-1 bg-danger text-white text-xs font-semibold"
          style={{ width: REVEAL_W }}
        >
          <Trash2 size={18} />
          Excluir
        </button>
      )}

      {/* Conteúdo deslizante */}
      <div
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{ transform: `translateX(${offset}px)`, touchAction: "pan-y" }}
        className={`relative bg-card ${dragging ? "" : "transition-transform duration-200"}`}
      >
        <div className="flex items-center gap-3 px-4 py-3.5 active:bg-rowhover transition-colors" onClick={handleTap}>
          <div className="flex-1 min-w-0">
            <div className={`text-[15px] font-medium truncate flex items-center gap-1.5 ${title ? "text-apptext" : "text-muted font-normal italic"}`}>
              {badge}
              <span className="truncate">{title || titlePlaceholder}</span>
            </div>
            {subtitle && <div className="text-[13px] text-muted truncate mt-0.5">{subtitle}</div>}
          </div>
          {chip && (
            onChipTap ? (
              <button
                onClick={e => { e.stopPropagation(); onChipTap(); }}
                className={`rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${CHIP_TONES[chipTone]}`}
              >
                {chip}
              </button>
            ) : (
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${CHIP_TONES[chipTone]}`}>
                {chip}
              </span>
            )
          )}
          <span className="tabular-nums text-[15px] font-semibold whitespace-nowrap">{value}</span>
          <ChevronDown size={16} className={`text-muted shrink-0 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} />
        </div>

        {expanded && (
          <div className="px-4 pb-4 pt-3 border-t border-border bg-thead/40 space-y-3">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}
