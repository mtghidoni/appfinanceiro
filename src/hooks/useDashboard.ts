"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { mesLabel } from "@/lib/utils";

export interface MesHistorico {
  key: string;      // "MM-YYYY"
  idx: number;      // ano*12 + mês, para ordenar e filtrar por período
  label: string;    // "nov/26"
  rec: number;
  gas: number;
  res: number;
  gfx: number;
  gvr: number;
  cats: Record<string, number>; // gastos (fixos + variados) por categoria
}

export function monthIndex(key: string): number {
  const [m, y] = key.split("-").map(Number);
  return y * 12 + (m - 1);
}

type Linha = { mes_ano: string; valor: number; cat?: string };

// O Supabase devolve no máximo 1000 linhas por consulta; busca em páginas.
async function fetchAll(
  supabase: ReturnType<typeof createClient>, table: string, cols: string,
): Promise<Linha[]> {
  const PAGE = 1000;
  const out: Linha[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase.from(table).select(cols).range(from, from + PAGE - 1);
    if (error) throw error;
    out.push(...((data as unknown as Linha[]) ?? []));
    if (!data || data.length < PAGE) break;
  }
  return out;
}

export function useDashboard() {
  const [historico, setHistorico] = useState<MesHistorico[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [fx, vr, en] = await Promise.all([
          fetchAll(supabase, "gastos_fixos", "mes_ano,valor,cat"),
          fetchAll(supabase, "gastos_variados", "mes_ano,valor,cat"),
          fetchAll(supabase, "entradas", "mes_ano,valor"),
        ]);

        const meses = new Map<string, MesHistorico>();
        const get = (key: string) => {
          let m = meses.get(key);
          if (!m) {
            m = { key, idx: monthIndex(key), label: mesLabel(key), rec: 0, gas: 0, res: 0, gfx: 0, gvr: 0, cats: {} };
            meses.set(key, m);
          }
          return m;
        };
        for (const r of fx) {
          const m = get(r.mes_ano); const v = Number(r.valor);
          m.gfx += v; m.cats[r.cat || "Outros"] = (m.cats[r.cat || "Outros"] ?? 0) + v;
        }
        for (const r of vr) {
          const m = get(r.mes_ano); const v = Number(r.valor);
          m.gvr += v; m.cats[r.cat || "Outros"] = (m.cats[r.cat || "Outros"] ?? 0) + v;
        }
        for (const r of en) get(r.mes_ano).rec += Number(r.valor);

        const result = Array.from(meses.values())
          .map(m => ({ ...m, gas: m.gfx + m.gvr, res: m.rec - m.gfx - m.gvr }))
          .filter(d => d.rec > 0 || d.gas > 0)
          .sort((a, b) => a.idx - b.idx);
        if (!cancelled) { setHistorico(result); setError(null); }
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return { loading, error, historico };
}
