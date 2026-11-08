"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Familia, MembroFamilia } from "@/types";

// Erros do PostgREST quando a tabela/função ainda não existe (migração da fase 1 não rodada).
const SEM_MIGRACAO = new Set(["42P01", "PGRST202", "PGRST205"]);

/** Família do usuário logado: membros, convite e ações de criar/entrar/sair. */
export function useFamilia() {
  const [supabase] = useState(createClient);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [familia, setFamilia] = useState<Familia | null>(null);
  const [membros, setMembros] = useState<MembroFamilia[]>([]);
  const [semMigracao, setSemMigracao] = useState(false);

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUserId(user?.id ?? null);
    const [f, m] = await Promise.all([
      supabase.from("familias").select("*").maybeSingle(),
      supabase.from("familia_membros").select("*").order("created_at"),
    ]);
    if (f.error && SEM_MIGRACAO.has(f.error.code)) setSemMigracao(true);
    setFamilia((f.data as Familia) ?? null);
    setMembros((m.data as MembroFamilia[]) ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  async function rpc(fn: string, args?: Record<string, unknown>) {
    const { data, error } = await supabase.rpc(fn, args);
    if (error) throw new Error(error.message);
    await load();
    return data;
  }

  /** Nome de exibição de um usuário da família ("Você" quando não está em família). */
  function nomeDe(uid: string): string {
    const m = membros.find(x => x.user_id === uid);
    if (m?.nome) return m.nome;
    return uid === userId ? "Você" : "Outro membro";
  }

  return {
    loading, userId, familia, membros, semMigracao,
    nomeDe,
    reload: load,
    criar: (nome: string) => rpc("criar_familia", { p_nome: nome }),
    entrar: (codigo: string) => rpc("entrar_familia", { p_codigo: codigo }),
    sair: () => rpc("sair_familia"),
    renomear: (nome: string) => rpc("definir_meu_nome", { p_nome: nome }),
    novoCodigo: () => rpc("novo_codigo_convite"),
  };
}
