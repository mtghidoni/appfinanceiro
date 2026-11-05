"use client";

import { useEffect, useRef, useState } from "react";
import { brl } from "@/lib/utils";
import { iconFor } from "@/lib/icons";

// ---------- utilidades ----------

/** Rótulo compacto para eixos: R$ 0 · R$ 500 · R$ 5 mil · R$ 1,2 mi */
export function brlCompact(v: number): string {
  const a = Math.abs(v);
  const sign = v < 0 ? "−" : "";
  if (a >= 1_000_000) return `${sign}R$ ${(a / 1_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mi`;
  if (a >= 1_000) return `${sign}R$ ${(a / 1_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil`;
  return `${sign}R$ ${Math.round(a)}`;
}

/** Escala "redonda" para o eixo Y, incluindo o zero. */
function niceScale(min: number, max: number, count = 4) {
  const lo = Math.min(0, min);
  const hi = Math.max(0, max, 1);
  const raw = (hi - lo) / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map(m => m * mag).find(s => s >= raw) ?? raw;
  const start = Math.floor(lo / step) * step;
  const end = Math.ceil(hi / step) * step;
  const ticks: number[] = [];
  for (let t = start; t <= end + step / 2; t += step) ticks.push(Math.round(t * 100) / 100);
  return { min: start, max: end, ticks };
}

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

/** Retângulo com cantos superiores arredondados (4px) e base reta. */
function barPath(x: number, y: number, w: number, h: number, r = 4) {
  if (h <= 0) return "";
  const rr = Math.min(r, w / 2, h);
  return `M${x},${y + h}V${y + rr}Q${x},${y} ${x + rr},${y}H${x + w - rr}Q${x + w},${y} ${x + w},${y + rr}V${y + h}Z`;
}

function Tooltip({ x, y, width, title, rows }: {
  x: number; y: number; width: number; title: string;
  rows: { label: string; value: string; colorClass?: string }[];
}) {
  const TW = 220;
  const left = Math.max(0, Math.min(x - TW / 2, width - TW));
  return (
    <div
      className="pointer-events-none absolute z-10 rounded-xl border border-border bg-card px-3 py-2.5 shadow-lg"
      style={{ left, top: Math.max(0, y), width: TW }}
    >
      <p className="text-xs font-medium text-muted mb-1.5">{title}</p>
      <div className="space-y-1">
        {rows.map(r => (
          <div key={r.label} className="flex items-center gap-2 text-[13px]">
            {r.colorClass && <span className={`h-0.5 w-3 rounded-full ${r.colorClass}`} />}
            <span className="flex-1 text-muted whitespace-nowrap">{r.label}</span>
            <span className="font-semibold text-apptext tabular-nums whitespace-nowrap">{r.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Legend({ items }: { items: { label: string; className: string; line?: boolean }[] }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1">
      {items.map(i => (
        <span key={i.label} className="inline-flex items-center gap-1.5 text-xs text-muted">
          <span className={i.line ? `h-0.5 w-3.5 rounded-full ${i.className}` : `size-2.5 rounded-[3px] ${i.className}`} />
          {i.label}
        </span>
      ))}
    </div>
  );
}

// ---------- Receitas x gastos por mês (colunas agrupadas) ----------

export interface MonthPoint { key: string; label: string; rec: number; gas: number; res: number }

const PLOT_H = 200;
const AXIS_H = 26;
const PAD_L = 64;
const PAD_T = 8;

export function MonthlyColumns({ data }: { data: MonthPoint[] }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const scale = niceScale(0, Math.max(...data.map(d => Math.max(d.rec, d.gas)), 0));
  const plotW = Math.max(0, width - PAD_L);
  const band = data.length ? plotW / data.length : 0;
  const barW = Math.max(3, Math.min(24, (band - 10) / 2 - 1));
  const y = (v: number) => PAD_T + PLOT_H - ((v - scale.min) / (scale.max - scale.min)) * PLOT_H;
  // Rótulos do eixo X: pula alguns quando não cabem
  const every = Math.max(1, Math.ceil(44 / Math.max(band, 1)));

  return (
    <div ref={ref} className="relative" onPointerLeave={() => setHover(null)}>
      {width > 0 && (
        <svg width={width} height={PAD_T + PLOT_H + AXIS_H} role="img" aria-label="Receitas e gastos por mês">
          {scale.ticks.map(t => (
            <g key={t}>
              <line x1={PAD_L} x2={width} y1={y(t)} y2={y(t)} className="stroke-border" strokeWidth={1} shapeRendering="crispEdges" />
              <text x={PAD_L - 10} y={y(t)} dy="0.32em" textAnchor="end" className="fill-muted text-[11px] tabular-nums">
                {brlCompact(t)}
              </text>
            </g>
          ))}
          {data.map((d, i) => {
            const cx = PAD_L + band * i + band / 2;
            const xr = cx - barW - 1;
            const xg = cx + 1;
            return (
              <g
                key={d.key}
                tabIndex={0}
                aria-label={`${d.label}: receitas ${brl(d.rec)}, gastos ${brl(d.gas)}`}
                onPointerEnter={() => setHover(i)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
                className="outline-none"
              >
                <rect x={PAD_L + band * i} y={PAD_T} width={band} height={PLOT_H} className={hover === i ? "fill-thead" : "fill-transparent"} />
                <path d={barPath(xr, y(d.rec), barW, y(0) - y(d.rec))} className="fill-income" />
                <path d={barPath(xg, y(d.gas), barW, y(0) - y(d.gas))} className="fill-expense" />
                {i % every === 0 && (
                  <text x={cx} y={PAD_T + PLOT_H + 18} textAnchor="middle" className="fill-muted text-[11px]">{d.label}</text>
                )}
              </g>
            );
          })}
          <line x1={PAD_L} x2={width} y1={y(0)} y2={y(0)} className="stroke-muted/40" strokeWidth={1} shapeRendering="crispEdges" />
        </svg>
      )}
      {hover !== null && data[hover] && (
        <Tooltip
          x={PAD_L + band * hover + band / 2}
          y={PAD_T + 4}
          width={width}
          title={data[hover].label}
          rows={[
            { label: "Receitas", value: brl(data[hover].rec), colorClass: "bg-income" },
            { label: "Gastos", value: brl(data[hover].gas), colorClass: "bg-expense" },
            { label: "Saldo", value: brl(data[hover].res) },
          ]}
        />
      )}
    </div>
  );
}

// ---------- Saldo acumulado (linha + área) ----------

export function CumulativeLine({ data }: { data: MonthPoint[] }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const pts = data.reduce<{ label: string; v: number; res: number }[]>((acc, d) => {
    acc.push({ label: d.label, res: d.res, v: (acc.length ? acc[acc.length - 1].v : 0) + d.res });
    return acc;
  }, []);
  const scale = niceScale(Math.min(...pts.map(p => p.v), 0), Math.max(...pts.map(p => p.v), 0));
  const PAD_R = 16;
  const plotW = Math.max(0, width - PAD_L - PAD_R);
  const INSET = 22; // folga nas pontas para os rótulos do eixo X não cortarem
  const x = (i: number) => PAD_L + INSET + (pts.length > 1 ? (i / (pts.length - 1)) * (plotW - 2 * INSET) : (plotW - 2 * INSET) / 2);
  const y = (v: number) => PAD_T + PLOT_H - ((v - scale.min) / (scale.max - scale.min)) * PLOT_H;
  const line = pts.map((p, i) => `${i ? "L" : "M"}${x(i)},${y(p.v)}`).join("");
  const area = pts.length ? `${line}L${x(pts.length - 1)},${y(0)}L${x(0)},${y(0)}Z` : "";
  const every = Math.max(1, Math.ceil(48 / Math.max((plotW - 44) / Math.max(pts.length - 1, 1), 1)));
  const last = pts.length - 1;

  function onMove(e: React.PointerEvent<SVGSVGElement>) {
    if (!pts.length) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const i = pts.length > 1 ? Math.round(((px - PAD_L - INSET) / (plotW - 2 * INSET)) * (pts.length - 1)) : 0;
    setHover(Math.max(0, Math.min(pts.length - 1, i)));
  }

  return (
    <div ref={ref} className="relative" onPointerLeave={() => setHover(null)}>
      {width > 0 && (
        <svg
          width={width}
          height={PAD_T + PLOT_H + AXIS_H}
          onPointerMove={onMove}
          role="img"
          aria-label={`Saldo acumulado; último valor ${pts.length ? brl(pts[last].v) : "—"}`}
          tabIndex={0}
          onKeyDown={e => {
            if (e.key === "ArrowRight") setHover(h => Math.min(last, (h ?? -1) + 1));
            if (e.key === "ArrowLeft") setHover(h => Math.max(0, (h ?? last + 1) - 1));
          }}
          onBlur={() => setHover(null)}
          className="outline-none touch-pan-y"
        >
          {scale.ticks.map(t => (
            <g key={t}>
              <line x1={PAD_L} x2={width - PAD_R} y1={y(t)} y2={y(t)} className={t === 0 ? "stroke-muted/50" : "stroke-border"} strokeWidth={1} shapeRendering="crispEdges" />
              <text x={PAD_L - 10} y={y(t)} dy="0.32em" textAnchor="end" className="fill-muted text-[11px] tabular-nums">{brlCompact(t)}</text>
            </g>
          ))}
          <path d={area} className="fill-brand/10" />
          <path d={line} className="stroke-brand" fill="none" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          {pts.map((p, i) => i % every === 0 && (
            <text key={i} x={x(i)} y={PAD_T + PLOT_H + 18} textAnchor="middle" className="fill-muted text-[11px]">{p.label}</text>
          ))}
          {hover !== null && (
            <line x1={x(hover)} x2={x(hover)} y1={PAD_T} y2={PAD_T + PLOT_H} className="stroke-muted/60" strokeWidth={1} />
          )}
          {pts.length > 0 && (
            <circle cx={x(hover ?? last)} cy={y(pts[hover ?? last].v)} r={4.5} className="fill-brand stroke-card" strokeWidth={2} />
          )}
        </svg>
      )}
      {hover !== null && pts[hover] && (
        <Tooltip
          x={x(hover)}
          y={PAD_T + 4}
          width={width}
          title={pts[hover].label}
          rows={[
            { label: "Saldo acumulado", value: brl(pts[hover].v), colorClass: "bg-brand" },
            { label: "Saldo do mês", value: brl(pts[hover].res) },
          ]}
        />
      )}
    </div>
  );
}

// ---------- Gastos por categoria (barras horizontais) ----------

export function CategoryBars({ data, months }: { data: { cat: string; valor: number }[]; months: number }) {
  const total = data.reduce((s, d) => s + d.valor, 0);
  const max = Math.max(...data.map(d => d.valor), 1);
  return (
    <ul className="space-y-3.5">
      {data.map(d => {
        const Icon = iconFor(d.cat);
        const pct = total ? Math.round((d.valor / total) * 100) : 0;
        return (
          <li key={d.cat} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1.5 items-center">
            <span className="flex items-center gap-2 min-w-0 text-sm">
              <Icon size={15} className="text-muted shrink-0" />
              <span className="truncate font-medium">{d.cat}</span>
              <span className="text-xs text-muted tabular-nums">{pct}%</span>
            </span>
            <span className="text-sm font-semibold tabular-nums text-right">{brl(d.valor)}</span>
            <div className="col-span-2 h-2 rounded-r-[4px] bg-thead overflow-hidden" title={`${d.cat}: ${brl(d.valor)} (${pct}%) — média de ${brl(d.valor / Math.max(months, 1))}/mês`}>
              <div className="h-full rounded-r-[4px] bg-expense" style={{ width: `${(d.valor / max) * 100}%` }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
