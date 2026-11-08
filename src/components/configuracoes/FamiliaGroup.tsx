"use client";

import { useState } from "react";
import { Check, Copy, LogOut, RefreshCw, Users } from "lucide-react";
import ConfirmModal from "@/components/ui/ConfirmModal";
import { useToast } from "@/components/ui/Toast";
import { useFamilia } from "@/hooks/useFamilia";

const INPUT =
  "flex-1 min-w-0 border border-border rounded-xl px-3.5 py-2.5 text-[15px] bg-bg text-apptext outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition placeholder:text-muted/70";
const BTN =
  "shrink-0 rounded-full bg-brand text-onbrand px-4 py-2.5 text-sm font-semibold hover:bg-brand/90 active:scale-[.98] transition disabled:opacity-40 disabled:pointer-events-none";

/** Bloco "Família" das configurações: criar, convidar, entrar e sair. */
export default function FamiliaGroup() {
  const fam = useFamilia();
  const { show: toast } = useToast();
  const [codigo, setCodigo] = useState("");
  const [nome, setNome] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [confirmSair, setConfirmSair] = useState(false);

  async function run(fn: () => Promise<unknown>, ok: string, reload = false) {
    setBusy(true);
    try {
      await fn();
      toast(ok);
      // As outras telas leem os dados ao abrir; recarregar garante que reflitam a família.
      if (reload) setTimeout(() => window.location.reload(), 600);
    } catch (e) {
      toast((e as Error).message, true);
    } finally {
      setBusy(false);
    }
  }

  async function copiar() {
    if (!fam.familia) return;
    const texto = `Entre na nossa família no Controle Financeiro com o código ${fam.familia.codigo_convite} (Ajustes → Família → Entrar com código).`;
    try {
      if (navigator.share) await navigator.share({ text: texto });
      else {
        await navigator.clipboard.writeText(fam.familia.codigo_convite);
        setCopiado(true);
        setTimeout(() => setCopiado(false), 2000);
      }
    } catch { /* compartilhamento cancelado */ }
  }

  const eu = fam.membros.find(m => m.user_id === fam.userId);

  return (
    <section>
      <h2 className="px-1 mb-2 text-sm font-semibold text-muted">Família</h2>
      <div className="bg-card border border-border rounded-2xl overflow-hidden divide-y divide-border">
        {fam.loading ? (
          <div className="px-4 py-3.5 text-sm text-muted">Carregando…</div>
        ) : fam.semMigracao ? (
          <div className="px-4 py-3.5 text-sm text-muted leading-relaxed">
            Para usar a família, rode <code className="px-1 rounded bg-thead">supabase/fase1_familia_contas.sql</code> no SQL Editor do Supabase.
          </div>
        ) : !fam.familia ? (
          <>
            <div className="flex items-start gap-3 px-4 py-3.5">
              <span className="size-9 shrink-0 grid place-items-center rounded-xl bg-brand/10 text-brand"><Users size={18} /></span>
              <p className="text-sm text-muted leading-relaxed">
                Junte sua conta com a de outra pessoa (ex: cônjuge) para os dois verem e editarem os mesmos lançamentos, contas e
                parcelamentos. Cada um continua com o próprio login.
              </p>
            </div>
            <div className="px-4 py-3.5 flex flex-col sm:flex-row gap-2 sm:items-center">
              <p className="flex-1 text-[15px] font-medium">Criar uma família e convidar</p>
              <button className={BTN} disabled={busy} onClick={() => run(() => fam.criar("Família"), "Família criada — envie o código de convite", true)}>
                Criar família
              </button>
            </div>
            <form
              className="px-4 py-3.5 space-y-2"
              onSubmit={e => { e.preventDefault(); if (codigo.trim()) run(() => fam.entrar(codigo), "Você entrou na família", true); }}
            >
              <p className="text-[15px] font-medium">Entrar com código</p>
              <div className="flex gap-2">
                <input value={codigo} onChange={e => setCodigo(e.target.value.toUpperCase())} placeholder="Ex: 3F9A1C2B"
                  maxLength={8} autoCapitalize="characters" className={INPUT + " uppercase tracking-widest font-mono"} />
                <button type="submit" className={BTN} disabled={busy || codigo.trim().length < 8}>Entrar</button>
              </div>
            </form>
          </>
        ) : (
          <>
            <div className="px-4 py-3.5">
              <p className="text-xs text-muted mb-2">Membros</p>
              <ul className="space-y-2">
                {fam.membros.map(m => (
                  <li key={m.user_id} className="flex items-center gap-2.5">
                    <span className="size-8 grid place-items-center rounded-full bg-brand/10 text-brand text-sm font-semibold uppercase">
                      {m.nome.charAt(0) || "?"}
                    </span>
                    <span className="text-[15px] font-medium">{m.nome}</span>
                    {m.user_id === fam.userId && <span className="text-xs text-muted">(você)</span>}
                  </li>
                ))}
              </ul>
              {fam.membros.length === 1 && (
                <p className="text-xs text-muted mt-3">Só você por enquanto. Envie o código abaixo para a outra pessoa entrar.</p>
              )}
            </div>

            <form
              className="px-4 py-3.5 space-y-2"
              onSubmit={e => { e.preventDefault(); if (nome?.trim()) run(() => fam.renomear(nome), "Nome atualizado").then(() => setNome(null)); }}
            >
              <p className="text-[15px] font-medium">Seu nome na família</p>
              <div className="flex gap-2">
                <input value={nome ?? eu?.nome ?? ""} onChange={e => setNome(e.target.value)} maxLength={40} className={INPUT} />
                <button type="submit" className={BTN} disabled={busy || nome === null || !nome.trim()}>Salvar</button>
              </div>
            </form>

            <div className="px-4 py-3.5">
              <p className="text-[15px] font-medium">Código de convite</p>
              <div className="mt-2 flex items-center gap-2">
                <span className="flex-1 rounded-xl bg-thead px-3.5 py-2.5 font-mono text-lg font-semibold tracking-[.2em] text-heading">
                  {fam.familia.codigo_convite}
                </span>
                <button type="button" onClick={copiar} aria-label="Copiar ou compartilhar código"
                  className="size-11 grid place-items-center rounded-xl border border-border hover:bg-thead transition-colors">
                  {copiado ? <Check size={18} className="text-income" /> : <Copy size={18} />}
                </button>
                <button type="button" disabled={busy} onClick={() => run(fam.novoCodigo, "Novo código gerado")}
                  aria-label="Gerar novo código" title="Gerar novo código (o anterior para de funcionar)"
                  className="size-11 grid place-items-center rounded-xl border border-border hover:bg-thead transition-colors disabled:opacity-40">
                  <RefreshCw size={18} />
                </button>
              </div>
              <p className="text-xs text-muted mt-2">A outra pessoa cria a própria conta no app e, em Ajustes → Família, entra com este código.</p>
            </div>

            <button type="button" onClick={() => setConfirmSair(true)} disabled={busy}
              className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-rowhover transition-colors disabled:opacity-40">
              <span className="size-9 grid place-items-center rounded-xl bg-danger/10 text-danger"><LogOut size={18} /></span>
              <span className="text-[15px] font-medium text-danger">Sair da família</span>
            </button>
          </>
        )}
      </div>

      <ConfirmModal
        open={confirmSair}
        title="Sair da família?"
        message="Você deixa de ver os dados dos outros membros, e eles deixam de ver os seus. Nada é apagado: cada lançamento fica com quem o criou."
        onConfirm={() => { setConfirmSair(false); run(fam.sair, "Você saiu da família", true); }}
        onCancel={() => setConfirmSair(false)}
      />
    </section>
  );
}
