"use client";

import { useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight, CalendarCheck, Minus, Scale, TrendingDown, TrendingUp, type LucideIcon } from "lucide-react";
import { MESES } from "@/lib/constants";
import { brl } from "@/lib/utils";
import { useDashboard, type MesHistorico } from "@/hooks/useDashboard";
import { Skeleton } from "@/components/ui/Skeleton";
import { TONE_CHIP, type Tone } from "@/components/ui/SectionCard";
import { CategoryBars, CumulativeLine, Legend, MonthlyColumns } from "./charts";

type Periodo = 6 | 12 | 0; // 0 = tudo
const PERIODOS: { v: Periodo; label: string }[] = [
  { v: 6, label: "6 meses" },
  { v: 12, label: "12 meses" },
  { v: 0, label: "Tudo" },
];

export default function DashboardScreen() {
  const { loading, error, historico } = useDashboard();
  const [periodo, setPeriodo] = useState<Periodo>(12);

  const now = new Date();
  const nowIdx = now.getFullYear() * 12 + now.getMonth();

  // Meses do período até o mês atual (meses futuros já lançados ficam de fora dos totais)
  const dados = useMemo(
    () => historico.filter(d => d.idx <= nowIdx && (periodo === 0 || d.idx > nowIdx - periodo)),
    [historico, periodo, nowIdx],
  );

  const n = dados.length;
  const totRec = dados.reduce((s, d) => s + d.rec, 0);
  const totGas = dados.reduce((s, d) => s + d.gas, 0);
  const saldo = totRec - totGas;
  const positivos = dados.filter(d => d.res >= 0).length;

  // Comparação: mês mais recente com lançamentos x o mês imediatamente anterior
  const atual = historico.filter(d => d.idx <= nowIdx).at(-1);
  const anterior = atual ? historico.find(d => d.idx === atual.idx - 1) : undefined;

  const categorias = useMemo(() => {
    const acc: Record<string, number> = {};
    for (const d of dados) for (const [c, v] of Object.entries(d.cats)) acc[c] = (acc[c] ?? 0) + v;
    return Object.entries(acc).map(([cat, valor]) => ({ cat, valor })).filter(c => c.valor > 0).sort((a, b) => b.valor - a.valor);
  }, [dados]);

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <header className="bg-card border-b border-border px-4 md:px-8 h-16 flex items-center flex-shrink-0">
        <h1 className="text-lg font-semibold text-heading">Dashboard</h1>
      </header>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="max-w-6xl mx-auto px-3 md:px-8 py-4 md:py-6 pb-10 space-y-4">
          {/* Filtro de período: um só, acima de tudo que ele afeta */}
          <div className="flex items-center justify-between gap-3">
            <div className="inline-flex rounded-xl bg-thead p-1" role="group" aria-label="Período">
              {PERIODOS.map(p => (
                <button
                  key={p.v}
                  type="button"
                  onClick={() => setPeriodo(p.v)}
                  aria-pressed={periodo === p.v}
                  className={`rounded-lg px-3.5 py-1.5 text-sm font-medium transition ${
                    periodo === p.v ? "bg-card text-apptext shadow-sm" : "text-muted hover:text-apptext"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            {!loading && n > 0 && (
              <span className="hidden sm:block text-sm text-muted">{n} {n === 1 ? "mês" : "meses"} com lançamentos</span>
            )}
          </div>

          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-40 rounded-2xl" />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[0, 1, 2, 3].map(i => <Skeleton key={i} className="h-[112px] rounded-2xl" />)}
              </div>
              <Skeleton className="h-72 rounded-2xl" />
            </div>
          ) : error ? (
            <div className="bg-danger-soft text-danger-ink rounded-2xl px-5 py-4 text-sm">
              Não foi possível carregar o histórico: {error}
            </div>
          ) : n === 0 ? (
            <div className="bg-card border border-border rounded-2xl px-6 py-14 text-center">
              <p className="text-[15px] font-medium">Nenhum lançamento neste período</p>
              <p className="text-sm text-muted mt-1">Os gráficos aparecem assim que houver receitas ou gastos lançados.</p>
            </div>
          ) : (
            <>
              {/* Número principal do período */}
              <section className="bg-card border border-border rounded-2xl p-5 md:p-6">
                <p className="text-sm font-medium text-muted">
                  Saldo acumulado {periodo === 0 ? "desde o início" : `nos últimos ${periodo} meses`}
                </p>
                <p className={`mt-1 text-[40px] md:text-5xl leading-none font-semibold tracking-tight ${saldo >= 0 ? "text-income" : "text-danger"}`}>
                  {saldo < 0 ? "− " : ""}{brl(Math.abs(saldo))}
                </p>
                <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-muted">
                  <span>Receitas <strong className="font-semibold text-apptext tabular-nums">{brl(totRec)}</strong></span>
                  <span>Gastos <strong className="font-semibold text-apptext tabular-nums">{brl(totGas)}</strong></span>
                  <span>Média mensal <strong className={`font-semibold tabular-nums ${saldo >= 0 ? "text-apptext" : "text-danger"}`}>{brl(saldo / n)}</strong></span>
                </div>
              </section>

              {/* Mês atual x anterior */}
              {atual && (
                <section>
                  <h2 className="text-[15px] font-semibold text-heading mb-2.5 px-1">
                    {nomeMes(atual)} {anterior ? <span className="font-normal text-muted">em relação a {nomeMes(anterior).toLowerCase()}</span> : null}
                  </h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <DeltaTile icon={TrendingUp} tone="income" label="Receitas" value={atual.rec} prev={anterior?.rec} upIsGood />
                    <DeltaTile icon={TrendingDown} tone="expense" label="Gastos" value={atual.gas} prev={anterior?.gas} upIsGood={false} />
                    <DeltaTile icon={Scale} tone="brand" label="Saldo" value={atual.res} prev={anterior?.res} upIsGood />
                    <div className="bg-card border border-border rounded-2xl px-4 py-3.5 flex flex-col gap-2 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`size-7 grid place-items-center rounded-lg ${TONE_CHIP.neutral}`}><CalendarCheck size={15} strokeWidth={2.25} /></span>
                        <span className="text-[13px] font-medium text-muted truncate">Meses positivos</span>
                      </div>
                      <span className="text-xl md:text-[22px] font-semibold tracking-tight">{positivos} de {n}</span>
                      <span className="text-xs text-muted -mt-1">no período</span>
                    </div>
                  </div>
                </section>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4">
                <div className="space-y-4 min-w-0">
                  <ChartCard title="Receitas e gastos por mês" legend={<Legend items={[{ label: "Receitas", className: "bg-income" }, { label: "Gastos", className: "bg-expense" }]} />}>
                    <MonthlyColumns data={dados} />
                  </ChartCard>
                  <ChartCard title="Saldo acumulado" subtitle="Soma dos saldos mensais ao longo do período">
                    <CumulativeLine data={dados} />
                  </ChartCard>
                </div>

                <ChartCard title="Gastos por categoria" subtitle={`Total no período · ${categorias.length} categorias`}>
                  {categorias.length ? <CategoryBars data={categorias} months={n} /> : <p className="text-sm text-muted">Nenhum gasto no período.</p>}
                </ChartCard>
              </div>

              <HistoryTable data={dados} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function nomeMes(d: MesHistorico) {
  const [m, y] = d.key.split("-").map(Number);
  return `${MESES[m - 1]} ${y}`;
}

function ChartCard({ title, subtitle, legend, children }: {
  title: string; subtitle?: string; legend?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <section className="bg-card border border-border rounded-2xl p-4 md:p-5 min-w-0">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 mb-4">
        <div>
          <h2 className="text-[15px] font-semibold text-heading">{title}</h2>
          {subtitle && <p className="text-xs text-muted mt-0.5">{subtitle}</p>}
        </div>
        {legend}
      </div>
      {children}
    </section>
  );
}

function DeltaTile({ icon: Icon, tone, label, value, prev, upIsGood }: {
  icon: LucideIcon; tone: Tone; label: string; value: number; prev?: number; upIsGood: boolean;
}) {
  let delta: React.ReactNode = <span className="text-xs text-muted">sem mês anterior</span>;
  if (prev !== undefined) {
    const diff = value - prev;
    const pct = prev !== 0 ? Math.round((diff / Math.abs(prev)) * 100) : null;
    const good = diff === 0 ? null : (diff > 0) === upIsGood;
    const Arrow = diff > 0 ? ArrowUpRight : diff < 0 ? ArrowDownRight : Minus;
    delta = (
      <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${good === null ? "text-muted" : good ? "text-success-ink" : "text-danger-ink"}`}>
        <Arrow size={14} strokeWidth={2.5} />
        {pct !== null && `${Math.abs(pct)}%`}
        <span className={`font-normal text-muted ${pct !== null ? "ml-1" : ""}`}>{diff >= 0 ? "+" : "−"}{brl(Math.abs(diff))}</span>
      </span>
    );
  }
  return (
    <div className="bg-card border border-border rounded-2xl px-4 py-3.5 flex flex-col gap-2 min-w-0">
      <div className="flex items-center gap-2">
        <span className={`size-7 grid place-items-center rounded-lg ${TONE_CHIP[tone]}`}><Icon size={15} strokeWidth={2.25} /></span>
        <span className="text-[13px] font-medium text-muted truncate">{label}</span>
      </div>
      <span className={`text-xl md:text-[22px] font-semibold tracking-tight truncate ${label === "Saldo" && value < 0 ? "text-danger" : ""}`}>
        {value < 0 ? "− " : ""}{brl(Math.abs(value))}
      </span>
      <span className="-mt-1 truncate">{delta}</span>
    </div>
  );
}

function HistoryTable({ data }: { data: MesHistorico[] }) {
  return (
    <section className="bg-card border border-border rounded-2xl overflow-hidden">
      <h2 className="text-[15px] font-semibold text-heading px-4 md:px-5 pt-4 pb-3">Histórico mensal</h2>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[13px] min-w-[420px]">
          <thead>
            <tr className="bg-thead/60">
              {["Mês", "Receitas", "Gastos", "Saldo"].map((h, i) => (
                <th key={h} scope="col" className={`text-xs font-medium text-muted py-2 px-4 md:px-5 border-y border-border ${i === 0 ? "text-left" : "text-right"}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...data].reverse().map(d => (
              <tr key={d.key} className="hover:bg-rowhover">
                <th scope="row" className="text-left font-medium py-2.5 px-4 md:px-5 border-b border-border">{nomeMes(d)}</th>
                <td className="tabular-nums py-2.5 px-4 md:px-5 text-right border-b border-border">{brl(d.rec)}</td>
                <td className="tabular-nums py-2.5 px-4 md:px-5 text-right border-b border-border">{brl(d.gas)}</td>
                <td className={`tabular-nums py-2.5 px-4 md:px-5 text-right border-b border-border font-semibold ${d.res >= 0 ? "text-income" : "text-danger"}`}>{d.res < 0 ? "− " : ""}{brl(Math.abs(d.res))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
