"use client";

import { CalendarCheck, Scale, TrendingDown, TrendingUp } from "lucide-react";
import { brl } from "@/lib/utils";
import { useDashboard } from "@/hooks/useDashboard";
import StatCard from "@/components/ui/StatCard";
import { Skeleton } from "@/components/ui/Skeleton";

export default function DashboardScreen() {
  const { loading, historico } = useDashboard();

  const n = historico.length;
  const avgR = n ? historico.reduce((s, d) => s + d.rec, 0) / n : 0;
  const avgG = n ? historico.reduce((s, d) => s + d.gas, 0) / n : 0;
  const pos = historico.filter(d => d.res >= 0).length;
  const mx = Math.max(...historico.map(d => Math.max(d.rec, d.gas)), 1);

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <header className="bg-card border-b border-border px-4 md:px-8 h-16 flex items-center flex-shrink-0">
        <h1 className="text-lg font-semibold text-heading">Dashboard</h1>
      </header>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
       <div className="max-w-6xl mx-auto px-3 md:px-8 py-4 md:py-6 pb-10">
        {loading ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[0, 1, 2, 3].map(i => <Skeleton key={i} className="h-[104px] rounded-2xl" />)}
            </div>
            <Skeleton className="h-64 rounded-2xl" />
          </div>
        ) : (
          <>
            {/* KPI cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <StatCard icon={TrendingUp}    tone="income"  label="Receita média"   value={n ? brl(avgR) : "—"}       sub="por mês" />
              <StatCard icon={TrendingDown}  tone="expense" label="Gastos médios"   value={n ? brl(avgG) : "—"}       sub="por mês" />
              <StatCard icon={Scale}         tone="brand"   label="Saldo médio"     value={n ? brl(avgR - avgG) : "—"} sub="por mês"
                valueClass={!n ? "text-heading" : avgR - avgG >= 0 ? "text-income" : "text-danger"} />
              <StatCard icon={CalendarCheck} tone="neutral" label="Meses positivos" value={n ? `${pos} de ${n}` : "—"} sub="meses lançados" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[1fr_380px] gap-4">
              {/* Bar chart */}
              <div className="bg-card border border-border rounded-2xl p-4 md:p-5">
                <h2 className="text-[15px] font-semibold text-heading mb-4">Receitas e gastos por mês</h2>
                {historico.length === 0 ? (
                  <div className="h-40 flex items-center justify-center text-muted text-sm">Nenhum lançamento ainda.</div>
                ) : (
                  <>
                    <div className="flex items-end gap-1.5 h-40 px-1">
                      {historico.map(d => (
                        <div key={d.key} className="flex-1 flex flex-col items-center">
                          <div className="flex items-end gap-0.5 h-[130px] w-full">
                            <div
                              className="flex-1 bg-income rounded-t-[4px] hover:opacity-75 transition-opacity"
                              style={{ height: `${Math.round(d.rec / mx * 130)}px`, minHeight: 3 }}
                              title={`${d.label} · ${brl(d.rec)}`}
                            />
                            <div
                              className="flex-1 bg-expense rounded-t-[4px] hover:opacity-75 transition-opacity"
                              style={{ height: `${Math.round(d.gas / mx * 130)}px`, minHeight: 3 }}
                              title={`${d.label} · ${brl(d.gas)}`}
                            />
                          </div>
                          <span className="text-[11px] text-muted text-center mt-1.5 w-full truncate">{d.label}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-4 mt-3">
                      <span className="text-xs flex items-center gap-1.5 text-muted">
                        <span className="size-2.5 bg-income rounded-full inline-block" />Receita
                      </span>
                      <span className="text-xs flex items-center gap-1.5 text-muted">
                        <span className="size-2.5 bg-expense rounded-full inline-block" />Gastos
                      </span>
                    </div>
                  </>
                )}
              </div>

              {/* History table */}
              <div className="bg-card border border-border rounded-2xl p-4 md:p-5">
                <h2 className="text-[15px] font-semibold text-heading mb-4">Histórico mensal</h2>
                {historico.length === 0 ? (
                  <div className="text-center text-muted text-sm py-5">Sem dados</div>
                ) : (
                  <table className="w-full border-collapse">
                    <thead>
                      <tr>
                        {["Mês","Receitas","Gastos","Saldo"].map((h, i) => (
                          <th key={h} className={`text-xs font-medium text-muted pb-2 border-b border-border ${i === 0 ? "text-left pl-1" : "text-right"}`}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[...historico].reverse().map(d => (
                        <tr key={d.key} className="hover:bg-rowhover">
                          <td className="font-medium text-[13px] py-2.5 pl-1 border-b border-border">{d.label}</td>
                          <td className="tabular-nums text-[13px] py-2.5 text-right border-b border-border">{brl(d.rec)}</td>
                          <td className="tabular-nums text-[13px] py-2.5 text-right border-b border-border">{brl(d.gas)}</td>
                          <td className={`tabular-nums text-[13px] py-2.5 text-right border-b border-border font-semibold ${d.res >= 0 ? "text-income" : "text-danger"}`}>{brl(d.res)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </>
        )}
       </div>
      </div>
    </div>
  );
}
