"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { PluggyItem } from "@/types";

export interface ResultadoSync {
  contas: number;
  novas: number;
  atualizando: boolean;
  status: string;
}

async function api<T>(url: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const res = await fetch(url, {
    method: init?.method ?? "POST",
    headers: { "Content-Type": "application/json" },
    body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
  const json = await res.json().catch(() => ({ error: "Resposta inválida do servidor" }));
  if (!res.ok || json.error) throw new Error(json.error || `Erro ${res.status}`);
  return json as T;
}

/** Sincroniza sozinho ao abrir a tela se a última vez foi há mais que isso. */
const HORAS_AUTO_SYNC = 6;

/** Bancos conectados pela Pluggy: listar, conectar, sincronizar e desconectar. */
export function usePluggy(onDadosMudaram: () => void) {
  const [supabase] = useState(createClient);
  const [itens, setItens] = useState<PluggyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [semMigracao, setSemMigracao] = useState(false);
  const [sincronizando, setSincronizando] = useState<Set<string>>(new Set());
  // Sempre a versão mais recente do callback (ex: mês selecionado na tela).
  const mudou = useRef(onDadosMudaram);
  mudou.current = onDadosMudaram;

  const load = useCallback(async () => {
    const { data, error } = await supabase.from("pluggy_itens").select("*").order("created_at");
    if (error) {
      // Tabela ainda não existe: falta rodar supabase/fase2_pluggy.sql.
      setSemMigracao(error.code === "42P01" || /pluggy_itens/.test(error.message));
      setItens([]);
    } else {
      setSemMigracao(false);
      setItens((data as PluggyItem[]) ?? []);
    }
    setLoading(false);
    return (data as PluggyItem[] | null) ?? [];
  }, [supabase]);

  const marcar = (id: string, on: boolean) =>
    setSincronizando(prev => { const s = new Set(prev); if (on) s.add(id); else s.delete(id); return s; });

  /** Token para abrir o widget. Com itemId (id da Pluggy), abre para reconectar. */
  async function connectToken(itemId?: string) {
    const { accessToken } = await api<{ accessToken: string }>("/api/pluggy/connect-token", { body: { itemId } });
    return accessToken;
  }

  /** Chamado quando o widget termina com sucesso: registra a conexão e traz os dados. */
  async function registrar(itemId: string) {
    marcar(itemId, true);
    try {
      const r = await api<ResultadoSync>("/api/pluggy/itens", { body: { itemId } });
      await load();
      mudou.current();
      return r;
    } finally {
      marcar(itemId, false);
    }
  }

  async function sincronizar(item: PluggyItem) {
    marcar(item.id, true);
    try {
      const { resultados } = await api<{ resultados: (ResultadoSync & { id: string })[] }>(
        "/api/pluggy/sync", { body: { id: item.id } });
      await load();
      mudou.current();
      return resultados[0];
    } finally {
      marcar(item.id, false);
    }
  }

  async function desconectar(item: PluggyItem) {
    await api(`/api/pluggy/itens/${item.id}`, { method: "DELETE" });
    await load();
    mudou.current();
  }

  // Ao abrir: carrega e, se faz tempo, sincroniza em segundo plano.
  useEffect(() => {
    let vivo = true;
    (async () => {
      const lista = await load();
      const limite = Date.now() - HORAS_AUTO_SYNC * 3_600_000;
      const velhos = lista.filter(i => !i.ultima_sync || new Date(i.ultima_sync).getTime() < limite);
      if (!vivo || velhos.length === 0) return;
      velhos.forEach(i => marcar(i.id, true));
      try {
        await api("/api/pluggy/sync", { body: {} });
        if (!vivo) return;
        await load();
        mudou.current();
      } catch { /* silencioso: o usuário pode sincronizar manualmente */ }
      finally { velhos.forEach(i => marcar(i.id, false)); }
    })();
    return () => { vivo = false; };
  }, [load]);

  return { itens, loading, semMigracao, sincronizando, connectToken, registrar, sincronizar, desconectar };
}
