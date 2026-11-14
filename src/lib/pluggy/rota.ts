import "server-only";
import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { PluggyNaoConfigurado } from "./server";

type Supabase = Awaited<ReturnType<typeof createClient>>;

/** Executa o handler com o usuário logado e converte erros em JSON `{ error }`. */
export async function comUsuario(fn: (supabase: Supabase, user: User) => Promise<unknown>) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    return NextResponse.json(await fn(supabase, user));
  } catch (e) {
    const status = e instanceof PluggyNaoConfigurado ? 503 : 500;
    const msg = e instanceof Error ? e.message : "Erro inesperado";
    console.error("[pluggy]", msg);
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function lerJson<T>(req: Request): Promise<Partial<T>> {
  try { return (await req.json()) as Partial<T>; } catch { return {}; }
}
