import { sincronizarItem, type PluggyItemRow } from "@/lib/pluggy/server";
import { comUsuario, lerJson } from "@/lib/pluggy/rota";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Sincroniza um banco conectado (`id` da linha em pluggy_itens) ou todos os visíveis. */
export async function POST(req: Request) {
  const { id } = await lerJson<{ id: string }>(req);
  return comUsuario(async supabase => {
    let q = supabase.from("pluggy_itens").select("id,user_id,item_id,conector,status,ultima_sync");
    if (id) q = q.eq("id", id);
    const { data, error } = await q;
    if (error) throw new Error(error.message);

    const resultados = [];
    for (const row of (data ?? []) as PluggyItemRow[]) {
      try {
        resultados.push({ id: row.id, ok: true as const, ...(await sincronizarItem(supabase, row)) });
      } catch (e) {
        const erro = e instanceof Error ? e.message : "Erro inesperado";
        if (id) throw e;
        resultados.push({ id: row.id, ok: false as const, erro });
      }
    }
    return { resultados };
  });
}
