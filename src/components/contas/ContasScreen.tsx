"use client";

import { useMemo, useState } from "react";
import {
  ArchiveRestore, ArrowDownLeft, ArrowUpRight, ChartLine, CreditCard, Database, FileUp, Landmark,
  Plus, ReceiptText, Wallet,
} from "lucide-react";
import { CAT_TRANSFERENCIA, MESES, TIPOS_CONTA } from "@/lib/constants";
import { brl } from "@/lib/utils";
import { iconFor, iconForConta } from "@/lib/icons";
import { useContas, type DadosConta, type LinhaCategorizada, type NovaTransacao } from "@/hooks/useContas";
import { useFamilia } from "@/hooks/useFamilia";
import { useToast } from "@/components/ui/Toast";
import ConfirmModal from "@/components/ui/ConfirmModal";
import MonthStepper from "@/components/ui/MonthStepper";
import SectionCard, { EmptyRow } from "@/components/ui/SectionCard";
import StatCard from "@/components/ui/StatCard";
import { Skeleton, SectionSkeleton } from "@/components/ui/Skeleton";
import ItemRow from "@/components/lancamento/ItemRow";
import type { ResultadoOFX } from "@/lib/importacao";
import type { ContaComSaldo, Transacao } from "@/types";
import ContaModal from "./ContaModal";
import TransacaoModal from "./TransacaoModal";
import ImportModal from "./ImportModal";

const TIPO_LABEL = Object.fromEntries(TIPOS_CONTA.map(t => [t.v, t.label])) as Record<string, string>;

/** "−R$ 10,00" / "+R$ 10,00" / "R$ 10,00" */
function moeda(v: number, sinalPositivo = false) {
  if (v < 0) return "−" + brl(Math.abs(v));
  return (sinalPositivo && v > 0 ? "+" : "") + brl(v);
}

function rotuloDia(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  const txt = dt.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
  return txt.charAt(0).toUpperCase() + txt.slice(1);
}

export default function ContasScreen() {
  const now = new Date();
  const [mes, setMes] = useState(MESES[now.getMonth()]);
  const [ano, setAno] = useState(now.getFullYear());
  const fam = useFamilia();
  const c = useContas(mes, ano);
  const { show: toast } = useToast();

  const [pessoa, setPessoa] = useState<string>("todos");
  const [contaFiltro, setContaFiltro] = useState<string>("todas");
  const [contaModal, setContaModal] = useState<string | "new" | null>(null);
  const [txModal, setTxModal] = useState<string | "new" | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [confirmConta, setConfirmConta] = useState<string | null>(null);
  const [verArquivadas, setVerArquivadas] = useState(false);

  const emFamilia = fam.membros.length > 1;
  const contaPorId = useMemo(() => new Map(c.contas.map(x => [x.id, x])), [c.contas]);

  const daPessoa = (x: ContaComSaldo) => pessoa === "todos" || x.user_id === pessoa;
  const visiveis = c.contas.filter(daPessoa);
  const ativas = visiveis.filter(x => !x.arquivada);
  const arquivadas = visiveis.filter(x => x.arquivada);

  const soma = (tipos: string[]) => ativas.filter(x => tipos.includes(x.tipo)).reduce((s, x) => s + x.saldo, 0);
  const disponivel = soma(["corrente", "poupanca", "carteira", "outro"]);
  const investido = soma(["investimento"]);
  const cartoes = soma(["cartao"]);
  const patrimonio = disponivel + investido + cartoes;

  const transacoes = c.transacoes.filter(t => {
    const conta = contaPorId.get(t.conta_id);
    if (!conta || !daPessoa(conta)) return false;
    return contaFiltro === "todas" || t.conta_id === contaFiltro;
  });
  const contam = transacoes.filter(t => t.categoria !== CAT_TRANSFERENCIA);
  const entradas = contam.filter(t => t.valor > 0).reduce((s, t) => s + t.valor, 0);
  const saidas = contam.filter(t => t.valor < 0).reduce((s, t) => s - t.valor, 0);

  const porDia = useMemo(() => {
    const g = new Map<string, Transacao[]>();
    for (const t of transacoes) g.set(t.data, [...(g.get(t.data) ?? []), t]);
    return Array.from(g.entries());
  }, [transacoes]);

  const contaEditando = contaModal && contaModal !== "new" ? contaPorId.get(contaModal) ?? null : null;
  const txEditando = txModal && txModal !== "new" ? c.transacoes.find(t => t.id === txModal) ?? null : null;
  const contaPadrao = contaFiltro !== "todas" ? contaFiltro : undefined;

  async function tentar(fn: () => Promise<unknown>, ok?: string) {
    try {
      await fn();
      if (ok) toast(ok);
      return true;
    } catch (e) {
      toast("Erro: " + (e as Error).message, true);
      return false;
    }
  }

  async function salvarConta(dados: DadosConta, saldo: number) {
    const id = contaModal === "new" ? null : contaModal;
    if (await tentar(() => c.salvarConta(id, dados, saldo), id ? "Conta atualizada" : "Conta adicionada")) setContaModal(null);
  }

  async function excluirConta() {
    const id = confirmConta;
    setConfirmConta(null);
    setContaModal(null);
    if (!id) return;
    if (contaFiltro === id) setContaFiltro("todas");
    await tentar(() => c.excluirConta(id), "Conta excluída");
  }

  async function salvarTransacao(t: NovaTransacao) {
    const id = txModal === "new" ? null : txModal;
    const ok = await tentar(
      () => (id ? c.salvarTransacao(id, t) : c.criarTransacao(t)),
      id ? "Transação atualizada" : "Transação adicionada",
    );
    if (ok) setTxModal(null);
  }

  async function excluirTransacao(id: string) {
    setTxModal(null);
    try {
      const row = await c.excluirTransacao(id);
      toast(`“${row?.descricao || "Transação"}” excluída`, {
        action: row ? { label: "Desfazer", onClick: () => { tentar(() => c.restaurarTransacao(row)); } } : undefined,
      });
    } catch (e) {
      toast("Erro: " + (e as Error).message, true);
    }
  }

  async function importar(contaId: string, linhas: LinhaCategorizada[], saldo: ResultadoOFX["saldo"]) {
    const n = await c.importar(contaId, linhas, saldo);
    setImportOpen(false);
    toast(n === 0 ? (saldo ? "Saldo atualizado" : "Nada novo para importar")
      : `${n} ${n === 1 ? "transação importada" : "transações importadas"}`);
  }

  function renderConta(x: ContaComSaldo) {
    const cartao = x.tipo === "cartao";
    return (
      <ItemRow
        key={x.id}
        icon={iconForConta(x.tipo)}
        tone={cartao ? "expense" : x.tipo === "investimento" ? "brand" : "income"}
        title={x.nome}
        subtitle={[x.instituicao || TIPO_LABEL[x.tipo], emFamilia && pessoa === "todos" ? fam.nomeDe(x.user_id) : ""].filter(Boolean).join(" · ")}
        value={cartao ? (x.saldo < 0 ? `Fatura ${brl(-x.saldo)}` : moeda(x.saldo)) : moeda(x.saldo)}
        valueClass={!cartao && x.saldo < 0 ? "text-danger" : undefined}
        muted={x.arquivada}
        onOpen={() => setContaModal(x.id)}
      />
    );
  }

  if (fam.semMigracao) return <AvisoMigracao />;

  const semContas = !c.loading && c.contas.length === 0;

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <header className="bg-card border-b border-border px-4 md:px-8 h-16 flex items-center justify-between gap-2 flex-shrink-0">
        <h1 className="text-lg font-semibold text-heading">Contas</h1>
        {!semContas && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setImportOpen(true)}
              className="flex items-center gap-1.5 border border-border rounded-full px-3 md:pl-3 md:pr-4 py-2 text-sm font-semibold hover:bg-thead transition-colors"
            >
              <FileUp size={16} />
              <span className="hidden sm:inline">Importar extrato</span>
              <span className="sm:hidden">Importar</span>
            </button>
            <button
              onClick={() => setTxModal("new")}
              className="hidden md:flex bg-brand text-onbrand rounded-full pl-3 pr-4 py-2 text-sm font-semibold hover:bg-brand/90 active:scale-[.98] transition items-center gap-1.5"
            >
              <Plus size={17} strokeWidth={2.5} />
              Nova transação
            </button>
          </div>
        )}
      </header>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="max-w-3xl mx-auto px-3 md:px-8 py-4 md:py-6 pb-28 md:pb-10 space-y-4 md:space-y-5">
          {emFamilia && (
            <div className="inline-flex rounded-xl bg-thead p-1 max-w-full overflow-x-auto" role="group" aria-label="De quem">
              {[{ v: "todos", label: "Família" }, ...fam.membros.map(m => ({ v: m.user_id, label: m.user_id === fam.userId ? `${m.nome} (você)` : m.nome }))].map(o => (
                <button
                  key={o.v}
                  type="button"
                  onClick={() => { setPessoa(o.v); setContaFiltro("todas"); }}
                  aria-pressed={pessoa === o.v}
                  className={`rounded-lg px-3.5 py-1.5 text-sm font-medium whitespace-nowrap transition ${
                    pessoa === o.v ? "bg-card text-apptext shadow-sm" : "text-muted hover:text-apptext"
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          )}

          {c.loading ? (
            <>
              <Skeleton className="h-32 rounded-2xl" />
              <SectionSkeleton rows={3} />
            </>
          ) : semContas ? (
            <div className="bg-card border border-border rounded-2xl px-6 py-12 text-center">
              <span className="size-12 mx-auto grid place-items-center rounded-2xl bg-brand/10 text-brand mb-4">
                <Landmark size={22} />
              </span>
              <p className="text-[17px] font-semibold text-heading">Cadastre suas contas</p>
              <p className="text-sm text-muted mt-1.5 max-w-sm mx-auto leading-relaxed">
                Conta corrente, cartão de crédito, investimentos… Depois é só importar o extrato (OFX ou CSV) que o app
                calcula saldos e categoriza os gastos.
              </p>
              <button onClick={() => setContaModal("new")}
                className="mt-5 inline-flex items-center gap-1.5 bg-brand text-onbrand rounded-full pl-3 pr-4 py-2.5 text-sm font-semibold hover:bg-brand/90 transition">
                <Plus size={17} strokeWidth={2.5} />
                Adicionar conta
              </button>
            </div>
          ) : (
            <>
              {/* Patrimônio */}
              <section className="bg-card border border-border rounded-2xl p-5 md:p-6">
                <p className="text-sm font-medium text-muted">
                  Patrimônio {pessoa === "todos" ? (emFamilia ? "da família" : "") : `de ${fam.nomeDe(pessoa)}`}
                </p>
                <p className={`mt-1 text-[40px] md:text-5xl leading-none font-semibold tracking-tight tabular-nums ${patrimonio >= 0 ? "text-heading" : "text-danger"}`}>
                  {moeda(patrimonio)}
                </p>
                <div className="mt-4 grid grid-cols-3 gap-3">
                  <Parcela icon={Wallet} label="Em conta" value={disponivel} />
                  <Parcela icon={ChartLine} label="Investido" value={investido} />
                  <Parcela icon={CreditCard} label="Cartões" value={cartoes} />
                </div>
              </section>

              <SectionCard
                icon={Landmark}
                tone="brand"
                title="Contas"
                meta={`${ativas.length} ${ativas.length === 1 ? "conta" : "contas"}`}
                onAdd={() => setContaModal("new")}
              >
                {ativas.length === 0 ? (
                  <EmptyRow>Nenhuma conta ativa{pessoa !== "todos" ? " desta pessoa" : ""}.</EmptyRow>
                ) : (
                  <div className="divide-y divide-border">{ativas.map(renderConta)}</div>
                )}
                {arquivadas.length > 0 && (
                  <>
                    <button
                      type="button"
                      onClick={() => setVerArquivadas(v => !v)}
                      className="w-full flex items-center gap-2 px-4 md:px-5 py-2.5 border-t border-border text-[13px] font-medium text-muted hover:text-apptext hover:bg-rowhover transition-colors"
                    >
                      <ArchiveRestore size={15} />
                      {verArquivadas ? "Esconder arquivadas" : `Ver ${arquivadas.length} ${arquivadas.length === 1 ? "arquivada" : "arquivadas"}`}
                    </button>
                    {verArquivadas && <div className="divide-y divide-border border-t border-border">{arquivadas.map(renderConta)}</div>}
                  </>
                )}
              </SectionCard>

              {/* Transações do mês */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                <div className="flex justify-center sm:justify-start">
                  <MonthStepper mes={mes} ano={ano} onChange={(m, a) => { setMes(m); setAno(a); }} />
                </div>
                <select
                  value={contaFiltro}
                  onChange={e => setContaFiltro(e.target.value)}
                  aria-label="Filtrar por conta"
                  className="border border-border rounded-full bg-card px-4 py-2 text-sm font-medium outline-none focus:border-accent"
                >
                  <option value="todas">Todas as contas</option>
                  {visiveis.map(x => <option key={x.id} value={x.id}>{x.nome}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <StatCard icon={ArrowDownLeft} tone="income" label="Entrou" value={brl(entradas)} />
                <StatCard icon={ArrowUpRight} tone="expense" label="Saiu" value={brl(saidas)} />
              </div>

              <SectionCard
                icon={ReceiptText}
                tone="neutral"
                title="Transações"
                meta={c.loadingMes ? "Carregando…" : `${transacoes.length} no mês · transferências não entram nos totais`}
                onAdd={() => setTxModal("new")}
              >
                {c.loadingMes ? (
                  <div className="p-4 space-y-3">{[0, 1, 2].map(i => <Skeleton key={i} className="h-10" />)}</div>
                ) : transacoes.length === 0 ? (
                  <EmptyRow>
                    Nenhuma transação neste mês.{" "}
                    <button type="button" onClick={() => setImportOpen(true)} className="text-brand font-semibold hover:underline">
                      Importar extrato
                    </button>
                  </EmptyRow>
                ) : (
                  porDia.map(([dia, lista]) => (
                    <div key={dia}>
                      <div className="px-4 md:px-5 py-1.5 bg-thead/60 border-y border-border first:border-t-0 flex justify-between text-xs font-medium text-muted">
                        <span>{rotuloDia(dia)}</span>
                        <span className="tabular-nums">{moeda(lista.reduce((s, t) => s + t.valor, 0), true)}</span>
                      </div>
                      <div className="divide-y divide-border">
                        {lista.map(t => {
                          const conta = contaPorId.get(t.conta_id);
                          const transf = t.categoria === CAT_TRANSFERENCIA;
                          return (
                            <ItemRow
                              key={t.id}
                              icon={iconFor(t.categoria)}
                              tone={transf ? "neutral" : t.valor > 0 ? "income" : "expense"}
                              title={t.descricao}
                              subtitle={[t.categoria, contaFiltro === "todas" ? conta?.nome : "",
                                emFamilia && pessoa === "todos" && conta ? fam.nomeDe(conta.user_id) : ""].filter(Boolean).join(" · ")}
                              value={moeda(t.valor, true)}
                              valueClass={t.valor > 0 ? "text-income" : undefined}
                              muted={transf}
                              onOpen={() => setTxModal(t.id)}
                              onDelete={() => excluirTransacao(t.id)}
                            />
                          );
                        })}
                      </div>
                    </div>
                  ))
                )}
              </SectionCard>
            </>
          )}
        </div>
      </div>

      {!c.loading && !semContas && (
        <button
          type="button"
          onClick={() => setTxModal("new")}
          aria-label="Nova transação"
          className="md:hidden fixed z-sticky right-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] size-14 grid place-items-center rounded-2xl bg-brand text-onbrand shadow-[0_8px_24px_-4px] shadow-brand/50 active:scale-95 transition"
        >
          <Plus size={26} strokeWidth={2.5} />
        </button>
      )}

      <ContaModal
        open={contaModal !== null}
        initial={contaEditando}
        membros={fam.membros}
        userId={fam.userId}
        onSave={salvarConta}
        onDelete={contaEditando ? () => setConfirmConta(contaEditando.id) : undefined}
        onClose={() => setContaModal(null)}
      />
      <TransacaoModal
        open={txModal !== null}
        initial={txEditando}
        contas={c.contas}
        contaPadrao={contaPadrao}
        onSave={salvarTransacao}
        onDelete={txEditando ? () => excluirTransacao(txEditando.id) : undefined}
        onClose={() => setTxModal(null)}
      />
      <ImportModal
        open={importOpen}
        contas={visiveis.length ? visiveis : c.contas}
        contaPadrao={contaPadrao}
        preparar={c.prepararImportacao}
        onImport={importar}
        onClose={() => setImportOpen(false)}
      />
      <ConfirmModal
        open={confirmConta !== null}
        title="Excluir conta?"
        message="A conta e todas as transações dela serão apagadas. Se quiser só tirar da lista mantendo o histórico, use “Arquivar conta”."
        onConfirm={excluirConta}
        onCancel={() => setConfirmConta(null)}
      />
    </div>
  );
}

function Parcela({ icon: Icon, label, value }: { icon: typeof Wallet; label: string; value: number }) {
  return (
    <div className="min-w-0">
      <p className="flex items-center gap-1.5 text-xs text-muted"><Icon size={13} />{label}</p>
      <p className={`text-[15px] font-semibold tabular-nums truncate ${value < 0 ? "text-danger" : ""}`}>{moeda(value)}</p>
    </div>
  );
}

function AvisoMigracao() {
  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <header className="bg-card border-b border-border px-4 md:px-8 h-16 flex items-center flex-shrink-0">
        <h1 className="text-lg font-semibold text-heading">Contas</h1>
      </header>
      <div className="max-w-xl mx-auto px-4 py-10 text-center">
        <span className="size-12 mx-auto grid place-items-center rounded-2xl bg-warning-soft text-warning-ink mb-4">
          <Database size={22} />
        </span>
        <p className="text-[17px] font-semibold text-heading">Falta atualizar o banco de dados</p>
        <p className="text-sm text-muted mt-2 leading-relaxed">
          Rode o arquivo <code className="px-1 rounded bg-thead">supabase/fase1_familia_contas.sql</code> no SQL Editor do
          Supabase para liberar contas, transações e o painel da família.
        </p>
      </div>
    </div>
  );
}
