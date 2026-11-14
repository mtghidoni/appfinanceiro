import { pluggy } from "@/lib/pluggy/server";
import { comUsuario, lerJson } from "@/lib/pluggy/rota";

export const dynamic = "force-dynamic";

/**
 * Token de curta duração para abrir o widget Pluggy Connect no navegador.
 * Com `itemId`, abre no modo "reconectar" daquela conexão.
 */
export async function POST(req: Request) {
  const { itemId } = await lerJson<{ itemId: string }>(req);
  return comUsuario(async (supabase, user) => {
    if (itemId) {
      // Só reconecta uma conexão visível para o usuário (RLS da família).
      const { data } = await supabase.from("pluggy_itens").select("item_id").eq("item_id", itemId).maybeSingle();
      if (!data) throw new Error("Conexão não encontrada");
    }
    const { accessToken } = await pluggy().createConnectToken(itemId || undefined, {
      clientUserId: user.id,
      avoidDuplicates: true,
    });
    return { accessToken };
  });
}
