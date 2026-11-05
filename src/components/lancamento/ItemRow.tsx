"use client";

import { useRef, useState } from "react";
import { Check, Trash2, type LucideIcon } from "lucide-react";
import { CHIP_TONES, type ChipTone } from "@/components/ui/chips";
import { TONE_CHIP, type Tone } from "@/components/ui/SectionCard";

interface Props {
  icon: LucideIcon;
  tone: Tone;
  title: string;
  titlePlaceholder?: string;
  subtitle?: string;
  value: string;
  muted?: boolean;          // valor zerado / item sem efeito
  badge?: React.ReactNode;  // marcador ao lado do título
  status?: { label: string; tone: ChipTone; done: boolean; onToggle?: () => void; hint?: string };
  progress?: { pct: number; barClass: string; label: string }; // barra fina sob o subtítulo
  onOpen: () => void;
  onDelete?: () => void;    // ausente: sem swipe-para-excluir
}

const REVEAL_W = 88;

/**
 * Linha de lista em modo leitura. Toque/clique abre o editor; no celular,
 * deslizar para a esquerda revela "Excluir". A pílula de status alterna com um toque.
 */
export default function ItemRow({
  icon: Icon, tone, title, titlePlaceholder = "Sem descrição", subtitle, value, muted,
  badge, status, progress, onOpen, onDelete,
}: Props) {
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const offsetRef = useRef(0);
  const start = useRef<{ x: number; y: number; base: number } | null>(null);
  const axis = useRef<"h" | "v" | null>(null);
  const moved = useRef(false);
  const revealed = offset <= -REVEAL_W;

  function setOff(v: number) { offsetRef.current = v; setOffset(v); }

  function onTouchStart(e: React.TouchEvent) {
    const t = e.touches[0];
    start.current = { x: t.clientX, y: t.clientY, base: offsetRef.current };
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
    if (!onDelete) return;
    setOff(Math.min(0, Math.max(-REVEAL_W, start.current.base + dx)));
  }

  function onTouchEnd() {
    setDragging(false);
    if (axis.current === "h") setOff(offsetRef.current < -REVEAL_W / 2 ? -REVEAL_W : 0);
    start.current = null;
    axis.current = null;
  }

  function handleClick() {
    if (moved.current) { moved.current = false; return; }
    if (offsetRef.current !== 0) { setOff(0); return; }
    onOpen();
  }

  return (
    <div className="relative overflow-hidden bg-card">
      {onDelete && (
        <button
          onClick={() => { setOff(0); onDelete(); }}
          tabIndex={revealed ? 0 : -1}
          aria-hidden={!revealed}
          className="md:hidden absolute inset-y-0 right-0 flex flex-col items-center justify-center gap-1 bg-danger text-white text-xs font-semibold"
          style={{ width: REVEAL_W }}
        >
          <Trash2 size={18} />
          Excluir
        </button>
      )}

      <div
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{ transform: `translateX(${offset}px)`, touchAction: "pan-y" }}
        className={`relative bg-card ${dragging ? "" : "transition-transform duration-200"}`}
      >
        <div className="relative flex items-center gap-3 px-4 md:px-5 py-3 hover:bg-rowhover has-[>button:active]:bg-rowhover has-[>button:focus-visible]:bg-rowhover transition-colors">
          {/* Área clicável que cobre a linha toda; a pílula de status fica por cima */}
          <button
            type="button"
            onClick={handleClick}
            aria-label={`Editar ${title || titlePlaceholder}`}
            className="absolute inset-0 w-full cursor-pointer focus-visible:outline-none"
          />
          <span className={`pointer-events-none size-10 shrink-0 grid place-items-center rounded-xl ${TONE_CHIP[tone]}`}>
            <Icon size={18} strokeWidth={2} />
          </span>

          <div className="pointer-events-none flex-1 min-w-0">
            <div className={`text-[15px] font-medium truncate flex items-center gap-1.5 ${title ? "text-apptext" : "text-muted font-normal italic"}`}>
              {badge}
              <span className="truncate">{title || titlePlaceholder}</span>
            </div>
            {subtitle && <div className="text-[13px] text-muted truncate mt-0.5">{subtitle}</div>}
            {progress && (
              <div className="flex flex-col sm:flex-row sm:items-center gap-x-2 gap-y-1 mt-2">
                <div className="w-full sm:max-w-[220px] h-1.5 rounded-full bg-thead overflow-hidden">
                  <div className={`h-full rounded-full ${progress.barClass}`} style={{ width: `${Math.min(100, progress.pct)}%` }} />
                </div>
                <span className="text-xs text-muted tabular-nums whitespace-nowrap">{progress.label}</span>
              </div>
            )}
          </div>

          <div className="pointer-events-none flex flex-col items-end gap-1 shrink-0">
            <span className={`tabular-nums text-[15px] font-semibold whitespace-nowrap ${muted ? "text-muted" : "text-apptext"}`}>
              {value}
            </span>
            {status && (status.onToggle ? (
              <button
                type="button"
                onClick={e => { e.stopPropagation(); status.onToggle?.(); }}
                title={status.hint}
                aria-label={`${status.label} — ${status.hint ?? ""}`}
                className={`pointer-events-auto relative inline-flex items-center gap-1 rounded-full pl-1.5 pr-2.5 py-0.5 text-xs font-semibold whitespace-nowrap active:scale-95 transition ${CHIP_TONES[status.tone]}`}
              >
                <span className={`size-3.5 grid place-items-center rounded-full ${status.done ? "bg-current" : "border-[1.5px] border-current"}`}>
                  {status.done && <Check size={10} strokeWidth={3.5} className="text-card" />}
                </span>
                {status.label}
              </button>
            ) : (
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${CHIP_TONES[status.tone]}`}>
                {status.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
