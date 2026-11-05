"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { FIXOS_PADRAO } from "@/lib/constants";
import { addMonths, mesKey } from "@/lib/utils";
import type { GastoFixo, GastoVariado, Entrada, Movimentacao } from "@/types";

type Row = { id: string; ordem: number };
type SupabaseClient = ReturnType<typeof createClient>;

/** Operações de uma tabela mensal: criar, salvar, remover e restaurar (desfazer). */
export interface TableApi<T extends Row> {
  create: (payload: Partial<T>) => Promise<void>;
  save: (id: string, patch: Partial<T>) => Promise<void>;
  remove: (id: string) => Promise<T | undefined>;
  restore: (row: T) => Promise<void>;
}

const byOrdem = (a: { ordem: number }, b: { ordem: number }) => a.ordem - b.ordem;

function makeTable<T extends Row>(
  supabase: SupabaseClient,
  name: string,
  key: string,
  rows: T[],
  setRows: React.Dispatch<React.SetStateAction<T[]>>,
  afterSave?: (row: T | undefined, patch: Partial<T>) => Promise<void>,
): TableApi<T> {
  return {
    async create(payload) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const ordem = rows.reduce((m, r) => Math.max(m, r.ordem + 1), 0);
      const { data } = await supabase
        .from(name)
        .insert({ ...payload, user_id: user.id, mes_ano: key, ordem } as never)
        .select().single();
      if (data) setRows(prev => [...prev, data as T].sort(byOrdem));
    },
    async save(id, patch) {
      const row = rows.find(r => r.id === id);
      setRows(prev => prev.map(r => (r.id === id ? { ...r, ...patch } : r)));
      await supabase.from(name).update(patch as never).eq("id", id);
      if (afterSave) await afterSave(row, patch);
    },
    async remove(id) {
      const row = rows.find(r => r.id === id);
      setRows(prev => prev.filter(r => r.id !== id));
      await supabase.from(name).delete().eq("id", id);
      return row;
    },
    async restore(row) {
      setRows(prev => [...prev.filter(r => r.id !== row.id), row].sort(byOrdem));
      await supabase.from(name).insert(row as never);
    },
  };
}

export function useLancamento(mes: string, ano: number) {
  const supabase = createClient();
  const key = mesKey(mes, ano);

  const [fixos, setFixos] = useState<GastoFixo[]>([]);
  const [variados, setVariados] = useState<GastoVariado[]>([]);
  const [entradas, setEntradas] = useState<Entrada[]>([]);
  const [movs, setMovs] = useState<Movimentacao[]>([]);
  const [loading, setLoading] = useState(true);

  // Primeiro acesso a um mês: copia os gastos fixos do mês mais recente que os tenha
  // (descrição, categoria e valor, com situação "Pendente"); sem histórico, usa a lista padrão.
  const seedFixos = useCallback(async (): Promise<GastoFixo[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const anteriores = Array.from({ length: 12 }, (_, i) => addMonths(key, -(i + 1)));
    const { data: hist } = await supabase
      .from("gastos_fixos").select("desc,cat,valor,ordem,mes_ano").in("mes_ano", anteriores);
    const ultimoMes = anteriores.find(k => (hist ?? []).some(h => h.mes_ano === k));
    const base = ultimoMes
      ? (hist ?? []).filter(h => h.mes_ano === ultimoMes).sort(byOrdem)
          .map(h => ({ desc: h.desc as string, cat: h.cat as string, valor: Number(h.valor) }))
      : FIXOS_PADRAO.map(it => ({ desc: it.desc, cat: it.cat, valor: 0 }));

    const rows = base.map((it, i) => ({
      ...it, user_id: user.id, mes_ano: key, pago: "Pendente" as const, ordem: i,
    }));
    const { data } = await supabase.from("gastos_fixos").insert(rows).select();
    return ((data as GastoFixo[]) ?? []).sort(byOrdem);
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [f, v, e, m] = await Promise.all([
        supabase.from("gastos_fixos").select("*").eq("mes_ano", key).order("ordem"),
        supabase.from("gastos_variados").select("*").eq("mes_ano", key).order("ordem"),
        supabase.from("entradas").select("*").eq("mes_ano", key).order("ordem"),
        supabase.from("movimentacoes").select("*").eq("mes_ano", key).order("ordem"),
      ]);
      let fx = (f.data as GastoFixo[]) ?? [];
      if (!f.error && fx.length === 0) fx = await seedFixos();
      if (cancelled) return;
      setFixos(fx);
      setVariados((v.data as GastoVariado[]) ?? []);
      setEntradas((e.data as Entrada[]) ?? []);
      setMovs((m.data as Movimentacao[]) ?? []);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [key, seedFixos]); // eslint-disable-line react-hooks/exhaustive-deps

  // Mantém parcelas_pagas/situacao do parcelamento em sincronia com os "recebido" das parcelas.
  async function syncParcelamentoProgress(parcelamentoId: string) {
    const { count } = await supabase
      .from("entradas")
      .select("id", { count: "exact", head: true })
      .eq("parcelamento_id", parcelamentoId)
      .eq("recebido", "OK");
    const pagas = count ?? 0;
    const { data: parc } = await supabase
      .from("parcelamentos").select("num_parcelas,situacao").eq("id", parcelamentoId).single();
    const num = (parc as { num_parcelas?: number } | null)?.num_parcelas ?? 0;
    const patch: { parcelas_pagas: number; situacao?: string } = { parcelas_pagas: pagas };
    // Conclui automaticamente quando todas recebidas; reabre se voltar a faltar parcela.
    if (num > 0 && pagas >= num) patch.situacao = "Concluído";
    else if ((parc as { situacao?: string } | null)?.situacao === "Concluído") patch.situacao = "Ativo";
    await supabase.from("parcelamentos").update(patch).eq("id", parcelamentoId);
  }

  return {
    loading,
    fixos, variados, entradas, movs,
    api: {
      fixo: makeTable(supabase, "gastos_fixos", key, fixos, setFixos),
      variado: makeTable(supabase, "gastos_variados", key, variados, setVariados),
      entrada: makeTable(supabase, "entradas", key, entradas, setEntradas, async (row, patch) => {
        if ("recebido" in patch && row?.parcelamento_id) await syncParcelamentoProgress(row.parcelamento_id);
      }),
      mov: makeTable(supabase, "movimentacoes", key, movs, setMovs),
    },
  };
}
