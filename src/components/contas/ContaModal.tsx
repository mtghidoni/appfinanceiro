"use client";

import { useEffect, useRef, useState } from "react";
import { Archive, Trash2 } from "lucide-react";
import Modal from "@/components/ui/Modal";
import { TIPOS_CONTA } from "@/lib/constants";
import { fmtInput } from "@/lib/utils";
import { parseValor } from "@/lib/importacao";
import type { ContaComSaldo, MembroFamilia, TipoConta } from "@/types";
import type { DadosConta } from "@/hooks/useContas";
import { BTN_PRIMARY, FIELD, Field, MoneyInput, Segmented } from "./form";

interface Props {
  open: boolean;
  initial: ContaComSaldo | null;
  membros: MembroFamilia[];
  userId: string | null;
  onSave: (dados: DadosConta, saldoAtual: number) => Promise<void>;
  onDelete?: () => void;
  onClose: () => void;
}

export default function ContaModal({ open, initial, membros, userId, onSave, onDelete, onClose }: Props) {
  const [nome, setNome] = useState("");
  const [instituicao, setInstituicao] = useState("");
  const [tipo, setTipo] = useState<TipoConta>("corrente");
  const [saldo, setSaldo] = useState("");
  const [dono, setDono] = useState<string>("");
  const [arquivada, setArquivada] = useState(false);
  const [saving, setSaving] = useState(false);
  const nomeRef = useRef<HTMLInputElement>(null);

  const cartao = tipo === "cartao";

  useEffect(() => {
    if (!open) return;
    setSaving(false);
    if (initial) {
      setNome(initial.nome);
      setInstituicao(initial.instituicao);
      setTipo(initial.tipo);
      // Cartão: mostra a fatura como valor positivo (o quanto se deve).
      const s = initial.tipo === "cartao" ? -initial.saldo : initial.saldo;
      setSaldo(s === 0 ? "" : (s < 0 ? "-" : "") + fmtInput(Math.abs(s)));
      setDono(initial.user_id);
      setArquivada(initial.arquivada);
    } else {
      setNome(""); setInstituicao(""); setTipo("corrente"); setSaldo("");
      setDono(userId ?? ""); setArquivada(false);
      setTimeout(() => nomeRef.current?.focus(), 60);
    }
  }, [open, initial, userId]);

  const canSave = nome.trim() !== "" && !!dono && !saving;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSave) return;
    setSaving(true);
    const v = parseValor(saldo) ?? 0;
    try {
      await onSave(
        { nome: nome.trim(), instituicao: instituicao.trim(), tipo, arquivada, user_id: dono },
        cartao ? -v : v,
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={initial ? "Editar conta" : "Nova conta"} width="480px">
      <form onSubmit={submit} className="space-y-5">
        <Field label="Tipo">
          <Segmented
            value={tipo}
            onChange={setTipo}
            label="Tipo de conta"
            options={TIPOS_CONTA.map(t => ({ v: t.v, label: t.label }))}
            cols="grid-cols-2 sm:grid-cols-3"
          />
        </Field>

        <Field label="Nome">
          <input ref={nomeRef} value={nome} onChange={e => setNome(e.target.value)}
            placeholder={cartao ? "Ex: Nubank Ultravioleta" : "Ex: Conta Itaú"} className={FIELD} />
        </Field>

        <Field label="Banco / instituição">
          <input value={instituicao} onChange={e => setInstituicao(e.target.value)} placeholder="Ex: Itaú" className={FIELD} />
        </Field>

        {membros.length > 1 && (
          <Field label="De quem é">
            <Segmented
              value={dono}
              onChange={setDono}
              label="Titular da conta"
              options={membros.map(m => ({ v: m.user_id, label: m.user_id === userId ? `${m.nome} (você)` : m.nome }))}
            />
          </Field>
        )}

        <div>
          <MoneyInput
            label={cartao ? "Fatura em aberto hoje" : "Saldo atual"}
            value={saldo}
            onChange={setSaldo}
            allowNegative
          />
          <p className="text-xs text-muted mt-1.5 leading-relaxed">
            {cartao
              ? "Quanto você deve no cartão agora. As compras lançadas aumentam a fatura e os pagamentos diminuem."
              : initial
                ? "Mude se o saldo não bater com o do banco: o app ajusta a diferença sem mexer nas transações."
                : "Quanto tem na conta hoje. Depois, cada transação lançada ou importada atualiza o saldo."}
          </p>
        </div>

        {initial && (
          <label className="flex items-center gap-3 rounded-xl bg-thead px-4 py-3 cursor-pointer">
            <Archive size={18} className="text-muted shrink-0" />
            <span className="flex-1 text-sm">
              <span className="block font-medium">Arquivar conta</span>
              <span className="block text-xs text-muted">Some da lista e do patrimônio, mas mantém o histórico.</span>
            </span>
            <input type="checkbox" checked={arquivada} onChange={e => setArquivada(e.target.checked)} className="size-5 accent-[oklch(var(--c-brand))]" />
          </label>
        )}

        <div className="flex items-center gap-2 pt-1">
          {onDelete && (
            <button type="button" onClick={onDelete}
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-2.5 text-sm font-semibold text-danger hover:bg-danger/10 transition-colors">
              <Trash2 size={16} />
              Excluir
            </button>
          )}
          <button type="submit" disabled={!canSave} className={`ml-auto flex-1 sm:flex-none ${BTN_PRIMARY}`}>
            {saving ? "Salvando…" : initial ? "Salvar" : "Adicionar"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
