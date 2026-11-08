"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { MESES } from "@/lib/constants";
import { montarHistorico, sugerirCategoria } from "@/lib/categorizacao";
import type { LinhaImportada } from "@/lib/importacao";
import type { Conta, ContaComSaldo, Transacao } from "@/types";

type SupabaseClient = ReturnType<typeof createClient>;
export type NovaTransacao = Omit<Transacao, "id" | "user_id" | "created_at">;
export type DadosConta = Pick<Conta, "nome" | "instituicao" | "tipo" | "arquivada" | "user_id">;
export type LinhaCategorizada = LinhaImportada & { categoria: string };

const LOTE = 200;

/** Primeiro dia do mês e primeiro dia do mês seguinte, no formato YYYY-MM-DD. */
function intervaloDoMes(mes: string, ano: number): [string, string] {
  const m = MESES.indexOf(mes);
  const ini = `${ano}-${String(m + 1).padStart(2, "0")}-01`;
  const prox = m === 11 ? `${ano + 1}-01-01` : `${ano}-${String(m + 2).padStart(2, "0")}-01`;
  return [ini, prox];
}

/** Soma dos valores das transações de uma conta (opcionalmente até uma data), em páginas. */
async function somaTransacoes(supabase: SupabaseClient, contaId: string, ateData?: string): Promise<number> {
  let total = 0;
  for (let from = 0; ; from += 1000) {
    let q = supabase.from("transacoes").select("valor").eq("conta_id", contaId);
    if (ateData) q = q.lte("data", ateData);
    const { data, error } = await q.order("id").range(from, from + 999);
    if (error) throw new Error(error.message);
    total += (data ?? []).reduce((s, r) => s + Number(r.valor), 0);
    if (!data || data.length < 1000) break;
  }
  return Math.round(total * 100) / 100;
}

export function useContas(mes: string, ano: number) {
  const [supabase] = useState(createClient);
  const [contas, setContas] = useState<ContaComSaldo[]>([]);
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [loadingContas, setLoadingContas] = useState(true);
  const [loadingMes, setLoadingMes] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [ini, prox] = intervaloDoMes(mes, ano);

  const loadContas = useCallback(async () => {
    const { data, error } = await supabase
      .from("contas_saldo").select("*").order("ordem").order("created_at");
    if (error) setErro(error.message);
    setContas(((data as ContaComSaldo[]) ?? []).map(c => ({
      ...c, saldo: Number(c.saldo), saldo_inicial: Number(c.saldo_inicial),
    })));
    setLoadingContas(false);
  }, [supabase]);

  const loadMes = useCallback(async () => {
    setLoadingMes(true);
    const out: Transacao[] = [];
    for (let from = 0; ; from += 1000) {
      const { data, error } = await supabase
        .from("transacoes").select("*")
        .gte("data", ini).lt("data", prox)
        .order("data", { ascending: false }).order("created_at", { ascending: false })
        .range(from, from + 999);
      if (error) { setErro(error.message); break; }
      out.push(...((data as Transacao[]) ?? []).map(t => ({ ...t, valor: Number(t.valor) })));
      if (!data || data.length < 1000) break;
    }
    setTransacoes(out);
    setLoadingMes(false);
  }, [supabase, ini, prox]);

  useEffect(() => { loadContas(); }, [loadContas]);
  useEffect(() => { loadMes(); }, [loadMes]);

  const noMes = (data: string) => data >= ini && data < prox;
  const ordenar = (a: Transacao, b: Transacao) =>
    b.data.localeCompare(a.data) || b.created_at.localeCompare(a.created_at);

  // ---- Contas ----

  async function salvarConta(id: string | null, dados: DadosConta, saldoAtual: number) {
    if (id) {
      const { error } = await supabase.from("contas").update(dados).eq("id", id);
      if (error) throw new Error(error.message);
      await ajustarSaldo(id, saldoAtual);
    } else {
      const ordem = contas.reduce((m, c) => Math.max(m, c.ordem + 1), 0);
      const { error } = await supabase.from("contas").insert({ ...dados, saldo_inicial: saldoAtual, ordem });
      if (error) throw new Error(error.message);
    }
    await loadContas();
  }

  async function excluirConta(id: string) {
    const { error } = await supabase.from("contas").delete().eq("id", id);
    if (error) throw new Error(error.message);
    setTransacoes(prev => prev.filter(t => t.conta_id !== id));
    await loadContas();
  }

  /**
   * Faz o saldo da conta bater com o valor informado (pelo usuário ou pelo extrato),
   * recalculando o saldo inicial a partir das transações registradas até `ateData`.
   */
  async function ajustarSaldo(contaId: string, saldo: number, ateData?: string) {
    const soma = await somaTransacoes(supabase, contaId, ateData);
    const { error } = await supabase.from("contas")
      .update({ saldo_inicial: Math.round((saldo - soma) * 100) / 100 }).eq("id", contaId);
    if (error) throw new Error(error.message);
  }

  // ---- Transações ----

  async function criarTransacao(t: NovaTransacao) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data, error } = await supabase.from("transacoes").insert({ ...t, user_id: user.id }).select().single();
    if (error) throw new Error(error.message);
    const nova = { ...(data as Transacao), valor: Number(data.valor) };
    if (noMes(nova.data)) setTransacoes(prev => [...prev, nova].sort(ordenar));
    await loadContas();
  }

  async function salvarTransacao(id: string, patch: Partial<NovaTransacao>) {
    const { error } = await supabase.from("transacoes").update(patch).eq("id", id);
    if (error) throw new Error(error.message);
    setTransacoes(prev => prev
      .map(t => (t.id === id ? { ...t, ...patch } : t))
      .filter(t => noMes(t.data))
      .sort(ordenar));
    await loadContas();
  }

  async function excluirTransacao(id: string): Promise<Transacao | undefined> {
    const row = transacoes.find(t => t.id === id);
    setTransacoes(prev => prev.filter(t => t.id !== id));
    const { error } = await supabase.from("transacoes").delete().eq("id", id);
    if (error) throw new Error(error.message);
    await loadContas();
    return row;
  }

  async function restaurarTransacao(row: Transacao) {
    const { error } = await supabase.from("transacoes").insert(row);
    if (error) throw new Error(error.message);
    if (noMes(row.data)) setTransacoes(prev => [...prev.filter(t => t.id !== row.id), row].sort(ordenar));
    await loadContas();
  }

  // ---- Importação de extrato ----

  /** Separa as linhas que já existem na conta e sugere categoria para as novas. */
  async function prepararImportacao(contaId: string, linhas: LinhaImportada[]) {
    const existentes = new Set<string>();
    const ids = Array.from(new Set(linhas.map(l => l.external_id)));
    for (let i = 0; i < ids.length; i += LOTE) {
      const { data, error } = await supabase.from("transacoes")
        .select("external_id").eq("conta_id", contaId).in("external_id", ids.slice(i, i + LOTE));
      if (error) throw new Error(error.message);
      (data ?? []).forEach(r => r.external_id && existentes.add(r.external_id));
    }

    // Histórico de categorias da família (últimas 3000 transações), para aprender com as escolhas anteriores.
    const { data: hist } = await supabase.from("transacoes")
      .select("descricao,categoria").order("data", { ascending: false }).limit(3000);
    const historico = montarHistorico(((hist as { descricao: string; categoria: string }[]) ?? []).reverse());

    const novas: LinhaCategorizada[] = linhas
      .filter(l => !existentes.has(l.external_id))
      .map(l => ({ ...l, categoria: sugerirCategoria(l.descricao, l.valor, historico) }));
    return { novas, duplicadas: linhas.length - novas.length };
  }

  async function importar(contaId: string, linhas: LinhaCategorizada[], saldo?: { valor: number; data: string } | null) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuário não autenticado");
    let inseridas = 0;
    for (let i = 0; i < linhas.length; i += LOTE) {
      const rows = linhas.slice(i, i + LOTE).map(l => ({
        user_id: user.id, conta_id: contaId, data: l.data, descricao: l.descricao,
        valor: l.valor, categoria: l.categoria, origem: "importacao", external_id: l.external_id,
      }));
      const { data, error } = await supabase.from("transacoes")
        .upsert(rows, { onConflict: "conta_id,external_id", ignoreDuplicates: true })
        .select("id");
      if (error) throw new Error(error.message);
      inseridas += data?.length ?? 0;
    }
    if (saldo) await ajustarSaldo(contaId, saldo.valor, saldo.data);
    await Promise.all([loadContas(), loadMes()]);
    return inseridas;
  }

  return {
    loading: loadingContas, loadingMes, erro,
    contas, transacoes,
    salvarConta, excluirConta,
    criarTransacao, salvarTransacao, excluirTransacao, restaurarTransacao,
    prepararImportacao, importar,
  };
}
