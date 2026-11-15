// Integração com a Pluggy (Open Finance). Só roda no servidor: usa o
// CLIENT_SECRET, que nunca pode chegar ao navegador.
import "server-only";
import { PluggyClient, type Account, type Item, type Transaction } from "pluggy-sdk";
import type { SupabaseClient } from "@supabase/supabase-js";
import { montarHistorico, sugerirCategoria } from "@/lib/categorizacao";
import type { TipoConta } from "@/types";

export class PluggyNaoConfigurado extends Error {
  constructor() {
    super("Integração com bancos não configurada: defina PLUGGY_CLIENT_ID e PLUGGY_CLIENT_SECRET no servidor.");
  }
}

let cliente: PluggyClient | null = null;

/** Cliente da Pluggy (reaproveitado entre requisições; renova a API key sozinho). */
export function pluggy(): PluggyClient {
  const clientId = process.env.PLUGGY_CLIENT_ID;
  const clientSecret = process.env.PLUGGY_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new PluggyNaoConfigurado();
  cliente ??= new PluggyClient({ clientId, clientSecret });
  return cliente;
}

export interface PluggyItemRow {
  id: string;
  user_id: string;
  item_id: string;
  conector: string;
  status: string;
  ultima_sync: string | null;
}

const LOTE = 200;
/** Na primeira sincronização de uma conta, quanto do passado buscar. */
const DIAS_HISTORICO = 365;
/** Nas seguintes, quantos dias antes da última transação rebuscar (pega lançamentos que chegam atrasados). */
const DIAS_SOBREPOSICAO = 10;
/** Se o banco não manda novidades há mais que isso, pede para a Pluggy atualizar. */
const HORAS_PARA_ATUALIZAR = 12;

const dataBR = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" });

/** Date → "YYYY-MM-DD" no fuso de Brasília (a Pluggy manda a data em UTC). */
function isoBR(d: Date | string): string {
  return dataBR.format(new Date(d));
}

function diasAtras(n: number, base = new Date()): string {
  return isoBR(new Date(base.getTime() - n * 86_400_000));
}

function tipoDaConta(a: Account): TipoConta {
  if (a.type === "CREDIT" || a.subtype === "CREDIT_CARD") return "cartao";
  if (a.subtype === "SAVINGS_ACCOUNT") return "poupanca";
  return "corrente";
}

/** Saldo no padrão do app: no cartão, a fatura é negativa (dinheiro devido). */
function saldoDaConta(a: Account): number {
  const b = Number(a.balance) || 0;
  return tipoDaConta(a) === "cartao" ? -Math.abs(b) : b;
}

/** Valor com sinal: o `type` da Pluggy diz o sentido (DEBIT = saiu, CREDIT = entrou). */
function valorDaTransacao(t: Transaction): number {
  const v = Math.abs(Number(t.amountInAccountCurrency ?? t.amount) || 0);
  return Math.round((t.type === "DEBIT" ? -v : v) * 100) / 100;
}

function descricaoDaTransacao(t: Transaction): string {
  let d = (t.description || t.descriptionRaw || "").trim().replace(/\s+/g, " ");
  const m = t.creditCardMetadata;
  if (m?.installmentNumber && m.totalInstallments && m.totalInstallments > 1) {
    const parcela = `${m.installmentNumber}/${m.totalInstallments}`;
    if (!d.includes(parcela)) d += ` (${parcela})`;
  }
  return d.slice(0, 200) || "Transação";
}

/** Soma de todas as transações de uma conta, em páginas. */
async function somaTransacoes(supabase: SupabaseClient, contaId: string): Promise<number> {
  let total = 0;
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from("transacoes").select("valor")
      .eq("conta_id", contaId).order("id").range(from, from + 999);
    if (error) throw new Error(error.message);
    total += (data ?? []).reduce((s, r) => s + Number(r.valor), 0);
    if (!data || data.length < 1000) break;
  }
  return Math.round(total * 100) / 100;
}

/** Busca o item na Pluggy e garante que ele foi criado por `userId`. */
export async function itemDoUsuario(itemId: string, userId: string): Promise<Item> {
  const item = await pluggy().fetchItem(itemId);
  if (item.clientUserId !== userId) throw new Error("Esta conexão não pertence a este usuário.");
  return item;
}

function mensagemDeErro(item: Item): string | null {
  if (item.status === "LOGIN_ERROR") return "O banco recusou o login. Reconecte para continuar sincronizando.";
  if (item.status === "OUTDATED") return item.error?.message || "A última atualização falhou. Tente reconectar.";
  if (item.status === "WAITING_USER_ACTION" || item.status === "WAITING_USER_INPUT")
    return "O banco pede uma confirmação sua. Reconecte para continuar.";
  return null;
}

export interface ResultadoSync {
  contas: number;
  novas: number;
  /** A Pluggy foi avisada para buscar novidades no banco; chegam em alguns minutos. */
  atualizando: boolean;
  status: string;
}

/**
 * Ids de quem divide os dados com `userId` (ele + membros da família).
 * Filtro explícito: no webhook o cliente é admin e o RLS não se aplica.
 */
async function idsDaFamilia(supabase: SupabaseClient, userId: string): Promise<string[]> {
  const { data: eu } = await supabase.from("familia_membros").select("familia_id").eq("user_id", userId).maybeSingle();
  if (!eu?.familia_id) return [userId];
  const { data } = await supabase.from("familia_membros").select("user_id").eq("familia_id", eu.familia_id);
  const ids = new Set([userId, ...(data ?? []).map(m => m.user_id as string)]);
  return Array.from(ids);
}

/**
 * Traz contas, saldos e transações de um banco conectado para o app.
 * Funciona com o cliente do usuário logado (RLS) ou com o admin (webhook):
 * todas as consultas são limitadas à família do dono da conexão.
 */
export async function sincronizarItem(supabase: SupabaseClient, row: PluggyItemRow): Promise<ResultadoSync> {
  const api = pluggy();
  const item = await itemDoUsuario(row.item_id, row.user_id);
  const conector = item.connector?.name ?? row.conector;
  const familia = await idsDaFamilia(supabase, row.user_id);

  // Histórico de categorias da família, para categorizar como nas importações.
  const { data: hist } = await supabase.from("transacoes")
    .select("descricao,categoria").in("user_id", familia)
    .order("data", { ascending: false }).limit(3000);
  const historico = montarHistorico(((hist as { descricao: string; categoria: string }[]) ?? []).reverse());

  const { data: existentes, error: errContas } = await supabase.from("contas")
    .select("id,external_id,ordem").in("user_id", familia)
    .eq("origem", "pluggy").not("external_id", "is", null);
  if (errContas) throw new Error(errContas.message);
  const contaPorExterno = new Map((existentes ?? []).map(c => [c.external_id as string, c.id as string]));

  const { data: ultimaOrdem } = await supabase.from("contas")
    .select("ordem").in("user_id", familia).order("ordem", { ascending: false }).limit(1);
  let ordem = (ultimaOrdem?.[0]?.ordem ?? -1) + 1;

  const { results: accounts } = await api.fetchAccounts(row.item_id);
  let novas = 0;

  for (const acc of accounts) {
    let contaId = contaPorExterno.get(acc.id);
    let dateFrom = diasAtras(DIAS_HISTORICO);

    if (!contaId) {
      const { data, error } = await supabase.from("contas").insert({
        user_id: row.user_id,
        nome: (acc.marketingName || acc.name || conector).slice(0, 80),
        instituicao: conector,
        tipo: tipoDaConta(acc),
        saldo_inicial: 0,
        origem: "pluggy",
        external_id: acc.id,
        pluggy_item_id: row.item_id,
        ordem: ordem++,
      }).select("id").single();
      if (error) throw new Error(error.message);
      contaId = data.id as string;
    } else {
      const { data: ult } = await supabase.from("transacoes").select("data")
        .eq("conta_id", contaId).eq("origem", "pluggy")
        .order("data", { ascending: false }).limit(1);
      if (ult?.[0]?.data) dateFrom = diasAtras(DIAS_SOBREPOSICAO, new Date(`${ult[0].data}T12:00:00Z`));
    }

    // Transações pendentes mudam de id quando são confirmadas: entram só as confirmadas.
    const txs = (await api.fetchAllTransactions(acc.id, { dateFrom }))
      .filter(t => (t.status as string | undefined) !== "PENDING");

    for (let i = 0; i < txs.length; i += LOTE) {
      const rows = txs.slice(i, i + LOTE).map(t => {
        const valor = valorDaTransacao(t);
        const descricao = descricaoDaTransacao(t);
        return {
          user_id: row.user_id, conta_id: contaId, data: isoBR(t.date), descricao, valor,
          categoria: sugerirCategoria(descricao, valor, historico),
          origem: "pluggy", external_id: t.id,
        };
      });
      const { data, error } = await supabase.from("transacoes")
        .upsert(rows, { onConflict: "conta_id,external_id", ignoreDuplicates: true })
        .select("id");
      if (error) throw new Error(error.message);
      novas += data?.length ?? 0;
    }

    // Saldo do app = saldo informado pelo banco: ajusta o saldo inicial pela diferença.
    const soma = await somaTransacoes(supabase, contaId);
    const { error } = await supabase.from("contas")
      .update({ saldo_inicial: Math.round((saldoDaConta(acc) - soma) * 100) / 100 })
      .eq("id", contaId);
    if (error) throw new Error(error.message);
  }

  // Dados antigos e conexão saudável: pede à Pluggy para buscar novidades no banco.
  let atualizando = item.status === "UPDATING";
  const ultimaAtualizacao = item.lastUpdatedAt ? new Date(item.lastUpdatedAt).getTime() : 0;
  if (item.status === "UPDATED" && Date.now() - ultimaAtualizacao > HORAS_PARA_ATUALIZAR * 3_600_000) {
    try {
      await api.updateItem(row.item_id);
      atualizando = true;
    } catch { /* sem problema: tenta de novo na próxima sincronização */ }
  }

  await supabase.from("pluggy_itens").update({
    conector,
    conector_logo: item.connector?.imageUrl ?? null,
    status: atualizando ? "UPDATING" : item.status,
    erro: mensagemDeErro(item),
    ultima_sync: new Date().toISOString(),
  }).eq("id", row.id);

  return { contas: accounts.length, novas, atualizando, status: item.status };
}
