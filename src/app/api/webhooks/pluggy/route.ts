import { NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
import type { SupabaseClient } from "@supabase/supabase-js";
import { sincronizarItem, type PluggyItemRow } from "@/lib/pluggy/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Eventos que significam "há dados novos": basta sincronizar o item. */
const SINCRONIZAR = new Set(["item/created", "item/updated", "item/login_succeeded", "transactions/created", "transactions/updated"]);

interface Aviso {
  event?: string;
  eventId?: string;
  itemId?: string;
  accountId?: string;
  transactionIds?: string[];
  error?: { code?: string; message?: string };
}

const ok = () => NextResponse.json({ ok: true });

/**
 * Avisos da Pluggy (webhook). Responde 200 na hora e processa em segundo plano.
 *
 * Segurança: o corpo do aviso só diz QUAL conexão mudou. Os dados vêm sempre
 * da API da Pluggy, e só para conexões já cadastradas no app. Se
 * PLUGGY_WEBHOOK_SECRET estiver definida, o aviso precisa trazer o header
 * `x-webhook-secret` com o mesmo valor (configurável no cadastro do webhook).
 */
export async function POST(req: Request) {
  const segredo = process.env.PLUGGY_WEBHOOK_SECRET;
  if (segredo && req.headers.get("x-webhook-secret") !== segredo) {
    return NextResponse.json({ error: "não autorizado" }, { status: 401 });
  }

  let aviso: Aviso;
  try { aviso = await req.json(); } catch { return ok(); }
  if (!aviso.event || !aviso.itemId) return ok(); // ex: connector/status_updated, pagamentos

  waitUntil(processar(aviso).catch(e => console.error("[pluggy webhook]", aviso.event, aviso.itemId, e)));
  return ok();
}

async function processar(aviso: Aviso) {
  const supabase = createAdminClient();
  const { data: row } = await supabase.from("pluggy_itens")
    .select("id,user_id,item_id,conector,status,ultima_sync").eq("item_id", aviso.itemId!).maybeSingle();
  if (!row) return; // conexão que o app não conhece (ou ainda não registrou)

  switch (aviso.event) {
    case "item/error":
      await supabase.from("pluggy_itens").update({
        status: "OUTDATED", erro: aviso.error?.message || "A última atualização falhou. Tente reconectar.",
      }).eq("id", row.id);
      return;
    case "item/waiting_user_action":
    case "item/waiting_user_input":
      await supabase.from("pluggy_itens").update({
        status: "WAITING_USER_ACTION", erro: "O banco pede uma confirmação sua. Reconecte para continuar.",
      }).eq("id", row.id);
      return;
    case "item/deleted":
      await desvincular(supabase, row.id, row.item_id);
      return;
    case "transactions/deleted":
      await apagarTransacoes(supabase, row.item_id, aviso.accountId, aviso.transactionIds ?? []);
      return;
    default:
      if (SINCRONIZAR.has(aviso.event!)) await sincronizarItem(supabase, row as PluggyItemRow);
  }
}

/** A conexão foi removida na Pluggy: contas viram manuais e a linha some. */
async function desvincular(supabase: SupabaseClient, id: string, itemId: string) {
  await supabase.from("contas").update({ origem: "manual", pluggy_item_id: null }).eq("pluggy_item_id", itemId);
  await supabase.from("pluggy_itens").delete().eq("id", id);
}

async function apagarTransacoes(supabase: SupabaseClient, itemId: string, accountId: string | undefined, ids: string[]) {
  if (!accountId || ids.length === 0) return;
  const { data: conta } = await supabase.from("contas").select("id")
    .eq("origem", "pluggy").eq("external_id", accountId).eq("pluggy_item_id", itemId).maybeSingle();
  if (!conta) return;
  for (let i = 0; i < ids.length; i += 200) {
    await supabase.from("transacoes").delete()
      .eq("conta_id", conta.id).eq("origem", "pluggy").in("external_id", ids.slice(i, i + 200));
  }
}
