import { pluggy } from "@/lib/pluggy/server";
import { comUsuario } from "@/lib/pluggy/rota";

export const dynamic = "force-dynamic";

/**
 * Desconecta um banco: apaga a conexão na Pluggy e no app. As contas e
 * transações já trazidas continuam no app, como contas manuais.
 */
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  return comUsuario(async supabase => {
    const { data: row, error } = await supabase.from("pluggy_itens")
      .select("id,item_id").eq("id", params.id).maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Conexão não encontrada");

    try {
      await pluggy().deleteItem(row.item_id);
    } catch (e) {
      // Já removida na Pluggy (404): segue para limpar no app.
      const status = (e as { response?: { statusCode?: number } })?.response?.statusCode;
      if (status !== 404) throw e;
    }

    const { error: errContas } = await supabase.from("contas")
      .update({ origem: "manual", pluggy_item_id: null })
      .eq("pluggy_item_id", row.item_id);
    if (errContas) throw new Error(errContas.message);

    const { error: errDel } = await supabase.from("pluggy_itens").delete().eq("id", row.id);
    if (errDel) throw new Error(errDel.message);
    return { ok: true };
  });
}
