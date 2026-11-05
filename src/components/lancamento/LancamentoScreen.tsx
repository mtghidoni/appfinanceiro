"use client";

import { useState } from "react";
import { MESES } from "@/lib/constants";
import { useLancamento } from "@/hooks/useLancamento";
import MonthStepper from "@/components/ui/MonthStepper";
import { Skeleton, SectionSkeleton } from "@/components/ui/Skeleton";
import MonthSummary from "./MonthSummary";
import GastosFixosTable from "./GastosFixosTable";
import GastosVariadosTable from "./GastosVariadosTable";
import EntradasTable from "./EntradasTable";
import MovimentacoesTable from "./MovimentacoesTable";

const sum = (rows: { valor: number }[]) => rows.reduce((s, it) => s + Number(it.valor), 0);

export default function LancamentoScreen() {
  const now = new Date();
  const [mes, setMes] = useState(MESES[now.getMonth()]);
  const [ano, setAno] = useState(now.getFullYear());

  const {
    loading,
    fixos, addFixo, updateFixo, deleteFixo,
    variados, addVariado, updateVariado, deleteVariado,
    entradas, addEntrada, updateEntrada, deleteEntrada,
    movs, addMov, updateMov, deleteMov,
  } = useLancamento(mes, ano);

  const gastos = [...fixos, ...variados];
  const totalReceita = sum(entradas);
  const totalRecebido = sum(entradas.filter(e => e.recebido === "OK"));
  const totalGastos = sum(gastos);
  const totalPago = sum(gastos.filter(g => g.pago === "OK"));

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Header */}
      <header className="bg-card border-b border-border px-3 md:px-8 h-16 flex items-center justify-center sm:justify-between gap-2 flex-shrink-0">
        <h1 className="hidden sm:block text-lg font-semibold text-heading">Lançamentos</h1>
        <MonthStepper mes={mes} ano={ano} onChange={(m, a) => { setMes(m); setAno(a); }} />
      </header>

      {/* Body */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="max-w-5xl mx-auto px-3 md:px-8 py-4 md:py-6 pb-10 space-y-4 md:space-y-5">
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
              <EntradasTable rows={entradas} onAdd={addEntrada} onUpdate={updateEntrada} onDelete={deleteEntrada} />
              <GastosFixosTable rows={fixos} onAdd={addFixo} onUpdate={updateFixo} onDelete={deleteFixo} />
              <GastosVariadosTable rows={variados} onAdd={addVariado} onUpdate={updateVariado} onDelete={deleteVariado} />
              <MovimentacoesTable rows={movs} onAdd={addMov} onUpdate={updateMov} onDelete={deleteMov} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
