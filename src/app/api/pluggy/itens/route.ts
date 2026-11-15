import { itemDoUsuario, sincronizarItem, type PluggyItemRow } from "@/lib/pluggy/server";
import { comUsuario, lerJson } from "@/lib/pluggy/rota";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Registra o banco que o usuário acabou de conectar no widget e já traz os dados. */
export async function POST(req: Request) {
  const { itemId } = await lerJson<{ itemId: string }>(req);
  return comUsuario(async (supabase, user) => {
    if (!itemId) throw new Error("itemId obrigatório");
    const item = await itemDoUsuario(itemId, user.id);

    const { data: existente } = await supabase.from("pluggy_itens")
      .select("id,user_id,item_id,conector,status,ultima_sync").eq("item_id", itemId).maybeSingle();

    let row = existente as PluggyItemRow | null;
    if (!row) {
      const { data, error } = await supabase.from("pluggy_itens").insert({
        user_id: user.id,
        item_id: itemId,
        conector: item.connector?.name ?? "",
        conector_logo: item.connector?.imageUrl ?? null,
        status: item.status,
      }).select("id,user_id,item_id,conector,status,ultima_sync").single();
      if (error) throw new Error(error.message);
      row = data as PluggyItemRow;
    }

    return await sincronizarItem(supabase, row);
  });
}
